import { NextResponse } from "next/server";
import { CONTRACT_ERRORS, getContractOrderState, getKitchenContractForAccess } from "../../../lib/kitchen-contracts";
import { getOrderKindForContractNumber, ORDER_KIND_TEST } from "../../../lib/order-kind";
import { prisma } from "../../../lib/prisma";
import {
  PUBLIC_VISIT_EVENT_TYPES,
  safelyTrackPublicVisitEvent,
} from "../../../lib/public-visit-tracking";
import {
  assertContractAllowsRepurchase,
  REPURCHASE_UNAVAILABLE_CODE,
  REPURCHASE_UNAVAILABLE_MESSAGE,
} from "../../../lib/contract-repurchase-restrictions";

export async function POST(request) {
  let submittedContractNumber = "";
  let trackingContext = {};

  try {
    const body = await request.json();
    submittedContractNumber = body?.contractNumber || "";
    trackingContext = {
      source: body?.source,
      utmMedium: body?.utmMedium,
      utmCampaign: body?.utmCampaign,
      referrerHost: body?.referrerHost,
    };
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_SUBMITTED,
      contractNumber: submittedContractNumber,
      path: "/api/kitchen-access",
      ...trackingContext,
    });

    assertContractAllowsRepurchase(submittedContractNumber);
    const contract = await getKitchenContractForAccess(submittedContractNumber);
    const orderKind = getOrderKindForContractNumber(contract.contractNumber);
    const contractOrderState = await getContractOrderState(contract.id, prisma, orderKind);
    await safelyTrackPublicVisitEvent({
      request,
      eventType: orderKind === ORDER_KIND_TEST
        ? PUBLIC_VISIT_EVENT_TYPES.CONTRACT_TEST_ACCEPTED
        : PUBLIC_VISIT_EVENT_TYPES.CONTRACT_ACCEPTED,
      contractNumber: contract.contractNumber,
      kitchenContractId: contract.id,
      path: "/api/kitchen-access",
      metadata: { orderKind },
      ...trackingContext,
    });

    return NextResponse.json({
      ok: true,
      kitchenSlug: contract.kitchen.slug,
      contractNumber: contract.contractNumber,
      hasExistingOrder: Boolean(contractOrderState.editableOrder),
      existingOrderId: contractOrderState.editableOrder?.id || null,
      hasConfirmedBaseline: contractOrderState.confirmedItems.length > 0,
    });
  } catch (error) {
    await safelyTrackPublicVisitEvent({
      request,
      eventType: PUBLIC_VISIT_EVENT_TYPES.CONTRACT_REJECTED,
      contractNumber: submittedContractNumber,
      path: "/api/kitchen-access",
      metadata: { status: error.status || 400 },
      ...trackingContext,
    });

    const kitchenUnavailable = error.message === CONTRACT_ERRORS.NOT_FOUND
      || error.message === CONTRACT_ERRORS.KITCHEN_UNAVAILABLE;
    const code = kitchenUnavailable ? REPURCHASE_UNAVAILABLE_CODE : error.code;

    return NextResponse.json(
      {
        ok: false,
        error: kitchenUnavailable ? REPURCHASE_UNAVAILABLE_MESSAGE : error.message || "Contract access failed.",
        ...(code ? { code } : {}),
      },
      { status: error.status || 400 },
    );
  }
}
