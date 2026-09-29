#!/usr/bin/env node

/**
 * Carga el catalogo de ejercicios del markdown a la tabla `exercises` de Supabase,
 * que es la que lee la app (src/lib/db.ts).
 *
 * Corrida unica. Lee catalogo-ejercicios.md, parsea los ejercicios, los mapea a
 * un `muscle_groups` (grupo + region), omite los que ya existen (comparacion
 * case-insensitive y sin espacios al borde) e inserta el resto.
 *
 * Estructura destino (supabase/migrations/20260924000000_init.sql):
 *   muscle_groups(id, name unique, region check in ('superior','inferior','core','full'))
 *   exercises(id, muscle_group_id -> muscle_groups.id, name, instructions,
 *             image_url, video_url, created_by, created_at)
 *
 * OJO: `exercises` NO tiene columna de region. La region se hereda de
 * `muscle_groups.region`, asi que es por grupo, no por ejercicio.
 *
 * Uso:
 *   node scripts/load-ejercicios.js --dry-run            # parsea y reporta, no toca la DB
 *   node scripts/load-ejercicios.js --sql <archivo.sql>  # genera el SQL y sale
 *   node scripts/load-ejercicios.js --apply               # inserta de verdad
 *   node scripts/load-ejercicios.js --file otro.md
 *
 * Credenciales (NUNCA la service_role en el cliente Expo):
 *   SUPABASE_URL               -> si no esta, toma EXPO_PUBLIC_SUPABASE_URL de .env
 *   SUPABASE_SERVICE_ROLE_KEY  -> service_role key, SOLO en este entorno de Node
 * Alternativa: dejarla en `.env.local` (esta en .gitignore).
 */

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_FILE = path.join(REPO_ROOT, "catalogo-ejercicios.md");
const MIGRATIONS_DIR = path.join(REPO_ROOT, "supabase", "migrations");

// ---------------------------------------------------------------------------
// Mapeo catálogo -> muscle_groups
// ---------------------------------------------------------------------------

// Encabezado del markdown -> fila de muscle_groups.
// Se reutilizan los grupos que ya crea el seed de init.sql; los que no existen
// se insertan (Piernas, Cuerpo completo) de forma idempotente.
const MUSCLE_GROUP = {
  pectorales: { grupo: "Pecho", region: "superior" },
  espalda: { grupo: "Espalda", region: "superior" },
  hombros: { grupo: "Hombros", region: "superior" },
  biceps: { grupo: "Bíceps", region: "superior" },
  triceps: { grupo: "Tríceps", region: "superior" },
  abdominales: { grupo: "Abdominales", region: "core" },
  piernas: { grupo: "Piernas", region: "inferior" },
  gemelos: { grupo: "Pantorrillas", region: "inferior" },
};

// Grupos que el seed de init.sql ya crea (init.sql:440-452).
const MUSCLE_GROUP_DEL_SEED = new Set([
  "Pecho",
  "Espalda",
  "Hombros",
  "Bíceps",
  "Tríceps",
  "Cuádriceps",
  "Femorales",
  "Glúteos",
  "Pantorrillas",
  "Abdominales",
  "Core",
]);

// `exercises` no tiene columna region, asi que los ejercicios de cuerpo completo
// necesitan su propio muscle_group con region 'full'.
const MUSCLE_GROUP_FULL_BODY = "Cuerpo completo";

// Excepciones dentro de Piernas: cuerpo completo / muy cardiovasculares.
const FULL_BODY_EN_PIERNAS = new Set([
  "Salto Rodillas al Pecho",
  "Burpees",
  "Sentadilla con salto",
  "Columpios con kettlebell",
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Normaliza para comparar nombres: minusculas y sin espacios en los bordes. */
function claveNombre(nombre) {
  return String(nombre).trim().toLowerCase();
}

/** Normaliza un encabezado de músculo: minuscula y sin tilde. */
function normalizarGrupo(encabezado) {
  return encabezado
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseArgs(argv) {
  const args = { file: DEFAULT_FILE, apply: false, sql: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") args.apply = false;
    else if (a === "--apply") args.apply = true;
    else if (a === "--file") args.file = path.resolve(REPO_ROOT, argv[++i]);
    else if (a === "--sql") args.sql = path.resolve(REPO_ROOT, argv[++i]);
    else throw new Error(`Argumento desconocido: ${a}`);
  }
  return args;
}

// ---------------------------------------------------------------------------
// Parseo del markdown
// ---------------------------------------------------------------------------

function parseCatalogo(md) {
  const lineas = md.split(/\r?\n/);
  const ejercicios = [];
  const revisar = [];
  const vistosEnArchivo = new Set();

  let grupoActual = null; // clave de MUSCLE_GROUP

  for (let i = 0; i < lineas.length; i++) {
    const linea = lineas[i];

    // Nuevo grupo muscular: "## <Músculo>"
    const mH2 = linea.match(/^##\s+(.+?)\s*$/);
    if (mH2) {
      const encabezado = mH2[1].replace(/\s*#+\s*$/, "").trim();
      const norm = normalizarGrupo(encabezado);
      grupoActual = MUSCLE_GROUP[norm] ? norm : null;
      if (!grupoActual) {
        revisar.push({
          tipo: "encabezado sin mapear",
          valor: encabezado,
          detalle: "No se reconoce como grupo conocido; se omite el grupo entero.",
        });
      }
      continue;
    }

    // Nombre del ejercicio: "**Algo**"
    const mNombre = linea.match(/^\*\*(.+?)\*\*\s*$/);
    if (!mNombre) continue;
    if (!grupoActual) continue; // ejercicio fuera de un grupo conocido

    const nombre = mNombre[1].trim();

    // Descripción: párrafo siguiente no vacío (puede ocupar varias líneas).
    const descripcion = [];
    let j = i + 1;
    for (; j < lineas.length; j++) {
      const l = lineas[j].trim();
      if (!l) {
        if (descripcion.length) break; // fin del párrafo
        continue;
      }
      if (/^\*\*.+\*\*$/.test(l) || /^#{1,6}\s/.test(l) || /^---+$/.test(l)) break;
      descripcion.push(l);
    }
    i = j - 1;

    const instrucciones = descripcion.join(" ").trim();

    // Duplicados dentro del propio archivo.
    const clave = claveNombre(nombre);
    if (vistosEnArchivo.has(clave)) {
      revisar.push({
        tipo: "nombre repetido en el archivo",
        valor: nombre,
        detalle: "Se conserva solo la primera aparición.",
      });
      continue;
    }
    vistosEnArchivo.add(clave);

    // Region y grupo destino.
    let { grupo, region } = MUSCLE_GROUP[grupoActual];
    if (grupoActual === "piernas" && FULL_BODY_EN_PIERNAS.has(nombre)) {
      grupo = MUSCLE_GROUP_FULL_BODY;
      region = "full";
    }

    if (!instrucciones) {
      revisar.push({
        tipo: "sin descripción",
        valor: nombre,
        detalle: "Se inserta igual, con instructions NULL.",
      });
    }

    ejercicios.push({
      nombre,
      grupo_muscular: grupoActual, // clave del catálogo, para el reporte
      muscle_group: grupo,
      region,
      imagen_url: null,
      video_url: null,
      instrucciones: instrucciones || null,
    });
  }

  return { ejercicios, revisar };
}

// ---------------------------------------------------------------------------
// Nombres de ejercicios que ya trae el seed de init.sql
// ---------------------------------------------------------------------------

/**
 * Extrae del seed los nombres ya cargados en `exercises`, para poder predecir
 * los choques sin necesidad de conexion.
 */
function leerEjerciciosDelSeed() {
  if (!fs.existsSync(MIGRATIONS_DIR)) return new Set();
  const nombres = new Set();
  const patron =
    /\(select id from public\.muscle_groups where name = '([^']+)'\),\s*'((?:[^']|'')*)'/g;
  for (const f of fs.readdirSync(MIGRATIONS_DIR)) {
    if (!f.endsWith(".sql")) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, f), "utf8");
    let m;
    while ((m = patron.exec(sql)) !== null) {
      nombres.add(claveNombre(m[2].replace(/''/g, "'")));
    }
  }
  return nombres;
}

// ---------------------------------------------------------------------------
// SQL
// ---------------------------------------------------------------------------

function literalSql(valor) {
  if (valor === null || valor === undefined) return "null";
  return "'" + String(valor).replace(/'/g, "''") + "'";
}

function generarSql(ejercicios) {
  // Grupos efectivamente usados por los ejercicios de este catálogo.
  const usados = new Map();
  for (const e of ejercicios) usados.set(e.muscle_group, e.region);
  const nuevos = [...usados.keys()].filter(
    (g) => !MUSCLE_GROUP_DEL_SEED.has(g)
  );
  const fullBody = ejercicios.filter(
    (e) => e.muscle_group === MUSCLE_GROUP_FULL_BODY
  );

  const partes = [];

  partes.push(
    `-- Carga del catalogo de ejercicios en public.exercises.
-- Generado por scripts/load-ejercicios.js --sql
--
-- Corre todo en una transaccion y es idempotente: se puede volver a correr.
-- Si algo no cuadra, ABORTA con rollback en vez de dejar la carga a medias.
--
-- Notas de esquema:
--   * exercises no tiene columna region: se hereda de muscle_groups.region.
--     Por eso las ${fullBody.length} excepciones de cuerpo completo van a su propio
--     grupo '${MUSCLE_GROUP_FULL_BODY}' con region 'full'.
--   * 'Pecho' = pectorales y 'Pantorrillas' = gemelos (grupos del seed).
--   * 'Piernas' es nuevo: el catalogo no separa cuadriceps/femorales/gluteos.
--   * exercises.name no tiene restriccion unique, asi que el dedup se hace con
--     not exists comparando lower(btrim(name)).
--   * No se toca ninguna fila existente: los nombres que ya existen se saltan.`
  );

  partes.push(
    `begin;\n\n` +
      `-- Catalogo del script, en memoria. Se descarta al hacer commit.\n` +
      `create temporary table _catalogo (\n` +
      `  grupo        text,\n` +
      `  nombre       text,\n` +
      `  instrucciones text\n` +
      `) on commit drop;\n\n` +
      `insert into _catalogo (grupo, nombre, instrucciones) values\n` +
      ejercicios
        .map(
          (e) =>
            `  (${literalSql(e.muscle_group)}, ${literalSql(e.nombre)}, ${literalSql(e.instrucciones)})`
        )
        .join(",\n") +
      `;`
  );

  partes.push(
    `-- Grupos musculares. Reutiliza los del seed y agrega los que faltan.\n` +
      (nuevos.length
        ? `-- Nuevos: ${nuevos.join(", ")}\n`
        : `-- (no hace falta crear ningun grupo nuevo)\n`) +
      `insert into public.muscle_groups (name, region) values\n` +
      [...usados.entries()]
        .map(([g, r]) => `  (${literalSql(g)}, ${literalSql(r)})`)
        .join(",\n") +
      `\non conflict (name) do nothing;`
  );

  partes.push(
    `-- Guarda contra Muscle Groups con otro nombre en la base: el join de abajo\n` +
      `-- los descartaria en silencio. Aca se aborta explicitamente.\n` +
      `do $$\n` +
      `declare\n` +
      `  faltan text[];\n` +
      `begin\n` +
      `  select array_agg(distinct c.grupo)\n` +
      `    into faltan\n` +
      `  from _catalogo c\n` +
      `  left join public.muscle_groups mg on mg.name = c.grupo\n` +
      `  where mg.id is null;\n` +
      `  if faltan is not null then\n` +
      `    raise exception\n` +
      `      'muscle_groups no encontrado(s): %. Revisar el nombre contra select name from public.muscle_groups;',\n` +
      `      faltan;\n` +
      `  end if;\n` +
      `end $$;`
  );

  partes.push(
    `-- Carga. imagen_url / video_url / created_by quedan en NULL a proposito.\n` +
      `insert into public.exercises\n` +
      `  (muscle_group_id, name, instructions, image_url, video_url, created_by)\n` +
      `select mg.id, c.nombre, c.instrucciones, null, null, null\n` +
      `from _catalogo c\n` +
      `join public.muscle_groups mg on mg.name = c.grupo\n` +
      `where not exists (\n` +
      `  select 1 from public.exercises e\n` +
      `  where lower(btrim(e.name)) = lower(btrim(c.nombre))\n` +
      `);`
  );

  partes.push(
    `-- Verificacion: los ${ejercicios.length} nombres del catalogo tienen que\n` +
      `-- estar en la tabla (los que ya existian, cuentan igual). Si falta alguno,\n` +
      `-- se aborta y no queda nada a medias.\n` +
      `do $$\n` +
      `declare\n` +
      `  faltan int;\n` +
      `begin\n` +
      `  select count(*) into faltan\n` +
      `  from _catalogo c\n` +
      `  where not exists (\n` +
      `    select 1 from public.exercises e\n` +
      `    where lower(btrim(e.name)) = lower(btrim(c.nombre))\n` +
      `  );\n` +
      `  if faltan > 0 then\n` +
      `    raise exception 'faltan % ejercicio(s) del catalogo por cargar', faltan;\n` +
      `  end if;\n` +
      `end $$;\n\n` +
      `commit;`
  );

  partes.push(
    `-- Resumen final (correr despues del commit).\n` +
      `select mg.region, mg.name as grupo, count(*) as ejercicios\n` +
      `from public.exercises e\n` +
      `join public.muscle_groups mg on mg.id = e.muscle_group_id\n` +
      `group by 1, 2\n` +
      `order by 1, 2;`
  );

  return partes.join("\n\n") + "\n";
}

// ---------------------------------------------------------------------------
// Credenciales
// ---------------------------------------------------------------------------

function leerEnvSimple(ruta) {
  // Parser minimo de .env: no agrega dependencias.
  if (!fs.existsSync(ruta)) return {};
  const out = {};
  for (const linea of fs.readFileSync(ruta, "utf8").split(/\r?\n/)) {
    const m = linea.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[m[1]] = v;
  }
  return out;
}

function obtenerCredenciales() {
  const dotEnv = leerEnvSimple(path.join(REPO_ROOT, ".env"));
  const dotEnvLocal = leerEnvSimple(path.join(REPO_ROOT, ".env.local"));
  const pick = (k) => process.env[k] || dotEnvLocal[k] || dotEnv[k];
  return {
    url: pick("SUPABASE_URL") || pick("EXPO_PUBLIC_SUPABASE_URL"),
    serviceKey: pick("SUPABASE_SERVICE_ROLE_KEY") || pick("SUPABASE_SERVICE_KEY"),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!fs.existsSync(args.file)) {
    console.error(`No existe el archivo: ${args.file}`);
    process.exit(1);
  }

  const md = fs.readFileSync(args.file, "utf8");
  const { ejercicios, revisar } = parseCatalogo(md);

  console.log("=".repeat(70));
  console.log(`Archivo: ${path.relative(REPO_ROOT, args.file)}`);
  console.log(`Ejercicios parseados: ${ejercicios.length}`);
  console.log("=".repeat(70));

  const porGrupo = new Map();
  for (const e of ejercicios) {
    porGrupo.set(e.muscle_group, (porGrupo.get(e.muscle_group) || 0) + 1);
  }
  console.log("\nmuscle_groups destino:");
  for (const [g, n] of porGrupo) {
    const nuevo = MUSCLE_GROUP_DEL_SEED.has(g) ? "" : "  ( NUEVO )";
    console.log(`  ${g.padEnd(20)} ${String(n).padStart(3)}${nuevo}`);
  }

  const porRegion = new Map();
  for (const e of ejercicios) {
    porRegion.set(e.region, (porRegion.get(e.region) || 0) + 1);
  }
  console.log("\nregion (heredada de muscle_groups):");
  for (const [r, n] of porRegion) console.log(`  ${r.padEnd(20)} ${n}`);

  // Choque con el seed de init.sql, sin necesidad de conexion.
  const delSeed = leerEjerciciosDelSeed();
  const chocan = ejercicios.filter((e) => delSeed.has(claveNombre(e.nombre)));
  console.log(
    `\nChoques con el seed de init.sql: ${chocan.length} ` +
      `(de ${delSeed.size} nombres del seed)`
  );
  if (chocan.length) {
    console.log("  (van a quedar afuera; el seed no se toca)");
    for (const e of chocan) {
      console.log(`    - ${e.nombre}  [${e.muscle_group}]`);
    }
  }

  const nuevosGrupos = [...new Set(ejercicios.map((e) => e.muscle_group))].filter(
    (g) => !MUSCLE_GROUP_DEL_SEED.has(g)
  );
  if (nuevosGrupos.length) {
    console.log("\nGrupos que el script crea (no estan en el seed):");
    for (const g of nuevosGrupos) console.log(`  - ${g}`);
  }

  if (revisar.length) {
    console.log("\n" + "!".repeat(70));
    console.log("PARA REVISAR A MANO:");
    for (const r of revisar) {
      console.log(`  [${r.tipo}] ${r.valor} — ${r.detalle}`);
    }
    console.log("!".repeat(70));
  }

  if (args.sql) {
    const sql = generarSql(ejercicios);
    fs.writeFileSync(args.sql, sql, "utf8");
    console.log(
      `\nSQL generado: ${path.relative(REPO_ROOT, args.sql)} ` +
        `(${ejercicios.length} ejercicios, idempotente)`
    );
    return;
  }

  if (!args.apply) {
    console.log(
      "\n--dry-run: no se conecto a la base. " +
        "Usar --sql <archivo> para generar SQL, o --apply para insertar."
    );
    return;
  }

  // ---- Conexion (service_role) ----
  const { url, serviceKey } = obtenerCredenciales();
  if (!url || !serviceKey) {
    console.error(
      "\nFaltan credenciales. Definí SUPABASE_SERVICE_ROLE_KEY (env o .env.local).\n" +
        "La anon key no sirve: exercises solo admite escritura de profe."
    );
    process.exit(1);
  }

  const { createClient } = require("@supabase/supabase-js");
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: gruposBase, error: errGrupos } = await supabase
    .from("muscle_groups")
    .select("id, name, region");
  if (errGrupos) {
    console.error(`\nNo se pudo leer muscle_groups: ${errGrupos.message}`);
    process.exit(1);
  }

  // Asegura los grupos del catálogo (idempotente por unique de name).
  const porNombre = new Map(gruposBase.map((g) => [g.name, g]));
  const faltantes = [...new Set(ejercicios.map((e) => e.muscle_group))]
    .filter((g) => !porNombre.has(g))
    .map((g) => ({ name: g, region: ejercicios.find((e) => e.muscle_group === g).region }));

  if (faltantes.length) {
    const { data: creados, error: errCrear } = await supabase
      .from("muscle_groups")
      .insert(faltantes)
      .select("id, name, region")
      .onConflict("name")
      .doNothing();
    if (errCrear) {
      console.error(`\nNo se pudieron crear los muscle_groups: ${errCrear.message}`);
      process.exit(1);
    }
    for (const g of creados || []) porNombre.set(g.name, g);
    console.log(`\nmuscle_groups creados: ${(creados || []).length}`);
  }

  // ---- Estado actual de exercises ----
  const { data: existentes, error: errLectura } = await supabase
    .from("exercises")
    .select("id, name");
  if (errLectura) {
    console.error(`\nNo se pudo leer exercises: ${errLectura.message}`);
    process.exit(1);
  }

  const yaEnBase = new Set(existentes.map((r) => claveNombre(r.name)));
  console.log(`\nFilas en exercises antes: ${existentes.length}`);

  const aInsertar = [];
  const omitidos = [];
  const sinGrupo = [];
  for (const e of ejercicios) {
    const mg = porNombre.get(e.muscle_group);
    if (!mg) {
      sinGrupo.push(e);
      continue;
    }
    if (yaEnBase.has(claveNombre(e.nombre))) omitidos.push(e);
    else {
      yaEnBase.add(claveNombre(e.nombre));
      aInsertar.push({
        muscle_group_id: mg.id,
        name: e.nombre,
        instructions: e.instrucciones,
        image_url: null,
        video_url: null,
      });
    }
  }

  console.log(`A insertar: ${aInsertar.length}`);
  console.log(`Omitidos por duplicados: ${omitidos.length}`);
  if (omitidos.length) {
    console.log("\nOmitidos (ya existian):");
    for (const e of omitidos) console.log(`  - ${e.nombre}`);
  }
  if (sinGrupo.length) {
    console.log(`\nSin muscle_group resuelto: ${sinGrupo.length}`);
    for (const e of sinGrupo) console.log(`  - ${e.nombre} (${e.muscle_group})`);
  }

  if (!aInsertar.length) {
    console.log("\nNo hay nada nuevo para insertar.");
    return;
  }

  // ---- Inserts por bloques ----
  const LOTE = 50;
  let insertados = 0;
  const fallidos = [];

  for (let i = 0; i < aInsertar.length; i += LOTE) {
    const lote = aInsertar.slice(i, i + LOTE);
    const { data, error } = await supabase
      .from("exercises")
      .insert(lote)
      .select("name");
    if (error) {
      console.error(`\nFallo el lote ${i / LOTE + 1}: ${error.message}`);
      fallidos.push(...lote.map((e) => e.name));
      break;
    }
    insertados += data.length;
    console.log(`  lote ${i / LOTE + 1}: ${data.length} insertados`);
  }

  // ---- Reporte final ----
  console.log("\n" + "=".repeat(70));
  console.log("RESUMEN");
  console.log("=".repeat(70));
  console.log(`Ejercicios antes:        ${existentes.length}`);
  console.log(`Insertados nuevos:       ${insertados}`);
  console.log(`Omitidos por duplicado:  ${omitidos.length}`);
  if (fallidos.length) {
    console.log(`Fallaron:                ${fallidos.length}`);
    for (const n of fallidos) console.log(`  - ${n}`);
  }
  console.log(`Total esperado ahora:    ${existentes.length + insertados}`);

  const { count } = await supabase
    .from("exercises")
    .select("*", { count: "exact", head: true });
  console.log(`Total real en la tabla:   ${count}`);
  console.log("=".repeat(70));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
