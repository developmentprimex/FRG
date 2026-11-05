import OrderTicketsPage from "../order-tickets/page";
export const dynamic = "force-dynamic";
export default function PxOrderTicketsPage(props) {
  return <OrderTicketsPage {...props} pxOnly />;
}
