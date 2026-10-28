import { AdminAscComparisonReport } from "./admin-asc-kitchen-report";
import { AdminText } from "./admin-i18n";

export function AdminAscClaimReport({ report }) {
  return <AdminAscComparisonReport report={report} rows={report.metrics}
    title={<AdminText i18nKey="ascKitchenReport.activity" fallback="Claims and emails" />}
    label={<AdminText i18nKey="ascKitchenReport.description" fallback="Description" />} />;
}
