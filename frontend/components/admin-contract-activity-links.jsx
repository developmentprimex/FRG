import { hasPermission } from "../lib/admin-permissions";
import { prisma } from "../lib/prisma";
import { ActionLink } from "./admin-ui";
import { AdminText } from "./admin-i18n";

// Claims reference a contract, so never label these as belonging to a specific order.
export async function AdminContractActivityLinks({ admin, contractNumber, target }) {
  if (!contractNumber || !hasPermission(admin, "FRG_VIEW") || !hasPermission(admin, "ASC_VIEW")) return null;
  if (target === "claims") {
    const claims = await prisma.serviceClaim.findMany({ where: { contractNumber }, select: { id: true, claimSequence: true }, orderBy: { createdAt: "desc" } });
    return claims.map(claim => <ActionLink key={claim.id} href={`/admin/claims/${encodeURIComponent(claim.id)}`}><AdminText i18nKey="permissions.relatedClaim" fallback="Claim for this contract" /> #{claim.claimSequence}</ActionLink>);
  }
  const orders = await prisma.order.findMany({ where: { kitchenContract: { contractNumber } }, select: { id: true, orderNumber: true }, orderBy: { createdAt: "desc" } });
  return orders.map(order => <ActionLink key={order.id} href={`/admin/orders/${encodeURIComponent(order.id)}`}><AdminText i18nKey="permissions.relatedOrder" fallback="Order for this contract" /> {order.orderNumber}</ActionLink>);
}
