import { requireAdminPage } from "../../../lib/auth";
import { AdminShell } from "../../../components/admin-shell";
import { AdminText } from "../../../components/admin-i18n";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveWorkspace } from "../../../lib/admin-permissions";

export default async function AccessDeniedPage() {
  const admin = await requireAdminPage();
  const workspace = resolveWorkspace(admin, (await cookies()).get("adminWorkspace")?.value);
  if (workspace) redirect(`/admin/reports/${workspace.toLowerCase()}`);
  return <AdminShell adminEmail={admin.email}><p role="alert"><AdminText i18nKey="permissions.denied" fallback="You do not have access to this workspace. Ask a superadmin to assign permissions." /></p></AdminShell>;
}
