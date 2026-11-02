import { withAdminPermission } from "../../../../../lib/auth";
import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { requireAdminApi } from "../../../../../lib/auth";
import { listKitchenContractsForAdmin, listPropertyOwnersForAdmin } from "../../../../../lib/catalog";
import { prisma } from "../../../../../lib/prisma";

function getSingleValue(value) {
  return Array.isArray(value) ? value[0] || "" : value || "";
}

function normalizeFilters(searchParams) {
  return {
    query: String(getSingleValue(searchParams.q)).trim(),
    location: String(getSingleValue(searchParams.location)).trim(),
  };
}

function ownerSearchIndex(owner) {
  const companyFields = [owner.name, owner.address, owner.email, owner.phone, owner.notes];
  const objectFields = (owner.propertyObjects || []).flatMap((object) => [
    object.projectName, object.projectCode, object.projectStatus, object.projectDescription,
    object.projectManagerName, object.name, object.contactPhone, object.country, object.city,
    object.postalCode, object.address1, object.address2,
  ]);
  return [...companyFields, ...objectFields].filter(Boolean).join(" ").toLowerCase();
}

function filterOwners(owners, filters) {
  const query = filters.query.toLowerCase();
  return owners.filter((owner) => {
    const matchesQuery = !query || ownerSearchIndex(owner).includes(query);
    const matchesLocation = !filters.location || (owner.propertyObjects || []).some(
      (object) => String(object.country || "").trim() === filters.location,
    );
    return matchesQuery && matchesLocation;
  });
}

function formatDate(value) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function formatMoney(value) {
  return Number(value || 0).toFixed(2);
}

function appendSheet(workbook, name, rows, widths) {
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = widths.map((width) => ({ wch: width }));
  sheet["!autofilter"] = {
    ref: XLSX.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: Math.max(rows.length - 1, 0), c: Math.max((rows[0]?.length || 1) - 1, 0) },
    }),
  };
  XLSX.utils.book_append_sheet(workbook, sheet, name);
}

async function handleGET(request) {
  await requireAdminApi();

  const filters = normalizeFilters(Object.fromEntries(request.nextUrl.searchParams.entries()));
  const owners = filterOwners(await listPropertyOwnersForAdmin(), filters);
  const ownersById = new Map(owners.map((owner) => [owner.id, owner]));
  const companyIds = new Set(owners.map((owner) => owner.id));
  const contracts = (await listKitchenContractsForAdmin()).filter(
    (contract) => companyIds.has(contract.housingCompanyId),
  );
  const contractIds = contracts.map((contract) => contract.id);
  const orders = contractIds.length ? await prisma.order.findMany({
    where: { kitchenContractId: { in: contractIds } },
    select: {
      id: true, orderNumber: true, kitchenContractId: true, status: true, paymentStatus: true,
      paymentMethod: true, totalPrice: true, firstName: true, lastName: true, email: true,
      phone: true, address1: true, address2: true, postalCode: true, city: true, country: true,
      preferredDeliveryDate: true, notes: true, createdAt: true, paidAt: true,
    },
    orderBy: [{ kitchenContractId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
  }) : [];
  const ordersByContract = new Map();
  orders.forEach((order) => {
    const current = ordersByContract.get(order.kitchenContractId) || [];
    current.push(order);
    ordersByContract.set(order.kitchenContractId, current);
  });

  const workbook = XLSX.utils.book_new();
  appendSheet(workbook, "Housing Companies", [
    ["Housing company", "Address", "Email", "Phone", "Notes", "Object count", "Contract count", "Created at", "Updated at"],
    ...owners.map((owner) => [owner.name || "", owner.address || "", owner.email || "", owner.phone || "", owner.notes || "", owner._count.propertyObjects, owner._count.contracts, formatDate(owner.createdAt), formatDate(owner.updatedAt)]),
  ], [32, 42, 30, 20, 42, 14, 15, 24, 24]);

  appendSheet(workbook, "Projects and Objects", [
    ["Housing company", "Company address", "Company email", "Company phone", "Project", "Project code", "Project status", "Project manager", "Project description", "Object / building", "Object contact phone", "Address line 1", "Address line 2", "Postal code", "City", "Country", "Contract count", "Created at", "Updated at"],
    ...owners.flatMap((owner) => (owner.propertyObjects || []).map((object) => [
      owner.name || "", owner.address || "", owner.email || "", owner.phone || "", object.projectName || "", object.projectCode || "", object.projectStatus || "", object.projectManagerName || "", object.projectDescription || "", object.name || "", object.contactPhone || "", object.address1 || "", object.address2 || "", object.postalCode || "", object.city || "", object.country || "", object._count.contracts, formatDate(object.createdAt), formatDate(object.updatedAt),
    ])),
  ], [30, 36, 28, 18, 26, 18, 16, 24, 36, 28, 20, 28, 28, 14, 18, 18, 15, 24, 24]);

  const rows = contracts.flatMap((contract) => (ordersByContract.get(contract.id) || [null]).map((order) => [
    contract.housingCompany?.name || "", ownersById.get(contract.housingCompanyId)?.address || "", contract.housingCompany?.email || "", contract.housingCompany?.phone || "",
    contract.project?.name || contract.projectName || "", contract.project?.projectCode || "", contract.project?.status || "", contract.project?.managerName || "",
    contract.propertyObject?.name || "", contract.address1 || "", contract.address2 || "", contract.postalCode || "", contract.city || "", contract.country || "",
    contract.contractNumber || "", contract.isActive ? "Yes" : "No", contract.kitchen?.name || "", contract.kitchen?.slug || "", contract.building || "", contract.floor || "", contract.unitNumber || "", contract.notes || "", formatDate(contract.createdAt), formatDate(contract.usedAt),
    order?.orderNumber || "", order ? [order.firstName, order.lastName].filter(Boolean).join(" ") : "", order?.email || "", order?.phone || "", order?.status || "", order?.paymentStatus || "", order?.paymentMethod || "", order ? formatMoney(order.totalPrice) : "", order?.address1 || "", order?.address2 || "", order?.postalCode || "", order?.city || "", order?.country || "", formatDate(order?.preferredDeliveryDate), order?.notes || "", formatDate(order?.createdAt), formatDate(order?.paidAt),
  ]));
  appendSheet(workbook, "Contracts and Orders", [
    ["Housing company", "Company address", "Company email", "Company phone", "Project", "Project code", "Project status", "Project manager", "Object / building", "Object address 1", "Object address 2", "Object postal code", "Object city", "Object country", "Contract number", "Contract active", "Kitchen", "Kitchen code", "Building", "Floor", "Unit number", "Contract notes", "Contract created at", "Contract used at", "Order number", "Customer", "Order email", "Order phone", "Order status", "Payment status", "Payment method", "Order total", "Delivery address 1", "Delivery address 2", "Delivery postal code", "Delivery city", "Delivery country", "Preferred delivery date", "Order notes", "Order created at", "Paid at"],
    ...rows,
  ], [28, 34, 28, 18, 24, 16, 16, 22, 26, 28, 28, 16, 18, 18, 20, 16, 24, 22, 16, 12, 14, 30, 24, 24, 20, 24, 28, 18, 16, 16, 18, 14, 28, 28, 16, 18, 18, 24, 32, 24, 24]);

  const stamp = new Date().toISOString().slice(0, 10);
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="fragmento-housing-companies-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}

export const GET = withAdminPermission("FRG_VIEW", handleGET);
