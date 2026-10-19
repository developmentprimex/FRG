import { prisma } from "./prisma";
import { readKitchenAb } from "./kitchen-ab-store.js";
import { buildOrderKitchenSpecifications, getKitchenSpecification } from "./order-kitchen-specifications.js";

export async function loadKitchenAbReference(kitchen) {
  const saved = await readKitchenAb(prisma, kitchen);
  return saved?.metadata || getKitchenSpecification(kitchen);
}

export async function loadOrderKitchenSpecifications(order) {
  return buildOrderKitchenSpecifications(order, await loadKitchenAbReference(order.kitchen));
}
