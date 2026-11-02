import { withAdminPermission } from "../../../../lib/auth";
import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { getTestOrdersForAdmin } from "../../../../lib/catalog";
import { deleteAllTestOrders } from "../../../../lib/orders";

async function handleGET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);
  const orders = await getTestOrdersForAdmin({
    kitchenId: searchParams.get("kitchenId") || "",
    status: searchParams.get("status") || "",
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
    q: searchParams.get("q") || "",
  });

  return NextResponse.json(orders);
}

async function handlePOST(request) {
  await requireAdminApi();

  try {
    const formData = await request.formData();
    const intent = String(formData.get("_intent") || "");

    if (intent !== "delete-all") {
      throw new Error("Unsupported PX order action.");
    }

    const deletedCount = await deleteAllTestOrders();
    return redirectWithFlash(
      request,
      "/admin/px-orders",
      "success",
      `Deleted ${deletedCount} PX order${deletedCount === 1 ? "" : "s"}.`,
    );
  } catch (error) {
    const message = mapAdminMutationError(error, "PX order");
    return redirectWithFlash(request, "/admin/px-orders", "error", message);
  }
}

export const GET = withAdminPermission("PX_FRG_VIEW", handleGET);
export const POST = withAdminPermission("PX_FRG_MANAGE", handlePOST);
