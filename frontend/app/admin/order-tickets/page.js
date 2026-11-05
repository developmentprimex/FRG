import { redirect } from "next/navigation";
import { requireAdminPage } from "../../../lib/auth";

export const dynamic = "force-dynamic";

export default async function OrderTicketsPage({ searchParams = {}, pxOnly = false }) {
  await requireAdminPage(pxOnly ? "PX_FRG_VIEW" : "FRG_VIEW");
  const params = await searchParams;
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    for (const entry of Array.isArray(value) ? value : [value]) {
      if (entry != null) query.append(key, entry);
    }
  }
  redirect(`${pxOnly ? "/admin/px-orders" : "/admin/orders"}${query.size ? `?${query}` : ""}`);
}
