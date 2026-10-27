import { NextResponse } from "next/server";
import { mapAdminMutationError, redirectWithFlash } from "../../../../lib/admin-forms";
import { requireAdminApi } from "../../../../lib/auth";
import { getTestOrdersForAdmin } from "../../../../lib/catalog";
import { deleteAllTestOrders } from "../../../../lib/orders";

export async function GET(request) {
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

export async function POST(request) {
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
