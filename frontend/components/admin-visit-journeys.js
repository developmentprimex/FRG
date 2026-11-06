import Link from "next/link";
import { AdminSection } from "./admin-ui";
import { AdminText, AdminDateTime } from "./admin-i18n";
import { loadJourneyReport } from "../lib/visit-journey-report";
import styles from "./admin-visit-journeys.module.css";
import AdminPaymentEventDetails from "./admin-payment-event-details";

const label = (key) => <AdminText i18nKey={`visitJourney.${key}`} fallback={key} />;
const stepLabel = (step) => step ? <AdminText i18nKey={`visitJourney.steps.${step}`} fallback={step} /> : "—";

export default async function AdminVisitJourneys({ flow = "FRG", filters, params = {} }) {
  const data = await loadJourneyReport(flow, filters, params);
  const path = flow === "FRG" ? "/admin/contract-access" : "/admin/claim-activity";
  function href(changes) {
    const query = new URLSearchParams();
    for (const key of ["dateFrom", "dateTo", "page", "journeyPage", "visit"]) if (params[key]) query.set(key, String(params[key]));
    for (const [key, value] of Object.entries(changes)) value ? query.set(key, String(value)) : query.delete(key);
    return `${path}?${query}#visit-journeys`;
  }
  return (
    <div id="visit-journeys">
      <AdminSection title={label("title")}>
        <p className={styles.note}>{label("description")}</p>
        <div className={styles.wrapper}>
          <table className={styles.table}>
            <thead><tr>{["visitor", "contract", "started", "lastScreen", "furthest", "lastActivity", "history"].map(key => <th key={key}>{label(key)}</th>)}</tr></thead>
            <tbody>
              {!data.sessions.length && <tr><td colSpan={7}>{label("empty")}</td></tr>}
              {data.sessions.map(session => <tr key={session.id}>
                <td><span title={session.visitorId}>{session.visitorId.slice(0, 8)}</span>{session.isTest && <small className={styles.note}> · Test</small>}</td>
                <td>{session.contractNumber || label("anonymous")}</td>
                <td><AdminDateTime value={session.createdAt.toISOString()} /></td>
                <td>{stepLabel(session.lastStep)}</td>
                <td>{stepLabel(session.furthestStep)}</td>
                <td><AdminDateTime value={session.lastSeenAt.toISOString()} /></td>
                <td><Link href={href({ visit: session.id })} scroll={false}>{label("view")}</Link></td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <nav className={styles.pagination}>
          <span>{data.total} {label("visits")} · {data.page} / {data.pages}</span>
          {data.page > 1 && <Link href={href({ journeyPage: data.page - 1, visit: null })} scroll={false}>{label("newer")}</Link>}
          {data.page < data.pages && <Link href={href({ journeyPage: data.page + 1, visit: null })} scroll={false}>{label("older")}</Link>}
        </nav>
        {data.selected && <div className={styles.history}>
          <strong>{label("history")} · {data.selected.contractNumber || data.selected.visitorId.slice(0, 8)}</strong>
          <Link href={href({ visit: null })} scroll={false}>{label("close")}</Link>
          <ol>{data.events.map(event => <li key={event.id}>
            <AdminDateTime value={event.occurredAt.toISOString()} /> · {stepLabel(event.step)}
            {event.contractNumber && <> · {event.contractNumber}</>}
            <AdminPaymentEventDetails details={event.details} />
          </li>)}</ol>
        </div>}
      </AdminSection>
    </div>
  );
}
