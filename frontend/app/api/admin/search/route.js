import { withAdminPermission } from "../../../../lib/auth";
import { NextResponse } from "next/server";
import { requireAdminApi } from "../../../../lib/auth";
import { getAdminEntitySearch } from "../../../../lib/admin-search";

async function handleGET(request) {
  await requireAdminApi();
  const { searchParams } = new URL(request.url);

  const payload = {
    q: searchParams.get("q") || "",
    selected: searchParams.getAll("selected"),
    period: searchParams.get("period") || "",
    kitchenId: searchParams.get("kitchenId") || "",
    status: searchParams.get("status") || "",
  };

  return NextResponse.json(await getAdminEntitySearch(payload));
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
