import { prisma } from "../lib/prisma";
import { attachWorkProcessing } from "../lib/work-processing";
import { summarizeWork } from "../lib/work-processing-rules";
import { isTestContractNumber } from "../lib/order-kind";
import { AdminText } from "./admin-i18n";
import { WorkSummary } from "./admin-work-processing";
import { ActionLink, actionRowStyle } from "./admin-ui";

export async function AdminWorkOverview() {
  const [orders, claims, problemBatches] = await Promise.all([
    prisma.order.findMany({ select: { id: true, createdAt: true, status: true, contractNumber: true } }),
    prisma.serviceClaim.findMany({ select: { id: true, createdAt: true, contractNumber: true } }),
    prisma.workReminderBatch.count({ where: { status: { in: ["FAILED", "UNKNOWN", "SENDING"] } } }),
  ]);
  const [trackedOrders, trackedClaims] = await Promise.all([
    attachWorkProcessing(prisma, orders.filter((item) => !isTestContractNumber(item.contractNumber)), "ORDER"),
    attachWorkProcessing(prisma, claims.filter((item) => !isTestContractNumber(item.contractNumber)), "CLAIM"),
  ]);
  return <section style={{ padding: 18, border: "1px solid var(--app-border)", borderRadius: 12, background: "var(--app-surface)", marginBottom: 18 }}>
    <strong><AdminText i18nKey="workProcessing.processing" fallback="Processing" /></strong>
    <WorkSummary counts={summarizeWork([...trackedOrders, ...trackedClaims])} />
    <div style={actionRowStyle}>
      <ActionLink href="/admin/orders?processing=OVERDUE"><AdminText i18nKey="workProcessing.overdueOrders" fallback="Overdue orders" /></ActionLink>
      <ActionLink href="/admin/claims?processing=OVERDUE"><AdminText i18nKey="workProcessing.overdueClaims" fallback="Overdue claims" /></ActionLink>
      <ActionLink href="/admin/work-reminders"><AdminText i18nKey="workProcessing.reminderHistory" fallback="Reminder history" />{problemBatches ? ` (${problemBatches})` : ""}</ActionLink>
    </div>
  </section>;
}
