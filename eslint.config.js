// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    // scripts/ corre en Node (CommonJS), no en React Native.
    files: ["scripts/**/*.js"],
    languageOptions: {
      globals: {
        __dirname: "readonly",
        module: "writable",
        process: "readonly",
        require: "readonly",
      },
    },
  },
  {
    settings: {
      "import/resolver": "node",
    },
    rules: {
      "import/namespace": "off",
      "import/named": "off",
      "import/default": "off",
      "import/no-unresolved": "off",
      "import/no-cycle": "off",
      "import/no-named-as-default": "off",
      "import/no-named-as-default-member": "off",
      "import/no-deprecated": "off",
      "import/no-duplicates": "off",
      "import/no-self-import": "off",
      "import/no-useless-path-segments": "off",
      "import/export": "off",
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);
