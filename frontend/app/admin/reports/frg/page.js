import { AdminBusinessReportPage } from "../../../../components/admin-business-report-page";

export const dynamic = "force-dynamic";

export default async function FragmentoReportPage({ searchParams }) {
  return AdminBusinessReportPage({ scope: "FRG", searchParams });
}
