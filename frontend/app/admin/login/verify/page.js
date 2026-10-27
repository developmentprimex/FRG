import { redirect } from "next/navigation";
import AdminLoginVerifyPanel from "../../../../components/admin-login-verify-panel";
import { maskAdminEmail } from "../../../../lib/admin-login-verification";
import { getAdminSession, getPendingAdminLogin } from "../../../../lib/auth";
import { getFormMessage } from "../../../../lib/admin-forms";

export const metadata = {
  title: "Admin verification",
};

export default async function AdminLoginVerifyPage({ searchParams }) {
  let admin = null;
  let pendingAdmin = null;
  let configError = "";

  try {
    admin = await getAdminSession();
    pendingAdmin = await getPendingAdminLogin();
  } catch (error) {
    configError =
      error instanceof Error
        ? error.message
        : "Admin login is not available because the server is misconfigured.";
  }

  if (admin) {
    redirect("/admin");
  }

  if (!pendingAdmin?.loginVerificationCodeHash) {
    redirect("/admin/login");
  }

  if (
    pendingAdmin.loginVerificationExpiresAt
    && pendingAdmin.loginVerificationExpiresAt.getTime() < Date.now()
  ) {
    redirect("/admin/login?error=This%20verification%20code%20has%20expired.%20Please%20sign%20in%20again.");
  }

  const resolvedSearchParams = (await searchParams) || {};
  const errorMessage = configError || getFormMessage(resolvedSearchParams, "error");

  return (
    <AdminLoginVerifyPanel
      errorMessage={errorMessage}
      maskedEmail={maskAdminEmail(pendingAdmin.email)}
    />
  );
}
