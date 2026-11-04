import { AdminPermissionFields } from "../../../components/admin-permission-fields";
import { ADMIN_PERMISSIONS } from "../../../lib/admin-permissions";
import AdminFilterForm from "../../../components/admin-filter-form";
import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  StatusBadgeLabel,
  actionRowStyle,
  dangerButtonStyle,
  emptyStateStyle,
  pageGridStyle,
  secondaryButtonStyle,
  primaryButtonStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
import AdminCreateUserPanel from "../../../components/admin-create-user-panel";
import AdminCreateUserForm from "../../../components/admin-create-user-form";
import { AdminFormSubmitButton } from "../../../components/admin-form-submit-button";
import { AdminShell } from "../../../components/admin-shell";
import { AdminDateTime, AdminText, AdminTranslatedInput } from "../../../components/admin-i18n";
import AdminSelect from "../../../components/admin-select";
import { ADMIN_ROLES, formatAdminRoleLabel } from "../../../lib/admin-roles";
import { requireSuperAdminPage } from "../../../lib/admin-role-guards";
import { getFormMessage } from "../../../lib/admin-forms";
import {
  filterAdminUsers,
  getAdminUserActionRestrictions,
} from "../../../lib/admin-user-management";
import { prisma } from "../../../lib/prisma";

export const dynamic = "force-dynamic";

function normalizeParam(value) {
  if (Array.isArray(value)) return value[0] || "";
  return value || "";
}

function actionReasonFallback(key) {
  switch (key) {
    case "usersAdmin.cannotChangeOwnRole":
      return "You cannot change your own role.";
    case "usersAdmin.cannotChangeLastSuperadminRole":
      return "The last active superadmin cannot be changed to another role.";
    case "usersAdmin.cannotDeactivateSelf":
      return "You cannot deactivate your own account.";
    case "usersAdmin.cannotDeactivateLastSuperadmin":
      return "The last active superadmin cannot be deactivated.";
    case "usersAdmin.cannotDeleteSelf":
      return "You cannot delete your own account.";
    case "usersAdmin.cannotDeleteLastSuperadmin":
      return "The last active superadmin cannot be deleted.";
    default:
      return "";
  }
}

export default async function AdminUsersPage({ searchParams }) {
  const currentAdmin = await requireSuperAdminPage();
  const resolvedSearchParams = (await searchParams) || {};
  const successMessage = getFormMessage(resolvedSearchParams, "success");
  const errorMessage = getFormMessage(resolvedSearchParams, "error");
  const filters = {
    query: normalizeParam(resolvedSearchParams.q).trim(),
    role: normalizeParam(resolvedSearchParams.role).trim().toUpperCase(),
    status: normalizeParam(resolvedSearchParams.status).trim().toLowerCase(),
  };

  const users = await prisma.adminUser.findMany({
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const permissionRows = await prisma.appSetting.findMany({ where: { key: { startsWith: "admin.permissions." } } });
  const permissionMap = new Map(permissionRows.map(row => { let value = []; try { value = JSON.parse(row.value); } catch {} return [row.key, Array.isArray(value) ? value : []]; }));
  const filteredUsers = filterAdminUsers(users, filters);
  const hasActiveFilters = Boolean(filters.query || filters.role || filters.status);

  return (
    <AdminShell adminEmail={currentAdmin.email}>
      <div style={pageGridStyle}>
        <AdminSection
          title={<AdminText i18nKey="usersAdmin.title" fallback="User management" />}

        >
          <AdminCreateUserPanel>
            <AdminSection
              title={<AdminText i18nKey="usersAdmin.createUser" fallback="Create user" />}
              description={<AdminText i18nKey="usersAdmin.createUserDescription" fallback="Add a new admin account with an email, password, and role." />}
            >
              <AdminCreateUserForm />
            </AdminSection>
          </AdminCreateUserPanel>
        </AdminSection>

        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <AdminSection
          title={<AdminText i18nKey="usersAdmin.allUsers" fallback="All users" />}

        >
          <AdminFilterForm action="/admin/users" style={filterPanelStyle}>

            <div className="users-filter-grid" style={filterGridStyle}>
              <FilterField label={<AdminText i18nKey="usersAdmin.search" fallback="Search" />}>
                <AdminTranslatedInput
                  name="q"
                  type="search"
                  defaultValue={filters.query}
                  placeholderKey="usersAdmin.searchPlaceholder"
                  placeholderFallback="Search by email..."
                  style={filterInputStyle}
                />
              </FilterField>
              <FilterField label={<AdminText i18nKey="usersAdmin.role" fallback="Role" />}>
                <AdminSelect name="role" defaultValue={filters.role || "ALL"} style={filterInputStyle}>
                  <option value="ALL">
                    <AdminText i18nKey="usersAdmin.allRoles" fallback="All roles" />
                  </option>
                  {ADMIN_ROLES.map((role) => (
                    <option key={role} value={role}>
                      {formatAdminRoleLabel(role)}
                    </option>
                  ))}
                </AdminSelect>
              </FilterField>
              <FilterField label={<AdminText i18nKey="usersAdmin.status" fallback="Status" />}>
                <AdminSelect name="status" defaultValue={filters.status || "all"} style={filterInputStyle}>
                  <option value="all">
                    <AdminText i18nKey="usersAdmin.allStatuses" fallback="All statuses" />
                  </option>
                  <option value="active">
                    <AdminText i18nKey="status.active" fallback="Active" />
                  </option>
                  <option value="inactive">
                    <AdminText i18nKey="status.inactive" fallback="Inactive" />
                  </option>
                </AdminSelect>
              </FilterField>
              <div style={filterActionsStyle}>
                <Link scroll={false} href="/admin/users" style={filterClearLinkStyle}>
                  <AdminText i18nKey="usersAdmin.clearFilters" fallback="Clear" />
                </Link>
              </div>
            </div>
          </AdminFilterForm>

          <p style={resultsMetaStyle}>
            <AdminText
              i18nKey="usersAdmin.resultsCount"
              fallback="{shown} of {total} users shown"
              values={{ shown: String(filteredUsers.length), total: String(users.length) }}
            />
          </p>

          <div className="users-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, minWidth: 1050 }}>
              <colgroup>
                <col style={{ width: "4%" }} />
                <col style={{ width: "19%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "9%" }} />
                <col style={{ width: "17%" }} />
                <col style={{ width: "23%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th style={{ ...thStyle, width: 72 }}>
                    <AdminText i18nKey="usersAdmin.orderNr" fallback="No." />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="usersAdmin.email" fallback="Email" />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="usersAdmin.role" fallback="Role" />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="permissions.title" fallback="Workspace permissions" />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="usersAdmin.status" fallback="Status" />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="usersAdmin.created" fallback="Created" />
                  </th>
                  <th style={thStyle}>
                    <AdminText i18nKey="usersAdmin.actions" fallback="Actions" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length ? filteredUsers.map((user, index) => {
                  const restrictions = getAdminUserActionRestrictions(user, currentAdmin.id, users);

                  return (
                    <tr key={user.id}>
                      <td style={{ ...tdStyle, ...orderNrCellStyle }}>{index + 1}</td>
                      <td style={tdStyle}>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                          <strong>{user.email}</strong>
                          {user.id === currentAdmin.id && (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 7px", borderRadius: 6, background: "var(--app-surface-muted)", color: "var(--app-accent)", border: "1px solid var(--app-border)", fontSize: "var(--admin-text-label, 0.75rem)", fontWeight: 600, lineHeight: 1.5, whiteSpace: "nowrap" }}>
                              <span aria-hidden="true" style={{ width: 5, height: 5, borderRadius: "50%", background: "currentColor" }} />
                              <AdminText i18nKey="usersAdmin.you" fallback="You" />
                            </span>
                          )}
                        </div>

                      </td>
                      <td style={tdStyle}>
                        <form action={`/api/admin/users/${user.id}`} method="post" id={`user-edit-${user.id}`} style={inlineFormStyle}>
                          <input type="hidden" name="intent" value="update" />
                          <input type="hidden" name="includePermissions" value="1" />
                          {!restrictions.canChangeRole && <input type="hidden" name="role" value={user.role} />}
                          <AdminSelect
                            portal
                            name="role"
                            defaultValue={user.role}
                            disabled={!restrictions.canChangeRole}
                            ariaLabelKey="usersAdmin.roleFor"
                            ariaLabelValues={{ email: user.email }}
                            aria-label={`Role for ${user.email}`}
                            title={
                              restrictions.changeRoleReasonKey
                                ? actionReasonFallback(restrictions.changeRoleReasonKey)
                                : undefined
                            }
                          >
                            {ADMIN_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {formatAdminRoleLabel(role)}
                              </option>
                            ))}
                          </AdminSelect>

                        </form>
                      </td>
                      <td style={tdStyle}>
                        <AdminPermissionFields compact form={`user-edit-${user.id}`} permissions={user.role === "SUPERADMIN" ? ADMIN_PERMISSIONS : permissionMap.get(`admin.permissions.${user.id}`) || []} disabled={user.role === "SUPERADMIN"} />
                      </td>
                      <td style={tdStyle}>
                        <StatusBadgeLabel
                          status={user.isActive ? "ACTIVE" : "ARCHIVED"}
                          label={
                            user.isActive ? (
                              <AdminText i18nKey="status.active" fallback="Active" />
                            ) : (
                              <AdminText i18nKey="status.inactive" fallback="Inactive" />
                            )
                          }
                        />
                      </td>
                      <td style={tdStyle}>
                        <AdminDateTime value={user.createdAt} />
                      </td>
                      <td style={tdStyle}>
                        <div style={actionColumnStyle}>
                          {(restrictions.canChangeRole || user.role !== "SUPERADMIN") && (
                            <button type="submit" form={`user-edit-${user.id}`} style={primaryButtonStyle}>
                              <AdminText i18nKey="common.save" fallback="Save" />
                            </button>
                          )}
                          {restrictions.canReactivate ? (
                            <form action={`/api/admin/users/${user.id}`} method="post" style={{ margin: 0 }}>
                              <input type="hidden" name="intent" value="reactivate" />
                              <AdminFormSubmitButton secondary pendingKey="usersAdmin.reactivating" pendingLabel="Reactivating..." style={compactButtonStyle}>
                                <AdminText i18nKey="usersAdmin.reactivate" fallback="Reactivate" />
                              </AdminFormSubmitButton>
                            </form>
                          ) : null}

                          {user.isActive ? (
                            restrictions.canDeactivate ? (
                              <form action={`/api/admin/users/${user.id}`} method="post" style={{ margin: 0 }}>
                                <input type="hidden" name="intent" value="deactivate" />
                                <AdminFormSubmitButton
                                  secondary
                                  pendingKey="usersAdmin.deactivating"
                                  pendingLabel="Deactivating..."
                                  style={{ ...compactButtonStyle, ...secondaryButtonStyle }}
                                >
                                  <AdminText i18nKey="usersAdmin.deactivate" fallback="Deactivate" />
                                </AdminFormSubmitButton>
                              </form>
                            ) : null
                          ) : null}

                          {restrictions.canDelete ? (
                            <form action={`/api/admin/users/${user.id}`} method="post" style={{ margin: 0 }}>
                              <input type="hidden" name="intent" value="delete" />
                              <AdminFormSubmitButton
                                pendingKey="usersAdmin.deleting"
                                pendingLabel="Deleting..."
                                style={{ ...compactButtonStyle, ...dangerButtonStyle }}
                              >
                                <AdminText i18nKey="usersAdmin.delete" fallback="Delete" />
                              </AdminFormSubmitButton>
                            </form>
                          ) : restrictions.deleteReasonKey ? (
                            <button type="button" disabled style={{ ...compactButtonStyle, ...dangerButtonStyle, opacity: 0.35, cursor: "not-allowed" }}>
                              <AdminText i18nKey="usersAdmin.delete" fallback="Delete" />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={7} style={tdStyle}>
                      <p style={emptyStateStyle}>
                        {hasActiveFilters ? (
                          <AdminText
                            i18nKey="usersAdmin.noUsersMatchFilters"
                            fallback="No users match the current filters."
                          />
                        ) : (
                          <AdminText i18nKey="usersAdmin.noUsers" fallback="No users found." />
                        )}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </AdminSection>
      </div>

      <style>{`
        .users-table table { font-size: var(--admin-text-body, 13px); }
        .users-table th { padding: 12px 10px !important; font-size: var(--admin-text-label, 0.75rem) !important; }
        .users-table td { padding: 14px 10px !important; vertical-align: top; }
        .users-table td strong { font-weight: 600; }
        .users-table tbody tr:hover { background: var(--app-surface-muted); }
        .users-table select { min-height: 34px !important; padding: 6px 10px !important; border-radius: 8px !important; font-size: var(--admin-text-meta, 0.8125rem) !important; }
        .users-table button { white-space: nowrap; flex-shrink: 0; min-height: 36px !important; padding: 8px 10px !important; border-radius: 8px !important; font-size: var(--admin-text-meta, 0.8125rem) !important; box-shadow: none !important; }

        @media (max-width: 900px) {
          .users-filter-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </AdminShell>
  );
}

function DisabledActionHint({ reasonKey }) {
  const fallback = actionReasonFallback(reasonKey);
  return (
    <span style={disabledHintStyle} title={fallback}>
      <AdminText i18nKey={reasonKey} fallback={fallback} />
    </span>
  );
}

function FilterField({ label, children }) {
  return (
    <label style={filterFieldStyle}>
      <span>{label}</span>
      {children}
    </label>
  );
}

const orderNrCellStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

const inlineFormStyle = {
  display: "grid",
  gap: 8,
  maxWidth: 220,
};

const compactButtonStyle = {
  minHeight: 42,
  padding: "10px 14px",
  fontSize: "0.92rem",
};

const filterPanelStyle = {
  display: "grid",
  gap: 14,
  padding: "18px 20px",
  borderRadius: 18,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
};

const filterHeaderStyle = {
  display: "grid",
  gap: 4,
};

const filterEyebrowStyle = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "var(--app-text-muted)",
};

const filterHintStyle = {
  fontSize: 13,
  color: "var(--app-text-muted)",
  lineHeight: 1.5,
};

const filterGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "minmax(220px, 1.4fr) repeat(2, minmax(160px, 0.8fr)) auto",
  alignItems: "end",
};

const filterFieldStyle = {
  display: "grid",
  gap: 8,
  color: "var(--app-text)",
  fontWeight: 700,
};

const filterInputStyle = {
  width: "100%",
  minHeight: 48,
  borderRadius: 14,
  border: "1px solid var(--app-border-strong)",
  background: "var(--color-card)",
  padding: "12px 14px",
  color: "var(--app-text)",
  fontSize: "0.96rem",
};

const filterActionsStyle = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  flexWrap: "wrap",
};

const filterApplyButtonStyle = {
  border: "1px solid var(--color-primary)",
  borderRadius: 14,
  minHeight: 48,
  padding: "12px 16px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 700,
  cursor: "pointer",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 14,
  minHeight: 48,
  padding: "12px 16px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  border: "1px solid var(--app-border-strong)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};

const resultsMetaStyle = {
  margin: 0,
  color: "var(--app-text-muted)",
  fontSize: 14,
};

const actionColumnStyle = {
  display: "flex",
  flexWrap: "nowrap",
  alignItems: "center",
  gap: 8,
  minWidth: 0,
};

const disabledHintStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 600,
  cursor: "help",
};
