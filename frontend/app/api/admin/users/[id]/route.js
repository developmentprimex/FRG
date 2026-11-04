import { withAdminPermission } from "../../../../../lib/auth";
import { redirectWithFlash } from "../../../../../lib/admin-forms";
import { parseAdminRole } from "../../../../../lib/admin-roles";
import { requireSuperAdminApi } from "../../../../../lib/admin-role-guards";
import { parsePermissions } from "../../../../../lib/admin-permissions";
import { prisma } from "../../../../../lib/prisma";

async function countActiveSuperadminsInDb(excludeId = null) {
  return prisma.adminUser.count({
    where: {
      role: "SUPERADMIN",
      isActive: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
  });
}

async function handlePOST(request, { params }) {
  const returnPath = "/admin/users";

  try {
    const currentAdmin = await requireSuperAdminApi();
    const { id } = await params;
    const formData = await request.formData();
    const intent = String(formData.get("intent") || "update").trim();

    const targetUser = await prisma.adminUser.findUnique({ where: { id } });
    if (!targetUser) {
      return redirectWithFlash(request, returnPath, "error", "User was not found.");
    }

    if (intent === "permissions") {
      const permissions = parsePermissions(formData.getAll("permissions"));
      await prisma.appSetting.upsert({ where: { key: `admin.permissions.${id}` }, create: { key: `admin.permissions.${id}`, value: JSON.stringify(permissions) }, update: { value: JSON.stringify(permissions) } });
      return redirectWithFlash(request, returnPath, "success", "Permissions updated.");
    }

    if (intent === "delete") {
      if (targetUser.id === currentAdmin.id) {
        return redirectWithFlash(request, returnPath, "error", "You cannot delete your own account.");
      }

      if (targetUser.role === "SUPERADMIN" && targetUser.isActive) {
        const remainingSuperadmins = await countActiveSuperadminsInDb(targetUser.id);
        if (remainingSuperadmins === 0) {
          return redirectWithFlash(request, returnPath, "error", "At least one active superadmin is required.");
        }
      }

      await prisma.adminUser.delete({ where: { id } });
      return redirectWithFlash(request, returnPath, "success", "User deleted.");
    }

    if (intent === "deactivate") {
      if (targetUser.id === currentAdmin.id) {
        return redirectWithFlash(request, returnPath, "error", "You cannot deactivate your own account.");
      }

      if (targetUser.role === "SUPERADMIN" && targetUser.isActive) {
        const remainingSuperadmins = await countActiveSuperadminsInDb(targetUser.id);
        if (remainingSuperadmins === 0) {
          return redirectWithFlash(request, returnPath, "error", "At least one active superadmin is required.");
        }
      }

      await prisma.adminUser.update({
        where: { id },
        data: { isActive: false },
      });
      return redirectWithFlash(request, returnPath, "success", "User deactivated.");
    }

    if (intent === "reactivate") {
      await prisma.adminUser.update({
        where: { id },
        data: { isActive: true },
      });
      return redirectWithFlash(request, returnPath, "success", "User reactivated.");
    }

    const role = parseAdminRole(formData.get("role"));
    if (!role) {
      return redirectWithFlash(request, returnPath, "error", "Role is invalid.");
    }

    if (targetUser.id === currentAdmin.id && role !== targetUser.role) {
      return redirectWithFlash(request, returnPath, "error", "You cannot change your own role.");
    }

    if (targetUser.role === "SUPERADMIN" && role !== "SUPERADMIN" && targetUser.isActive) {
      const remainingSuperadmins = await countActiveSuperadminsInDb(targetUser.id);
      if (remainingSuperadmins === 0) {
        return redirectWithFlash(request, returnPath, "error", "At least one active superadmin is required.");
      }
    }

    const updates = [prisma.adminUser.update({ where: { id }, data: { role } })];
    if (formData.get("includePermissions") === "1" && targetUser.role !== "SUPERADMIN") {
      const value = JSON.stringify(parsePermissions(formData.getAll("permissions")));
      const key = `admin.permissions.${id}`;
      updates.push(prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } }));
    }
    await prisma.$transaction(updates);

    return redirectWithFlash(request, returnPath, "success", "User updated.");
  } catch (error) {
    if (error?.status === 401) {
      return redirectWithFlash(request, "/admin/login", "error", "Please sign in again.");
    }
    if (error?.status === 403) {
      return redirectWithFlash(request, "/admin", "error", "You do not have permission to manage users.");
    }

    const message =
      error instanceof Error && error.message
        ? error.message
        : "Could not update the user.";
    return redirectWithFlash(request, returnPath, "error", message);
  }
}

export const POST = withAdminPermission("SUPERADMIN", handlePOST);
