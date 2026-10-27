import { cookies } from "next/headers";
import { showAdminClaimsInNav } from "../lib/admin-claims-access";
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
  const openCancellationCount = await countOpenCancellationRequests().catch(() => 0);

  return (
    <AdminShellClient
      adminEmail={adminEmail || session?.email || ""}
      adminRole={session?.role || "ADMIN"}
      initialLanguage={initialLanguage}
      showClaimsNav={showAdminClaimsInNav(adminEmail || session?.email)}
      showUsersNav={isSuperAdmin(session)}
      openCancellationCount={openCancellationCount}
    >
      {children}
    </AdminShellClient>
  );
}
