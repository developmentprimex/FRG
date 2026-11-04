import { requireAdminPage } from "../../../lib/auth";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import Link from "next/link";

export default async function AccessDeniedPage() {
  const admin = await requireAdminPage();
  // Denial is terminal: never redirect automatically back to a guarded page.
  return <AdminShell adminEmail={admin.email}><p role="alert"><AdminText i18nKey="permissions.denied" fallback="You do not have access to this workspace. Ask a superadmin to assign permissions." /></p><Link href="/admin"><AdminText i18nKey="adminShellLogin.dashboard" fallback="Dashboard" /></Link></AdminShell>;
}
