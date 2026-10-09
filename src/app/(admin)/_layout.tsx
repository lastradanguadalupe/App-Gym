import { Redirect } from 'expo-router';

import { AdminShell } from '@/components/admin/admin-shell';
import { useSession } from '@/context/session';

export default function AdminLayout() {
  const { profile } = useSession();

  // Guarda de rol: aunque alguien entre por deep link a /panel, /alumno, etc.
  if (profile?.role !== 'profe') {
    return <Redirect href="/" />;
  }

  return <AdminShell />;
}
