import { AdminShell } from "../../../components/admin-shell";
import { AdminSection, pageGridStyle, tableStyle, tableWrapStyle, thStyle, tdStyle } from "../../../components/admin-ui";
import { AdminDateTime, AdminText } from "../../../components/admin-i18n";
import { requireAdminPage } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { AdminPagination } from "../../../components/admin-pagination";
import { WorkReminderReview } from "../../../components/admin-work-reminder-review";

export const dynamic = "force-dynamic";

export default async function WorkReminderHistory({ searchParams }) {
  const admin = await requireAdminPage();
  const params = await searchParams || {};
  const page = Math.max(1, Math.floor(Number(params.page) || 1));
  const pageSize = 30;
  const [batches, total] = await Promise.all([
    prisma.workReminderBatch.findMany({ orderBy: { startedAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.workReminderBatch.count(),
  ]);
  return <AdminShell adminEmail={admin.email}><div style={pageGridStyle}><AdminSection title={<AdminText i18nKey="workProcessing.reminderHistory" fallback="Reminder history" />}>
    <p><AdminText i18nKey="workProcessing.deliveryExplanation" fallback="SENT means accepted by the mail server. UNKNOWN or interrupted SENDING attempts require delivery review before retrying, to prevent duplicate emails." /></p>
    <div style={tableWrapStyle}><table style={tableStyle}><thead><tr>
      {['Started', 'Status', 'Requests', 'Details'].map((label) => <th key={label} style={thStyle}><AdminText i18nKey={`workProcessing.${label.toLowerCase()}`} fallback={label} /></th>)}
    </tr></thead><tbody>{batches.map((batch) => <tr key={batch.id}>
      <td style={tdStyle}><AdminDateTime value={batch.startedAt} /></td>
      <td style={tdStyle}>{batch.status}{batch.sentAt ? <div><AdminDateTime value={batch.sentAt} /></div> : null}</td>
      <td style={tdStyle}>{batch.items.map((item) => <div key={`${item.workType}:${item.id}`}>{item.workType} · {item.reference}</div>)}</td>
      <td style={tdStyle}>{batch.error || batch.messageId || "—"}{batch.status === "UNKNOWN" || (batch.status === "SENDING" && Date.now() - batch.startedAt.getTime() > 120000) ? <WorkReminderReview batchId={batch.id} /> : null}</td>
    </tr>)}</tbody></table></div>
    {!batches.length ? <p><AdminText i18nKey="workProcessing.noReminders" fallback="No reminders sent yet." /></p> : null}
    <AdminPagination basePath="/admin/work-reminders" searchParams={params} page={page} pageSize={pageSize} totalItems={total} totalPages={Math.max(1, Math.ceil(total / pageSize))} />
  </AdminSection></div></AdminShell>;
}
