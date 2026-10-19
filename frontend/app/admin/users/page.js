import Link from "next/link";
import {
  AdminSection,
  FlashMessage,
  StatusBadgeLabel,
  TypeBadge,
  dangerButtonStyle,
  emptyStateStyle,
  mutedTextStyle,
  pageGridStyle,
  primaryButtonStyle,
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
        <div style={pageHeaderStyle}>
          <div style={{ display: "grid", gap: 6 }}>
            <h1 style={pageTitleStyle}><AdminText i18nKey="usersAdmin.title" fallback="User management" /></h1>
          </div>
          <a href="#create-user" style={{ ...primaryButtonStyle, ...compactButtonStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
            <AdminText i18nKey="usersAdmin.createUser" fallback="Create user" />
          </a>
        </div>

        {successMessage ? <FlashMessage tone="success" message={successMessage} /> : null}
        {errorMessage ? <FlashMessage tone="error" message={errorMessage} /> : null}



        <AdminSection
          title={<AdminText i18nKey="usersAdmin.allUsers" fallback="All users" />}
        >
          <form action="/admin/users" method="get" style={filterPanelStyle}>
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

          <div className="admin-users-table" style={{ ...tableWrapStyle, borderRadius: 4 }}>
            <table style={{ ...tableStyle, tableLayout: "auto", minWidth: 1120 }}>
              <thead>
                <tr>
                  <th scope="col" style={{ ...userThStyle, width: 48, textAlign: "center" }}>
                    <AdminText i18nKey="usersAdmin.orderNr" fallback="No." />
                  </th>
                  <th scope="col" style={userThStyle}>
                    <AdminText i18nKey="usersAdmin.email" fallback="Email" />
                  </th>
                  <th scope="col" style={{ ...userThStyle, width: 290 }}>
                    <AdminText i18nKey="usersAdmin.role" fallback="Role" />
                  </th>
                  <th scope="col" style={userThStyle}>
                    <AdminText i18nKey="usersAdmin.status" fallback="Status" />
                  </th>
                  <th scope="col" style={userThStyle}>
                    <AdminText i18nKey="usersAdmin.created" fallback="Created" />
                  </th>
                  <th scope="col" style={userThStyle}>
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
                      <td style={{ ...userTdStyle, ...orderNrCellStyle }}>{index + 1}</td>
                      <td style={userTdStyle}>
                        <div style={emailCellStyle}>
                        <strong>{user.email}</strong>
                        {isSelf ? (
                          <div>
                            <TypeBadge label={<AdminText i18nKey="usersAdmin.you" fallback="You" />} />
                          </div>
                        ) : null}
                        </div>
                      </td>
                      <td style={userTdStyle}>
                        <form action={`/api/admin/users/${user.id}`} method="post" style={inlineFormStyle}>
                          <input type="hidden" name="intent" value="update" />
                          {restrictions.canChangeRole ? <AdminSelect
                            menuPortal
                            name="role"
                            defaultValue={user.role}
                            style={roleSelectStyle}
                            wrapperStyle={{ width: 150, flexShrink: 0 }}
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
                          </AdminSelect> : <TypeBadge label={formatAdminRoleLabel(user.role)} />}
                          {restrictions.canChangeRole ? (
                            <AdminFormSubmitButton secondary pendingKey="usersAdmin.saving" pendingLabel="Saving..." style={compactButtonStyle}>
                              <AdminText i18nKey="usersAdmin.saveRole" fallback="Save role" />
                            </AdminFormSubmitButton>
                          ) : restrictions.changeRoleReasonKey ? (
                            <span style={{ ...disabledHintStyle, flexBasis: "100%" }} title={actionReasonFallback(restrictions.changeRoleReasonKey)}>
                              <AdminText
                                i18nKey={restrictions.changeRoleReasonKey}
                                fallback={actionReasonFallback(restrictions.changeRoleReasonKey)}
                              />
                            </span>
                          ) : null}
                        </form>
                      </td>
                      <td style={userTdStyle}>
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
                      <td style={userTdStyle}>
                        <AdminDateTime value={user.createdAt} stacked />
                      </td>
                      <td style={{ ...userTdStyle, verticalAlign: "top" }}>
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
                                  style={{ ...secondaryButtonStyle, ...compactButtonStyle }}
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
                                style={{ ...dangerButtonStyle, ...compactButtonStyle }}
                              >
                                <AdminText i18nKey="usersAdmin.delete" fallback="Delete" />
                              </AdminFormSubmitButton>
                            </form>
                          ) : null}
                          {(restrictions.deactivateReasonKey || restrictions.deleteReasonKey) ? (
                            <details style={restrictionDetailsStyle}>
                              <summary style={restrictionSummaryStyle}><AdminText i18nKey="usersAdmin.actionRestrictions" fallback="Action restrictions" /></summary>
                              <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
                                {user.isActive && restrictions.deactivateReasonKey ? <DisabledActionHint reasonKey={restrictions.deactivateReasonKey} /> : null}
                                {restrictions.deleteReasonKey ? <DisabledActionHint reasonKey={restrictions.deleteReasonKey} /> : null}
                              </div>
                            </details>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={6} style={userTdStyle}>
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

        <div id="create-user" style={{ ...splitGridStyle, scrollMarginTop: 24 }}>
          <AdminSection
            title={<AdminText i18nKey="usersAdmin.createUser" fallback="Create user" />}
          >
            <AdminCreateUserForm />
          </AdminSection>

          <AdminSection title={<AdminText i18nKey="usersAdmin.roleGuide" fallback="Role guide" />}>
            <div style={{ display: "grid" }}>
              {ADMIN_ROLES.map((role) => (
                <div key={role} style={roleGuideRowStyle}>
                  <span style={roleGuideLabelStyle}>{formatAdminRoleLabel(role)}</span>
                  <p style={mutedTextStyle}>
                    <AdminText i18nKey={`usersAdmin.roleDescription.${role}`} fallback={roleDescriptionFallback(role)} />
                  </p>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>
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
  fontSize: "var(--admin-text-label)",
  fontWeight: 500,
  textAlign: "center",
  fontVariantNumeric: "tabular-nums",
};

const roleGuideRowStyle = {
  display: "grid",
  gridTemplateColumns: "100px minmax(0, 1fr)",
  gap: 16,
  alignItems: "start",
  padding: "16px 0",
  borderBottom: "1px solid var(--app-border)",
};

const inlineFormStyle = {
  display: "flex",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 8,
  minWidth: 250,
  margin: 0,
};

const compactButtonStyle = {
  minHeight: 42,
  padding: "9px 12px",
  borderRadius: 8,
  fontSize: "var(--admin-text-meta)",
  fontWeight: 600,
  whiteSpace: "nowrap",
  boxShadow: "none",
};

const filterPanelStyle = {
  display: "grid",
  gap: 12,
  padding: 14,
  borderRadius: 8,
  border: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
};

const filterGridStyle = {
  display: "grid",
  gap: 12,
  gridTemplateColumns: "minmax(220px, 1.4fr) repeat(2, minmax(160px, 0.8fr)) auto",
  alignItems: "end",
};

const filterFieldStyle = {
  minWidth: 0,
  display: "grid",
  gap: 6,
  color: "var(--app-text-muted)",
  fontSize: "var(--admin-text-label)",
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const filterInputStyle = {
  width: "100%",
  minHeight: 42,
  borderRadius: 8,
  border: "1px solid var(--app-border-strong)",
  background: "var(--color-card)",
  padding: "9px 11px",
  color: "var(--app-text)",
  fontSize: "var(--admin-text-body)",
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
  minHeight: 42,
  padding: "9px 14px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 600,
  fontSize: "var(--admin-text-body)",
  cursor: "pointer",
};

const filterClearLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  minHeight: 42,
  padding: "9px 12px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  border: "1px solid var(--app-border-strong)",
  fontWeight: 600,
  fontSize: "var(--admin-text-body)",
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
  gap: 8,
  alignItems: "center",
  flexWrap: "wrap",
  minWidth: 160,
};

const disabledHintStyle = {
  display: "block",
  color: "var(--app-text-muted)",
  fontSize: 12,
  lineHeight: 1.5,
  fontWeight: 400,
  cursor: "help",
};

const pageHeaderStyle = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" };
const pageTitleStyle = { margin: 0, fontSize: "var(--admin-text-title)", fontWeight: 700, letterSpacing: "-0.02em", color: "var(--app-text)" };
const userThStyle = { ...thStyle, padding: "16px 20px", whiteSpace: "nowrap" };
const userTdStyle = { ...tdStyle, padding: "16px 12px", verticalAlign: "middle" };
const roleSelectStyle = { width: 150, minHeight: 42, fontSize: "var(--admin-text-body)" };
const emailCellStyle = { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", minWidth: 190 };
const roleGuideLabelStyle = { fontSize: "var(--admin-text-body)", fontWeight: 600, color: "var(--app-text)" };
const restrictionDetailsStyle = { width: 240, maxWidth: "100%", flexShrink: 0, fontSize: "var(--admin-text-meta)", color: "var(--app-text-muted)" };
const restrictionSummaryStyle = { cursor: "pointer", padding: "8px 0", fontWeight: 500 };
