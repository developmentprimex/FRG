import AdminClaimsPage from "../claims/page";
import { requirePxAdminPage } from "../../../lib/admin-role-guards";

export const dynamic = "force-dynamic";

export default async function AdminPxClaimsPage({ searchParams = {} }) {
  await requirePxAdminPage();
  return <AdminClaimsPage searchParams={searchParams} pxOnly />;
}
