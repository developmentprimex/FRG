import AdminOrdersPage from "../orders/page";

export const dynamic = "force-dynamic";

export default function AdminPxOrdersPage({ searchParams = {} }) {
  return <AdminOrdersPage searchParams={searchParams} pxOnly />;
}
