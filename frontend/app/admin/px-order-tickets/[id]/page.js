import OrderTicketDetailPage from "../../order-tickets/[id]/page";
export const dynamic = "force-dynamic";
export default function PxOrderTicketDetailPage(props) {
  return <OrderTicketDetailPage {...props} pxOnly />;
}
