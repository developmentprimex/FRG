import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  PageHero,
  StatusBadgeLabel,
  TypeBadge,
  actionRowStyle,
  dangerButtonStyle,
  emptyStateStyle,
  mutedTextStyle,
  pageGridStyle,
  secondaryButtonStyle,
  splitGridStyle,
  tableStyle,
  tableWrapStyle,
  tdStyle,
  thStyle,
} from "../../../components/admin-ui";
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
    orderBy: [{ role: "asc" }, { email: "asc" }],
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
  const filteredUsers = filterAdminUsers(users, filters);
  const hasActiveFilters = Boolean(filters.query || filters.role || filters.status);

  return (
    <AdminShell adminEmail={currentAdmin.email}>
      <div style={pageGridStyle}>
        <PageHero
          eyebrow={<AdminText i18nKey="usersAdmin.workspace" fallback="Administration" />}
          title={<AdminText i18nKey="usersAdmin.title" fallback="User management" />}
          description={
            <AdminText
              i18nKey="usersAdmin.description"
              fallback="Create admin accounts and assign roles. Superadmins and PX admins can access this page."
            />
          }
        />

        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}

        <div style={splitGridStyle}>
          <AdminSection
            title={<AdminText i18nKey="usersAdmin.createUser" fallback="Create user" />}
            description={
              <AdminText
                i18nKey="usersAdmin.createUserDescription"
                fallback="Add a new admin account with an email, password, and role."
              />
            }
          >
            <AdminCreateUserForm />
          </AdminSection>

          <AdminSection
            title={<AdminText i18nKey="usersAdmin.roleGuide" fallback="Role guide" />}
            description={
              <AdminText
                i18nKey="usersAdmin.roleGuideDescription"
                fallback="Detailed permissions will be added later. For now, all roles can use the existing admin workflows."
              />
            }
          >
            <div style={{ display: "grid", gap: 14 }}>
              {ADMIN_ROLES.map((role) => (
                <div key={role} style={roleGuideRowStyle}>
                  <TypeBadge label={formatAdminRoleLabel(role)} />
                  <p style={mutedTextStyle}>
                    <AdminText i18nKey={`usersAdmin.roleDescription.${role}`} fallback={roleDescriptionFallback(role)} />
                  </p>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>

        <AdminSection
          title={<AdminText i18nKey="usersAdmin.allUsers" fallback="All users" />}
          description={
            <AdminText
              i18nKey="usersAdmin.allUsersDescription"
              fallback="Update roles or deactivate accounts. You cannot modify your own role or deactivate yourself."
            />
          }
        >
          <form action="/admin/users" method="get" style={filterPanelStyle}>
            <div style={filterHeaderStyle}>
              <span style={filterEyebrowStyle}>
                <AdminText i18nKey="usersAdmin.filters" fallback="Filters" />
              </span>
              <span style={filterHintStyle}>
                <AdminText i18nKey="usersAdmin.searchHint" fallback="Search by email and narrow by role or status." />
              </span>
            </div>
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
                <button type="submit" style={filterApplyButtonStyle}>
                  <AdminText i18nKey="usersAdmin.applyFilters" fallback="Apply filters" />
                </button>
                <Link href="/admin/users" style={filterClearLinkStyle}>
                  <AdminText i18nKey="usersAdmin.clearFilters" fallback="Clear" />
                </Link>
              </div>
            </div>
          </form>

          <p style={resultsMetaStyle}>
            <AdminText
              i18nKey="usersAdmin.resultsCount"
              fallback="{shown} of {total} users shown"
              values={{ shown: String(filteredUsers.length), total: String(users.length) }}
            />
          </p>

          <div style={tableWrapStyle}>
            <table style={tableStyle}>
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
                  const isSelf = user.id === currentAdmin.id;
                  const restrictions = getAdminUserActionRestrictions(user, currentAdmin.id, users);

                  return (
                    <tr key={user.id}>
                      <td style={{ ...tdStyle, ...orderNrCellStyle }}>{index + 1}</td>
                      <td style={tdStyle}>
                        <strong>{user.email}</strong>
                        {isSelf ? (
                          <div style={{ marginTop: 6 }}>
                            <TypeBadge label={<AdminText i18nKey="usersAdmin.you" fallback="You" />} />
                          </div>
                        ) : null}
                      </td>
                      <td style={tdStyle}>
                        <form action={`/api/admin/users/${user.id}`} method="post" style={inlineFormStyle}>
                          <input type="hidden" name="intent" value="update" />
                          <AdminSelect
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
                          {restrictions.canChangeRole ? (
                            <AdminFormSubmitButton secondary pendingKey="usersAdmin.saving" pendingLabel="Saving..." style={compactButtonStyle}>
                              <AdminText i18nKey="usersAdmin.saveRole" fallback="Save role" />
                            </AdminFormSubmitButton>
                          ) : restrictions.changeRoleReasonKey ? (
                            <span style={disabledHintStyle} title={actionReasonFallback(restrictions.changeRoleReasonKey)}>
                              <AdminText
                                i18nKey={restrictions.changeRoleReasonKey}
                                fallback={actionReasonFallback(restrictions.changeRoleReasonKey)}
                              />
                            </span>
                          ) : null}
                        </form>
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
                            ) : restrictions.deactivateReasonKey ? (
                              <DisabledActionHint reasonKey={restrictions.deactivateReasonKey} />
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
                            <DisabledActionHint reasonKey={restrictions.deleteReasonKey} />
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={tdStyle}>
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

function roleDescriptionFallback(role) {
  switch (role) {
    case "SUPERADMIN":
      return "Full access, including user management.";
    case "PX_ADMIN":
      return "Full access, including PX orders, PX claims and user management.";
    case "ADMIN":
      return "Admin access without PX orders, PX claims, users, claim activity or contract access.";
    case "USER":
      return "Basic admin access with the same workflows for now.";
    default:
      return "";
  }
}

const orderNrCellStyle = {
  color: "var(--app-text-muted)",
  fontWeight: 700,
  fontVariantNumeric: "tabular-nums",
};

const roleGuideRowStyle = {
  display: "grid",
  gap: 8,
  padding: "14px 0",
  borderBottom: "1px solid var(--app-border)",
};

const inlineFormStyle = {
  display: "grid",
  gap: 10,
  maxWidth: 280,
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
  borderRadius: 8,
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
  borderRadius: 8,
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
  borderRadius: 8,
  minHeight: 48,
  padding: "12px 16px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 700,
  cursor: "pointer",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
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
  display: "grid",
  gap: 10,
  minWidth: 160,
};

const disabledHintStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 600,
  cursor: "help",
};
