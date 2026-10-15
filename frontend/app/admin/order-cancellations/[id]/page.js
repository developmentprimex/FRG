import { notFound } from "next/navigation";
import { AdminSection, ActionLink, pageGridStyle } from "../../../../components/admin-ui";
import { AdminShell } from "../../../../components/admin-shell";
import { AdminText } from "../../../../components/admin-i18n";
import { CancellationRequestPanel } from "../../../../components/admin-order-cancellation-panel";
import { requireAdminPage } from "../../../../lib/auth";
import { listCancellationRequestsForAdmin } from "../../../../lib/order-cancellations";

export const dynamic = "force-dynamic";

export default async function WithdrawalDetailPage({ params, searchParams }) {
  const admin = await requireAdminPage();
  const { id } = await params;
  const query = (await searchParams) || {};
  const requests = await listCancellationRequestsForAdmin();
  const request = requests.find((item) => String(item.id) === id);
  if (!request) notFound();
  const returnPath = typeof query.returnTo === "string" && /^\/admin\/order-cancellations(?:\?[^#\r\n]*)?$/.test(query.returnTo) ? query.returnTo : "/admin/order-cancellations";

  return <AdminShell adminEmail={admin.email}>
    <div style={pageGridStyle}>
      <AdminSection title={request.referenceNumber} actions={<ActionLink href={returnPath}><AdminText i18nKey="orderCancellationsAdmin.backToWithdrawals" fallback="Back to cancellations" /></ActionLink>}>
        <CancellationRequestPanel requests={[request]} returnPath={returnPath} defaultOpen />
      </AdminSection>
    </div>
  </AdminShell>;
}
