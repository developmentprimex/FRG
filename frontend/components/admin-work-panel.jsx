import { prisma } from "../lib/prisma";
import { AdminDateTime, AdminText } from "./admin-i18n";
import { WorkActions, WorkBadge } from "./admin-work-processing";
import { workUiItem } from "../lib/work-processing-rules";

export async function AdminWorkPanel({ item, compact = false }) {
  const events = (await prisma.workProcessingEvent.findMany({ where: { workType: item.workType, workId: item.id }, orderBy: { createdAt: "desc" }, take: 30 })).filter((event) => event.fromStatus !== event.toStatus);
  return <section style={{ border: "1px solid var(--app-border)", borderRadius: 8, padding: compact ? "10px 12px" : 16, marginBlock: compact ? 0 : 16 }}>
    <div style={compact ? { display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 } : {}}>
      <div style={compact ? { display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" } : undefined}>
        <strong><AdminText i18nKey="workProcessing.status" fallback="Status" /></strong>
        <WorkBadge item={workUiItem(item)} inline={compact} />
      </div>
      <div style={compact ? { width: 112, maxWidth: "100%" } : {}}><WorkActions item={workUiItem(item)} compact={compact} /></div>
    </div>
    {item.processing?.lastReminderAt ? <p><AdminText i18nKey="workProcessing.lastReminder" fallback="Last reminder" />: <AdminDateTime value={item.processing.lastReminderAt} /></p> : null}
    {events.length ? <details style={{ marginTop: 12 }}><summary><AdminText i18nKey="workProcessing.history" fallback="Processing history" /></summary>
      <ul>{events.map((event) => <li key={event.id} style={{ marginBlock: 8 }}><AdminDateTime value={event.createdAt} /> · {event.actor} · <AdminText i18nKey={`workProcessing.${event.fromStatus}`} fallback={event.fromStatus} /> → <AdminText i18nKey={`workProcessing.${event.toStatus}`} fallback={event.toStatus} /></li>)}</ul>
    </details> : null}
  </section>;
}
