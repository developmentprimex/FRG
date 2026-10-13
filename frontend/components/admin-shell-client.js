"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminI18nProvider, AdminLanguageSwitcher, AdminText, useAdminI18n } from "./admin-i18n";
import { canAccessPx, hasFullAdminAccess } from "../lib/admin-roles";

const navItems = [
  { href: "/admin", labelKey: "adminShellLogin.dashboard", fallback: "Dashboard", icon: GridIcon },
  { href: "/admin/claims-overview", labelKey: "claimOverview.title", fallback: "Claims overview", icon: ClaimsIcon, requiresClaimsNav: true },
  { href: "/admin/kitchens", labelKey: "adminShellLogin.kitchens", fallback: "Kitchens", icon: KitchenIcon },
  { href: "/admin/contracts", labelKey: "adminShellLogin.contracts", fallback: "Contracts", icon: ContractsIcon },
  { href: "/admin/property-owners", labelKey: "adminShellLogin.owners", fallback: "Owners", icon: OwnersIcon },
  { href: "/admin/orders", labelKey: "adminShellLogin.orders", fallback: "Orders", icon: OrdersIcon },
  { href: "/admin/order-cancellations", labelKey: "adminShellLogin.orderCancellations", fallback: "Withdrawals", icon: WithdrawalIcon, badge: "cancellations" },
  { href: "/admin/reports", labelKey: "adminShellLogin.reports", fallback: "Reports", icon: ReportsIcon },
  { href: "/admin/contract-access", labelKey: "adminShellLogin.contractAccess", fallback: "Contract access", icon: ContractsIcon, requiresSuperAdmin: true },
  { href: "/admin/claim-activity", labelKey: "adminShellLogin.claimActivity", fallback: "Claim activity", icon: ClaimsIcon, requiresSuperAdmin: true },
  { href: "/admin/px-orders", labelKey: "adminShellLogin.pxOrders", fallback: "PX orders", icon: OrdersIcon, requiresPxAdmin: true },
  { href: "/admin/px-claims", labelKey: "adminShellLogin.pxClaims", fallback: "PX claims", icon: ClaimsIcon, requiresClaimsNav: true, requiresPxAdmin: true },
  { href: "/admin/claims", labelKey: "adminShellLogin.claims", fallback: "Claims", icon: ClaimsIcon, requiresClaimsNav: true },
  { href: "/admin/catalog/articles", labelKey: "adminShellLogin.catalogArticles", fallback: "Catalog", icon: CatalogAuditIcon },
  { href: "/admin/catalog/imports", labelKey: "adminShellLogin.catalogImports", fallback: "Price Imports", icon: CatalogAuditIcon },
  { href: "/admin/settings", labelKey: "adminShellLogin.settings", fallback: "Settings", icon: SettingsIcon },
  { href: "/admin/users", labelKey: "adminShellLogin.users", fallback: "Users", icon: UsersIcon, requiresUsersNav: true },
  { href: "/admin/account", labelKey: "adminShellLogin.account", fallback: "Account", icon: AccountIcon },
  { href: "/", labelKey: "adminShellLogin.publicSite", fallback: "Public site", icon: GlobeIcon },
];
const DESKTOP_SIDEBAR_WIDTH = "clamp(240px, 18vw, 300px)";

export function AdminShellClient({ adminEmail, adminRole = "ADMIN", initialLanguage = "en", showClaimsNav = false, showUsersNav = false, openCancellationCount = 0, children }) {
  return (
    <AdminI18nProvider initialLanguage={initialLanguage}>
      <AdminShellContent
        adminEmail={adminEmail}
        adminRole={adminRole}
        showClaimsNav={showClaimsNav}
        showUsersNav={showUsersNav}
        openCancellationCount={openCancellationCount}
      >
        {children}
      </AdminShellContent>
    </AdminI18nProvider>
  );
}

function getNavBadgeCount(item, { openCancellationCount }) {
  if (item.badge === "cancellations") return Number(openCancellationCount || 0);
  return 0;
}

function AdminShellContent({ adminEmail, adminRole, showClaimsNav, showUsersNav, openCancellationCount = 0, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const { translate } = useAdminI18n();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState("");

  useEffect(() => {
    setPendingHref("");
  }, [pathname]);

  function prepareNavigation(href) {
    if (href.startsWith("/admin")) router.prefetch(href);
  }

  function startNavigation(href) {
    if (href !== pathname) setPendingHref(href);
  }
  const visibleNavItems = navItems.filter((item) => {
    if (item.requiresClaimsNav && !showClaimsNav) return false;
    if (item.requiresUsersNav && !showUsersNav) return false;
    if (item.requiresSuperAdmin && !hasFullAdminAccess({ role: adminRole })) return false;
    if (item.requiresPxAdmin && !canAccessPx({ role: adminRole })) return false;
    return true;
  });
  const activeNavItem = visibleNavItems.find((item) => isActivePath(pathname, item.href)) ?? visibleNavItems[0];

  return (
    <div
      className="admin-shell"
      style={{
        minHeight: "100vh",
        position: "relative",
        overflowX: "hidden",
        overflowY: "visible",
        isolation: "isolate",
        background: "var(--app-bg)",
        color: "var(--app-text)",
        fontFamily: "Manrope, sans-serif",
      }}
    >
      {pendingHref ? <div className="admin-navigation-progress" aria-label={translate("adminShellLogin.loading", "Loading")} /> : null}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            right: "8%",
            width: 380,
            height: 380,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(232, 222, 212, 0.55) 0%, rgba(232, 222, 212, 0.18) 34%, transparent 68%)",
            filter: "blur(16px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 220,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(139, 113, 92, 0.16) 0%, rgba(139, 113, 92, 0.05) 34%, transparent 70%)",
            filter: "blur(18px)",
          }}
        />
      </div>

      <div
        className="admin-shell__layout"
        style={{
          width: "100%",
          margin: 0,
          padding: "0 0 40px 0",
          position: "relative",
        }}
      >
        <nav
          aria-label={translate("adminShellLogin.mobileAdminNavigation", "Mobile admin navigation")}
          className="admin-shell__mobile-nav"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            background: "rgba(241, 236, 230, 0.94)",
            borderBottom: "1px solid var(--app-border)",
            boxShadow: "0 10px 24px rgba(84, 59, 40, 0.08)",
            position: "sticky",
            top: 0,
            zIndex: 60,
            backdropFilter: "blur(14px)",
          }}
        >
          <button
            type="button"
            aria-label={translate("adminShellLogin.sidebar", "Sidebar")}
            aria-expanded={isMobileNavOpen}
            aria-controls="admin-mobile-sidebar"
            onClick={() => setIsMobileNavOpen((current) => !current)}
            style={mobileMenuButtonStyle}
          >
            <MenuIcon />
          </button>

          <div style={mobileActivePageStyle}>
            <span style={mobileActiveEyebrowStyle}>
              <AdminText i18nKey="adminShellLogin.adminWorkspace" fallback="Admin workspace" />
            </span>
            <strong>{translate(activeNavItem.labelKey, activeNavItem.fallback)}</strong>
          </div>

          <button
            type="button"
            aria-label={translate("adminShellLogin.closeSidebar", "Close sidebar")}
            className={`admin-shell__mobile-sidebar-backdrop${isMobileNavOpen ? " is-open" : ""}`}
            onPointerDown={() => setIsMobileNavOpen(false)}
          />

          <aside
            id="admin-mobile-sidebar"
            className={`admin-shell__mobile-sidebar${isMobileNavOpen ? " is-open" : ""}`}
            aria-hidden={!isMobileNavOpen}
          >
            <div style={mobileSidebarHeaderStyle}>
              <img
                src="/img/fragmentologo-cropped.png"
                alt="Fragmento"
                style={{
                  display: "block",
                  width: 150,
                  height: "auto",
                  objectFit: "contain",
                }}
              />
              <button
                type="button"
                aria-label={translate("adminShellLogin.closeSidebar", "Close sidebar")}
                onClick={() => setIsMobileNavOpen(false)}
                style={mobileIconButtonStyle}
              >
                <CloseIcon />
              </button>
            </div>

            <div style={mobileSidebarNavStyle}>
              {visibleNavItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                const Icon = item.icon;
                const badgeCount = getNavBadgeCount(item, { openCancellationCount });

                return (
                  <Link
                    key={`mobile-${item.href}`}
                    href={item.href}
                    prefetch
                    onMouseEnter={() => prepareNavigation(item.href)}
                    onFocus={() => prepareNavigation(item.href)}
                    onClick={() => {
                      startNavigation(item.href);
                      setIsMobileNavOpen(false);
                    }}
                    style={{
                      ...mobileSidebarLinkStyle,
                      background: active ? "var(--color-primary-soft)" : "transparent",
                      color: active ? "var(--app-accent)" : "var(--app-text)",
                      borderColor: active ? "var(--app-border-strong)" : "transparent",
                      fontWeight: active ? 800 : 700,
                    }}
                  >
                    <Icon active={active} />
                    <span style={sidebarLabelStyle}>{translate(item.labelKey, item.fallback)}</span>
                    {badgeCount > 0 ? <span style={navBadgeStyle}>{badgeCount}</span> : null}
                  </Link>
                );
              })}
            </div>
          </aside>
        </nav>

        <aside
          className="admin-shell__sidebar"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: DESKTOP_SIDEBAR_WIDTH,
            display: "grid",
            gridTemplateRows: "auto auto 1fr auto",
            gap: 18,
            alignContent: "start",
            height: "100vh",
            overflowY: "auto",
            overflowX: "hidden",
            padding: "0 20px 20px",
            background: "var(--color-sidebar-bg)",
            borderRight: "1px solid var(--color-border)",
            zIndex: 30,
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              padding: "24px 8px 6px",
            }}
          >
            <img
              src="/img/fragmentologo-cropped.png"
              alt="Fragmento"
              style={{
                display: "block",
                width: "100%",
                maxWidth: 220,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <section
            style={{
              padding: "10px 8px 4px",
              display: "grid",
              gap: 4,
            }}
          >
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--app-text-muted)",
              }}
            >
              <AdminText i18nKey="adminShellLogin.adminWorkspace" fallback="Admin workspace" />
            </span>
          </section>

          <nav
            aria-label={translate("adminShellLogin.sidebar", "Sidebar")}
            style={{
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              alignItems: "stretch",
              alignSelf: "start",
            }}
          >
            {visibleNavItems.map((item) => {
              const active = isActivePath(pathname, item.href);
              const Icon = item.icon;
              const badgeCount = getNavBadgeCount(item, { openCancellationCount });

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch
                  onMouseEnter={() => prepareNavigation(item.href)}
                  onFocus={() => prepareNavigation(item.href)}
                  onClick={() => startNavigation(item.href)}
                  style={{
                    textDecoration: "none",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    minHeight: 56,
                    padding: "10px 14px",
                    borderRadius: 8,
                    background: active
                      ? "var(--color-primary-soft)"
                      : "transparent",
                    color: active ? "var(--app-accent)" : "var(--app-text)",
                    border: `1px solid ${active ? "var(--app-border-strong)" : "transparent"}`,
                    fontWeight: active ? 700 : 600,
                    boxShadow: active ? "0 10px 22px rgba(84, 59, 40, 0.08)" : "none",
                    boxSizing: "border-box",
                  }}
                >
                  <Icon active={active} />
                  <span style={sidebarLabelStyle}>{translate(item.labelKey, item.fallback)}</span>
                  {badgeCount > 0 ? <span style={navBadgeStyle}>{badgeCount}</span> : null}
                </Link>
              );
            })}
          </nav>

          <div
            className="admin-shell__primex-badge"
            style={{
              display: "grid",
              gap: 8,
              justifyItems: "center",
              justifySelf: "center",
              alignSelf: "end",
              textAlign: "center",
            }}
          >
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--app-text-muted)",
                lineHeight: 1,
              }}
            >
              <AdminText i18nKey="adminShellLogin.poweredBy" fallback="Powered by" />
            </span>
            <img
              src="/primex-agentic-logo.png"
              alt="Primex Agentic AI"
              style={{
                display: "block",
                width: 96,
                height: "auto",
                objectFit: "contain",
              }}
            />
          </div>
        </aside>

        <div
          className="admin-shell__main-column"
          style={{
            minWidth: 0,
            display: "grid",
            gridTemplateRows: "auto minmax(0, 1fr)",
            marginLeft: DESKTOP_SIDEBAR_WIDTH,
            minHeight: "100vh",
          }}
        >
          <header
            className="admin-shell__topbar"
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              display: "flex",
              justifyContent: "flex-end",
              padding: "12px clamp(20px, 3vw, 40px) 0",
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 16,
                pointerEvents: "auto",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 12, flexWrap: "wrap" }}>
                <AdminLanguageSwitcher />
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    className="admin-shell__email"
                    style={{
                      color: "var(--app-text-muted)",
                      lineHeight: 1.4,
                      fontWeight: 600,
                    }}
                  >
                    {adminEmail}
                  </span>
                  <Link href="/admin/account" style={topbarLinkStyle}>
                    <AdminText i18nKey="adminShellLogin.account" fallback="Account" />
                  </Link>
                  <form action="/api/admin/logout" method="post" style={{ margin: 0 }}>
                  <button
                    className="admin-shell__logout-button"
                    type="submit"
                    style={{
                      border: "1px solid var(--app-border-strong)",
                      borderRadius: 8,
                      padding: "11px 18px",
                      background: "var(--color-card)",
                      color: "var(--app-text)",
                      fontWeight: 700,
                      cursor: "pointer",
                      boxShadow: "var(--app-shadow-soft)",
                    }}
                  >
                    <AdminText i18nKey="adminShellLogin.logout" fallback="Logout" />
                  </button>
                  </form>
                </div>
              </div>
            </div>
          </header>

          <main
            className="admin-shell__content"
            style={{
              minWidth: 0,
              padding: "28px clamp(20px, 3vw, 40px) 0 clamp(20px, 2.5vw, 36px)",
            }}
          >
            {children}
          </main>
        </div>

        <style>{`
          .admin-navigation-progress {
            position: fixed;
            top: 0;
            left: 0;
            z-index: 120;
            width: 38%;
            height: 3px;
            border-radius: 0 999px 999px 0;
            background: var(--app-accent);
            box-shadow: 0 0 14px rgba(143, 62, 44, 0.48);
            animation: admin-navigation-progress 900ms ease-in-out infinite;
          }

          @keyframes admin-navigation-progress {
            0% { transform: translateX(-105%); }
            55% { transform: translateX(125%); }
            100% { transform: translateX(265%); }
          }

          @media (max-width: 960px) {
            .admin-shell__mobile-nav {
              display: flex !important;
            }

            .admin-shell__mobile-sidebar-backdrop {
              position: fixed;
              inset: 0;
              z-index: 79;
              display: block;
              width: 100vw;
              height: 100dvh;
              padding: 0;
              border: 0;
              background: rgba(27, 23, 20, 0.28);
              opacity: 0;
              pointer-events: none;
              cursor: pointer;
              transition: opacity 180ms ease;
            }

            .admin-shell__mobile-sidebar-backdrop.is-open {
              opacity: 1;
              pointer-events: auto;
            }

            .admin-shell__mobile-sidebar {
              position: fixed;
              top: 0;
              left: 0;
              z-index: 80;
              width: min(320px, calc(100vw - 48px));
              height: 100dvh;
              overflow-y: auto;
              padding: 18px 16px 22px;
              background: var(--color-sidebar-bg);
              border-right: 1px solid var(--color-border);
              box-shadow: 18px 0 38px rgba(84, 59, 40, 0.2);
              transform: translateX(-104%);
              transition: transform 220ms ease;
              box-sizing: border-box;
              visibility: hidden;
              pointer-events: none;
            }

            .admin-shell__mobile-sidebar.is-open {
              transform: translateX(0);
              visibility: visible;
              pointer-events: auto;
            }

            .admin-shell__sidebar {
              display: none !important;
            }

            .admin-shell__main-column {
              margin-left: 0 !important;
            }

            .admin-shell__primex-badge {
              order: 3;
            }
          }

          @media (max-width: 640px) {
            .admin-shell__layout {
              padding-bottom: 28px !important;
              gap: 16px !important;
            }

            .admin-shell__content {
              padding: 20px 16px 0 !important;
            }

            .admin-shell__topbar {
              padding: 14px 16px 0 !important;
              position: static !important;
            }

            .admin-shell__topbar > div,
            .admin-shell__topbar > div > div {
              width: 100%;
              gap: 8px !important;
            }

            .admin-shell__topbar > div > div {
              justify-content: space-between !important;
            }

            .admin-language-switcher {
              display: inline-flex !important;
              grid-template-columns: none !important;
              min-height: 40px !important;
              padding: 0 !important;
              border: 0 !important;
              border-radius: 10px !important;
              background: transparent !important;
              box-shadow: none !important;
              backdrop-filter: none !important;
            }

            .admin-language-switcher__label,
            .admin-language-switcher__current-label,
            .admin-shell__email {
              display: none !important;
            }

            .admin-language-switcher__trigger {
              min-width: 54px !important;
              min-height: 40px !important;
              padding: 6px 9px !important;
              border: 1px solid var(--app-border-strong) !important;
              gap: 6px !important;
              background: var(--color-card) !important;
              box-shadow: var(--app-shadow-soft) !important;
            }

            .admin-language-switcher__menu {
              position: absolute !important;
              top: calc(100% + 8px) !important;
              left: 0 !important;
              right: auto !important;
              width: min(240px, calc(100vw - 32px)) !important;
              min-width: 0 !important;
              border-radius: 14px !important;
              padding: 8px !important;
              z-index: 120 !important;
            }

            .admin-language-switcher__option {
              width: 100% !important;
              min-height: 44px !important;
              border-radius: 10px !important;
              padding: 8px 10px !important;
            }

            .admin-language-switcher__option-label {
              display: inline !important;
              white-space: nowrap !important;
            }

            .admin-shell__topbar a[href="/admin/account"],
            .admin-shell__logout-button {
              min-height: 40px !important;
              padding: 9px 11px !important;
              border-radius: 8px !important;
              font-size: 13px !important;
            }

            .admin-shell__primex-badge {
              width: 100%;
              justify-items: start;
            }
          }
        `}</style>
      </div>
    </div>
  );
}

function isActivePath(pathname, href) {
  if (href === "/admin") {
    return pathname === "/admin";
  }

  if (href === "/") {
    return false;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function IconFrame({ children, active = false }) {
  return (
    <span
      aria-hidden="true"
      style={{
        width: 30,
        height: 30,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        background: active
          ? "var(--color-primary-soft)"
          : "rgba(255,255,255,0.78)",
        color: active ? "var(--app-accent)" : "var(--app-text-muted)",
        border: `1px solid ${active ? "rgba(107,79,58,0.16)" : "rgba(107,79,58,0.08)"}`,
      }}
    >
      {children}
    </span>
  );
}

function GridIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2" y="2" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="9.5" y="2" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="2" y="9.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
        <rect x="9.5" y="9.5" width="4.5" height="4.5" rx="1.2" fill="currentColor" />
      </svg>
    </IconFrame>
  );
}

function KitchenIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 2.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 2.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 2.5C12.1569 2.5 13.5 3.84315 13.5 5.5V13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 7.5H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function OrdersIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 6H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 9H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function WithdrawalIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M6.25 6.25L9.75 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M9.75 6.25L6.25 9.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function ReportsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M3 13.5H13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M4.5 10.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 10.5V3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M11.5 10.5V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function ClaimsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M5 2.5H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M6 2.5H10V4H6V2.5Z" fill="currentColor" />
        <rect x="3" y="3.5" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 7H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 9.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function ContractsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="3" y="2.5" width="10" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.5 5.5H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 8H10.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 10.5H8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function OwnersIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 13C2.9 10.8 4.1 9.5 6 9.5C7.9 9.5 9.1 10.8 9.5 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.5 6.5C11.8807 6.5 13 7.61929 13 9V13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function GlobeIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8 2.5C9.62484 4.08024 10.5476 6.24031 10.5625 8C10.5476 9.75969 9.62484 11.9198 8 13.5C6.37516 11.9198 5.45244 9.75969 5.4375 8C5.45244 6.24031 6.37516 4.08024 8 2.5Z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </IconFrame>
  );
}

function AccountIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M3 13C3.5 10.5 5.1 9.25 8 9.25C10.9 9.25 12.5 10.5 13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function SettingsIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M2.5 4H6M10 4H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="4" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 8H9M13 8H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M2.5 12H4M8 12H13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="6" cy="12" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    </IconFrame>
  );
}

function CatalogAuditIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <rect x="2.75" y="3" width="10.5" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M5.25 6H10.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.25 8.5H8.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10.25 10.75L11.1 11.6L12.75 9.75" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </IconFrame>
  );
}

function UsersIcon({ active }) {
  return (
    <IconFrame active={active}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="5.5" cy="5" r="2.25" stroke="currentColor" strokeWidth="1.5" />
        <path d="M1.5 13.5C2 11.2 3.4 9.75 5.5 9.75C6.6 9.75 7.55 10.15 8.2 10.85" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11.25" cy="5.75" r="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M14.5 13.5C14.15 11.55 12.95 10.25 11.25 10.25C10.35 10.25 9.55 10.6 9 11.15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    </IconFrame>
  );
}

function MenuIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M3 5H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 9H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M3 13H15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M4.5 4.5L13.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M13.5 4.5L4.5 13.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

const topbarLinkStyle = {
  textDecoration: "none",
  borderRadius: 8,
  padding: "11px 16px",
  background: "var(--color-card)",
  color: "var(--app-text)",
  fontWeight: 700,
  border: "1px solid var(--app-border-strong)",
  boxShadow: "var(--app-shadow-soft)",
};

const mobileMenuButtonStyle = {
  width: 44,
  flex: "0 0 44px",
  minHeight: 44,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 8,
  padding: 0,
  background: "var(--color-card)",
  color: "var(--app-text)",
  font: "inherit",
  fontWeight: 800,
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};

const mobileActivePageStyle = {
  minWidth: 0,
  display: "grid",
  gap: 2,
  justifyItems: "end",
  textAlign: "right",
};

const mobileActiveEyebrowStyle = {
  color: "var(--app-text-muted)",
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: "0.08em",
  lineHeight: 1.1,
  textTransform: "uppercase",
};

const mobileSidebarHeaderStyle = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 14,
  padding: "2px 0 16px",
};

const mobileIconButtonStyle = {
  width: 42,
  height: 42,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  border: "1px solid var(--app-border-strong)",
  borderRadius: 8,
  background: "var(--color-card)",
  color: "var(--app-text)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};

const mobileSidebarNavStyle = {
  display: "grid",
  gap: 8,
};

const mobileSidebarLinkStyle = {
  textDecoration: "none",
  display: "flex",
  alignItems: "center",
  gap: 12,
  minWidth: 0,
  minHeight: 54,
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid transparent",
  boxSizing: "border-box",
};

const sidebarLabelStyle = {
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const navBadgeStyle = {
  flex: "0 0 auto",
  marginLeft: "auto",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minWidth: 22,
  height: 22,
  padding: "0 7px",
  borderRadius: 999,
  background: "var(--app-accent)",
  color: "var(--app-accent-contrast)",
  fontSize: 12,
  fontWeight: 900,
  lineHeight: 1,
};
