import { AdminShell } from "../../../components/admin-shell";
import { AdminDateTime, AdminText } from "../../../components/admin-i18n";
import { AdminSection, ActionLink, FlashMessage, pageGridStyle, tableStyle, tableWrapStyle, thStyle, tdStyle, primaryButtonStyle } from "../../../components/admin-ui";
import { requireSuperAdminPage } from "../../../lib/admin-role-guards";
import { prisma } from "../../../lib/prisma";
import { listKitchenAbImports, missingAbTables } from "../../../lib/kitchen-ab-store.js";

export const dynamic = "force-dynamic";
const Text = ({ name, fallback }) => <AdminText i18nKey={`abImportsAdmin.${name}`} fallback={fallback} />;

export default async function AbImportsPage({ searchParams }) {
  const admin = await requireSuperAdminPage();
  const search = (await searchParams) || {};
  let data;
  try { data = await listKitchenAbImports(prisma); }
  catch (error) { if (!missingAbTables(error)) throw error; }
  return <AdminShell adminEmail={admin.email}><div style={pageGridStyle}>
    <AdminSection title={<Text name="title" fallback="AB imports" />}
      description={<Text name="schedule" fallback="Scheduled checks: 12:00 and 15:30 (Europe/Budapest)." />}
      actions={<ActionLink href="/admin/kitchens"><Text name="kitchens" fallback="Kitchens" /></ActionLink>}>
      {search.saved === "1" && <FlashMessage tone="success" message={<Text name="activated" fallback="The selected AB version is now active." />} />}
      {!data && <p><Text name="migrationRequired" fallback="The AB synchronization database migration must be installed before synchronization can start." /></p>}
      {data && !data.runs.length && <p><Text name="notConnected" fallback="No file-server synchronization has been received yet. The schedule starts working after the server task is installed." /></p>}
      {data?.runs.length > 0 && <div style={tableWrapStyle}><table style={tableStyle}>
        <thead><tr>{[["started", "Started"], ["source", "Source"], ["status", "Status"], ["result", "Result"]].map(([name, fallback]) => <th style={thStyle} scope="col" key={name}><Text name={name} fallback={fallback} /></th>)}</tr></thead>
        <tbody>{data.runs.map((run) => <tr key={run.id}>
          <td style={tdStyle}><AdminDateTime value={run.startedAt.toISOString()} /></td>
          <td style={tdStyle}>{run.source}</td>
          <td style={tdStyle}><Text name={`status${run.status === "RUNNING" && Date.now() - run.startedAt.getTime() > 3 * 3600000 ? "INTERRUPTED" : run.status}`} fallback={run.status} /></td>
          <td style={tdStyle}>{run.finishedAt && <>
            <Text name="uploaded" fallback="Imported" />: {run.summary.uploaded || 0} · <Text name="skipped" fallback="Unchanged" />: {run.summary.skipped || 0} · <Text name="errors" fallback="Errors" />: {run.summary.errors || 0} · <Text name="deferred" fallback="Still copying" />: {run.summary.deferred || 0}
          </>}
          {run.summary.issues?.length > 0 && <details><summary><Text name="issues" fallback="View import issues" /></summary><ul>{run.summary.issues.map((issue, index) => <li key={index}>{issue.source}: {issue.error}</li>)}</ul></details>}
          </td>
        </tr>)}</tbody>
      </table></div>}
    </AdminSection>
    {data && <AdminSection title={<Text name="documents" fallback="AB documents and versions" />}>
      <p><Text name="versionsHelp" fallback="A first valid AB is published automatically. Different versions wait for review; the current version stays available. ABs received before a kitchen is created are linked when that kitchen is added." /></p>
      <p><Text name="readOrderHelp" fallback="Most recently read first. Times are shown in Central European local time. Unchanged checks do not change the last-read time." /></p>
      <div style={tableWrapStyle}><table style={tableStyle}>
        <thead><tr>{[["ab", "AB"], ["file", "File"], ["lastRead", "Last read"], ["status", "Status"], ["actions", "Actions"]].map(([name, fallback]) => <th style={thStyle} scope="col" key={name}><Text name={name} fallback={fallback} /></th>)}</tr></thead>
        <tbody>{data.documents.map((doc) => <tr key={doc.id}>
          <td style={tdStyle}><strong>{doc.abNumber}</strong><br />{doc.documentDate}</td>
          <td style={tdStyle}>{doc.sourceFile}<br /><small>{doc.kitchenSlug}</small></td>
          <td style={tdStyle}>{doc.lastReadAt
            ? <time dateTime={doc.lastReadAt.toISOString()}><AdminDateTime value={doc.lastReadAt.toISOString()} timeZone="Europe/Budapest" /></time>
            : <Text name="readTimeUnknown" fallback="Not recorded" />}</td>
          <td style={tdStyle}><Text name={doc.active ? "active" : doc.status === "REVIEW" ? "review" : "archived"} fallback={doc.active ? "Active" : doc.status === "REVIEW" ? "Needs review" : "Previous version"} />
            {!doc.hasKitchen && <><br /><Text name="waitingKitchen" fallback="Waiting for kitchen" /></>}</td>
          <td style={tdStyle}>
            <a href={`/api/admin/kitchen-specifications/${doc.kitchenSlug}/pdf?documentId=${doc.id}`} target="_blank" rel="noopener noreferrer"><Text name="view" fallback="View PDF" /></a>
            {!doc.active && <form method="post" action="/api/admin/ab-imports/activate" style={{ marginTop: 10 }}>
              <input type="hidden" name="documentId" value={doc.id} />
              <button type="submit" style={primaryButtonStyle}><Text name="activate" fallback="Use this version" /></button>
            </form>}
          </td>
        </tr>)}</tbody>
      </table></div>
    </AdminSection>}
  </div></AdminShell>;
}
