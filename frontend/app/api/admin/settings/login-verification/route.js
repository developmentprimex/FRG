import { withAdminPermission } from "../../../../../lib/auth";
import { redirectWithFlash } from "../../../../../lib/admin-forms";
import { setAdminLoginVerificationEnabled } from "../../../../../lib/admin-settings";
import { requireAdminApi } from "../../../../../lib/auth";

const MESSAGES = {
  en: {
    updated: "Settings updated.",
    signIn: "Please sign in again.",
    failed: "Could not update settings.",
  },
  de: {
    updated: "Einstellungen gespeichert.",
    signIn: "Bitte melden Sie sich erneut an.",
    failed: "Einstellungen konnten nicht gespeichert werden.",
  },
};

function getMessage(request, key) {
  const language = request.cookies.get("adminLanguage")?.value === "de" ? "de" : "en";
  return MESSAGES[language][key] || MESSAGES.en[key];
}

async function handlePOST(request) {
  try {
    await requireAdminApi();
    const formData = await request.formData();
    const enabled = formData.has("adminLoginVerificationEnabled");

    await setAdminLoginVerificationEnabled(enabled);

    return redirectWithFlash(request, "/admin/settings", "success", getMessage(request, "updated"));
  } catch (error) {
    if (error?.status === 401) {
      return redirectWithFlash(request, "/admin/login", "error", getMessage(request, "signIn"));
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : getMessage(request, "failed");
    return redirectWithFlash(request, "/admin/settings", "error", message);
  }
}

export const POST = withAdminPermission("SUPERADMIN", handlePOST);
