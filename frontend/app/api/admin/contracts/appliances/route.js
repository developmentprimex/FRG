import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { canViewTestContracts } from "../../../../../lib/admin-permissions";
import { isTestContractNumber } from "../../../../../lib/order-kind";
import { loadContractApplianceInventory } from "../../../../../lib/contract-appliance-inventory";

async function handleGET(request) {
  const admin = await requireAdminApi();
  const params = new URL(request.url).searchParams;
  const contractId = params.get("contractId");
  const stored = contractId ? await prisma.kitchenContract.findUnique({
    where: { id: contractId }, include: { appliances: true },
  }) : null;
  if (contractId && !stored) return NextResponse.json({ error: "Contract not found." }, { status: 404 });
  if (stored && !canViewTestContracts(admin) && isTestContractNumber(stored.contractNumber)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const kitchenId = params.get("kitchenId") || "";
  if (kitchenId && !await prisma.kitchen.findUnique({ where: { id: kitchenId }, select: { id: true } })) {
    return NextResponse.json({ error: "Kitchen not found." }, { status: 404 });
  }
  const sameKitchen = stored?.kitchenId === kitchenId;
  const contract = {
    ...(sameKitchen ? stored : {}), kitchenId,
    contractType: stored?.contractType || (params.get("contractType") === "ARC" ? "ARC" : "FRG"),
  };
  return NextResponse.json(await loadContractApplianceInventory(contract), { headers: { "Cache-Control": "no-store" } });
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
