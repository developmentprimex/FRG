import { withAdminPermission } from "../../../../lib/auth";
import { redirectWithFlash } from "../../../../lib/admin-forms";
import { parseAdminRole } from "../../../../lib/admin-roles";
import { requireSuperAdminApi } from "../../../../lib/admin-role-guards";
import { parsePermissions } from "../../../../lib/admin-permissions";
import { hashPassword } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";

function requiredTrimmed(value, label) {
  const nextValue = String(value || "").trim();
  if (!nextValue) {
    throw new Error(`${label} is required.`);
  }
  return nextValue;
}

async function handlePOST(request) {
  try {
    await requireSuperAdminApi();
    const formData = await request.formData();
    const email = requiredTrimmed(formData.get("email"), "Email").toLowerCase();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(formData.get("confirmPassword") || "");
    const role = parseAdminRole(formData.get("role"));

    if (!role) {
      return redirectWithFlash(request, "/admin/users", "error", "Role is invalid.");
    }

    if (password.length < 8) {
      return redirectWithFlash(request, "/admin/users", "error", "Password must be at least 8 characters.");
    }

    if (password !== confirmPassword) {
      return redirectWithFlash(request, "/admin/users", "error", "Password and confirmation do not match.");
    }

    const permissions = parsePermissions(formData.getAll("permissions"));
    await prisma.$transaction(async tx => {
    const user = await tx.adminUser.create({
      data: {
        email,
        passwordHash: await hashPassword(password),
        role,
      },
    });

    await tx.appSetting.create({ data: { key: `admin.permissions.${user.id}`, value: JSON.stringify(permissions) } });
    });
    return redirectWithFlash(request, "/admin/users", "success", "User created.");
  } catch (error) {
    if (error?.status === 401) {
      return redirectWithFlash(request, "/admin/login", "error", "Please sign in again.");
    }
    if (error?.status === 403) {
      return redirectWithFlash(request, "/admin", "error", "You do not have permission to manage users.");
    }
    if (error?.code === "P2002") {
      return redirectWithFlash(request, "/admin/users", "error", "That email is already in use.");
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not create the user.";
    return redirectWithFlash(request, "/admin/users", "error", message);
  }
}

export const POST = withAdminPermission("SUPERADMIN", handlePOST);
