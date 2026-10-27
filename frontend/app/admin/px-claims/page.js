import AdminClaimsPage from "../claims/page";

export const dynamic = "force-dynamic";

export default function AdminPxClaimsPage({ searchParams = {} }) {
  return <AdminClaimsPage searchParams={searchParams} pxOnly />;
}
