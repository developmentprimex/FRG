import { AdminBusinessReportPage } from "../../../../components/admin-business-report-page";

export const dynamic = "force-dynamic";

export default async function AscReportPage({ searchParams }) {
  return AdminBusinessReportPage({ scope: "ASC", searchParams });
}
