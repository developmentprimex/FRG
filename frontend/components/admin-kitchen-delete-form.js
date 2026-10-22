import AdminConfirmSubmitButton from "./admin-confirm-submit-button";
import { AdminText } from "./admin-i18n";
import { dangerButtonStyle } from "./admin-ui";

export default function AdminKitchenDeleteForm({ kitchen }) {
  return (
    <form action={`/api/admin/kitchens/${kitchen.id}`} method="post">
      <input type="hidden" name="intent" value="delete" />
      <AdminConfirmSubmitButton
        confirmKey="kitchensAdmin.deleteConfirm"
        confirmFallback="Delete kitchen {name} and its items permanently? Kitchens with linked orders or contracts cannot be deleted."
        confirmValues={{ name: kitchen.name }}
        style={dangerButtonStyle}
      >
        <AdminText i18nKey="kitchensAdmin.delete" fallback="Delete" />
      </AdminConfirmSubmitButton>
    </form>
  );
}
