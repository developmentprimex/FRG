import { hasPermission, resolveWorkspace } from "../lib/admin-permissions";
import { cookies } from "next/headers";
import { isSuperAdmin } from "../lib/admin-roles";
import { getAdminSession } from "../lib/auth";
import { countOpenCancellationRequests } from "../lib/order-cancellations";
import { AdminShellClient } from "./admin-shell-client";

function normalizeLanguage(value) {
  return value === "de" ? "de" : "en";
}

export async function AdminShell({ adminEmail, children }) {
  const cookieStore = await cookies();
  const initialLanguage = normalizeLanguage(cookieStore.get("adminLanguage")?.value);
  const session = await getAdminSession();
  const openCancellationCount = hasPermission(session, "FRG_VIEW") ? await countOpenCancellationRequests().catch(() => 0) : 0;
  const access = { role: session?.role, permissions: session?.permissions || [] };
  const workspace = resolveWorkspace(session, cookieStore.get("adminWorkspace")?.value);

  return (
    <AdminShellClient
      adminEmail={adminEmail || session?.email || ""}
      adminRole={session?.role || "ADMIN"}
      access={access}
      initialWorkspace={workspace}
      initialLanguage={initialLanguage}
      showClaimsNav={hasPermission(session, "ASC_VIEW")}
      showUsersNav={isSuperAdmin(session)}
      openCancellationCount={openCancellationCount}
    >
      {children}
    </AdminShellClient>
  );
}
