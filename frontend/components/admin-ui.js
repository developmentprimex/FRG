import Link from "next/link";

export function PageHero({ eyebrow, title, description, actions, stats }) {
  return (
    <section
      style={{
        borderRadius: "var(--admin-radius-card, 22px)",
        padding: "32px",
        background: "var(--app-hero-overlay), var(--app-hero-gradient)",
        color: "var(--app-accent-contrast)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        gap: 24,
        boxShadow: "var(--app-shadow)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 10 }}>
          {eyebrow ? <span style={eyebrowStyle}>{eyebrow}</span> : null}
          <h1 style={{ margin: 0, fontSize: "clamp(2.2rem, 4vw, 3.75rem)", lineHeight: 0.95, letterSpacing: "-0.02em" }}>{title}</h1>
          {description ? (
            <p style={{ margin: 0, maxWidth: 720, color: "rgba(255,255,255,0.78)", lineHeight: 1.7 }}>{description}</p>
          ) : null}
        </div>
        {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
      </div>
      {stats?.length ? <div style={metricGridStyle}>{stats}</div> : null}
    </section>
  );
}

export function AdminSection({ title, description, actions, children, compact = false }) {
  return (
    <section style={compact ? { ...panelStyle, padding: 14, gap: 10 } : panelStyle}>
      {(title || description || actions) ? (
        <div style={compact ? { ...sectionHeaderStyle, gap: 8 } : sectionHeaderStyle}>
          <div style={{ display: "grid", gap: compact ? 3 : 6 }}>
            {title ? <h2 style={{ margin: 0, fontSize: compact ? 20 : "var(--admin-text-title, 1.5rem)", lineHeight: 1.3, fontWeight: 700, color: "var(--app-text)", letterSpacing: "-0.02em" }}>{title}</h2> : null}
            {description ? <p style={compact ? { ...mutedTextStyle, fontSize: 12, lineHeight: 1.4 } : mutedTextStyle}>{description}</p> : null}
          </div>
          {actions ? <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function FlashMessage({ tone, message }) {
  const palette =
    tone === "error"
      ? { color: "var(--app-danger-text)", background: "linear-gradient(135deg, var(--app-danger-bg), rgba(255,255,255,0.92))", border: "rgba(180, 71, 57, 0.18)" }
      : { color: "var(--app-success-text)", background: "linear-gradient(135deg, var(--app-success-bg), rgba(255,255,255,0.92))", border: "rgba(53, 113, 88, 0.18)" };

  return (
    <div
      suppressHydrationWarning
      style={{
        color: palette.color,
        background: palette.background,
        border: `1px solid ${palette.border}`,
        borderRadius: "var(--admin-radius-card, 16px)",
        padding: "14px 18px",
        boxShadow: "var(--app-shadow-soft)",
      }}
    >
      {message}
    </div>
  );
}

export function MetricCard({ label, value, detail }) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderRadius: "var(--admin-radius-card, 18px)",
        background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08)",
        backdropFilter: "blur(6px)",
      }}
    >
      <div style={{ fontSize: "var(--admin-text-label, 0.75rem)", color: "rgba(255,255,255,0.68)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
        {label}
      </div>
      <strong style={{ fontSize: "2.3rem", lineHeight: 1, letterSpacing: "-0.03em" }}>{value}</strong>
      {detail ? <div style={{ marginTop: 8, fontSize: "var(--admin-text-meta, 0.8125rem)", color: "rgba(255,255,255,0.72)" }}>{detail}</div> : null}
    </div>
  );
}

export function FormField({ label, children, wide = false }) {
  return (
    <label style={{ ...fieldStyle, gridColumn: wide ? "1 / -1" : "auto" }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ActionLink({ href, children, secondary = false, scroll }) {
  return (
    <Link href={href} scroll={scroll} style={secondary ? secondaryLinkStyle : linkButtonStyle}>
      {children}
    </Link>
  );
}

export function StatusBadge({ status }) {
  const label = status === "CONFIRMED" ? "CONFIRMED / EMAILED" : status;
  return <span style={statusPill(status)}>{label}</span>;
}

export function StatusBadgeLabel({ status, label }) {
  return <span style={statusPill(status)}>{label}</span>;
}

export function TypeBadge({ label }) {
  return <span style={typePillStyle}>{label}</span>;
}

export const pageGridStyle = { display: "grid", gap: 24, minWidth: 0, gridTemplateColumns: "minmax(0, 1fr)" };
export const splitGridStyle = {
  display: "grid",
  gap: 24,
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  alignItems: "start",
};
export const formGridStyle = {
  display: "grid",
  gap: 16,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const denseGridStyle = {
  display: "grid",
  gap: 14,
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
};
export const checkboxRowStyle = { display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" };
export const actionRowStyle = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
export const tableWrapStyle = {
  minWidth: 0,
  maxWidth: "100%",
  overflowX: "auto",
  borderRadius: "var(--admin-radius-table, 18px)",
  border: "1px solid var(--app-border)",
  background: "var(--color-card)",
  boxShadow: "var(--app-shadow-soft)",
};
export const tableStyle = {
  width: "100%",
  borderCollapse: "collapse",
  background: "var(--app-surface)",
  tableLayout: "fixed",
};
export const thStyle = {
  textAlign: "left",
  padding: "16px 20px",
  fontSize: "var(--admin-text-label, 0.75rem)",
  color: "var(--app-text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.12em",
  borderBottom: "1px solid var(--app-border)",
  background: "var(--app-surface-muted)",
  fontWeight: 700,
  overflowWrap: "anywhere",
};
export const tdStyle = {
  fontSize: "var(--admin-text-body, 0.875rem)",
  lineHeight: 1.5,
  fontVariantNumeric: "tabular-nums",
  padding: "20px",
  borderBottom: "1px solid var(--app-border)",
  color: "var(--app-text)",
  verticalAlign: "top",
  overflowWrap: "anywhere",
};
export const inputStyle = {
  fontFamily: "inherit",
  fontWeight: 400,
  lineHeight: 1.5,
  letterSpacing: "normal",
  textTransform: "none",
  width: "100%",
  minHeight: 52,
  borderRadius: "var(--admin-radius-card, 14px)",
  border: "1px solid var(--app-border-strong)",
  background: "var(--color-card)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "var(--admin-text-body, 0.875rem)",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
};
export const textareaStyle = {
  width: "100%",
  borderRadius: "var(--admin-radius-card, 14px)",
  border: "1px solid var(--app-border-strong)",
  background: "var(--color-card)",
  padding: "13px 15px",
  color: "var(--app-text)",
  fontSize: "var(--admin-text-body, 0.875rem)",
  resize: "vertical",
  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.8)",
};
export const primaryButtonStyle = {
  border: "1px solid var(--color-primary)",
  borderRadius: "var(--admin-radius-card, 14px)",
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--color-primary)",
  color: "var(--app-accent-contrast)",
  fontWeight: 700,
  fontSize: "var(--admin-text-body, 0.875rem)",
  cursor: "pointer",
  boxShadow: "0 12px 24px rgba(84, 59, 40, 0.14)",
};
export const secondaryButtonStyle = {
  border: "1px solid var(--app-border-strong)",
  borderRadius: "var(--admin-radius-card, 14px)",
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  fontWeight: 700,
  fontSize: "var(--admin-text-body, 0.875rem)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};
export const dangerButtonStyle = {
  border: "1px solid rgba(217, 92, 92, 0.24)",
  borderRadius: "var(--admin-radius-card, 14px)",
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--app-danger-bg)",
  color: "var(--app-danger-text)",
  fontWeight: 700,
  fontSize: "var(--admin-text-body, 0.875rem)",
  cursor: "pointer",
  boxShadow: "var(--app-shadow-soft)",
};
export const mutedTextStyle = { fontSize: "var(--admin-text-body, 0.875rem)", margin: 0, color: "var(--app-text-muted)", lineHeight: 1.6 };
export const subMetaStyle = { display: "flex", gap: 10, flexWrap: "wrap", color: "var(--app-text-muted)", fontSize: "var(--admin-text-body, 0.875rem)" };
export const cardListStyle = { display: "grid", gap: 16 };
export const itemCardStyle = {
  border: "1px solid var(--app-border)",
  borderRadius: "var(--admin-radius-card, 18px)",
  padding: 20,
  background: "var(--color-card)",
  display: "grid",
  gap: 16,
  boxShadow: "var(--app-shadow-soft)",
};
export const itemHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  gap: 16,
  flexWrap: "wrap",
};
export const emptyStateStyle = { margin: 0, color: "var(--app-text-muted)" };
export const codePillStyle = {
  display: "inline-flex",
  padding: "8px 10px",
  borderRadius: 999,
  background: "var(--app-accent-soft)",
  color: "var(--app-accent)",
  fontSize: "var(--admin-text-meta, 0.8125rem)",
  fontWeight: 700,
  border: "1px solid rgba(107, 79, 58, 0.14)",
};

const panelStyle = {
  minWidth: 0,
  gridTemplateColumns: "minmax(0, 1fr)",
  borderRadius: "var(--admin-radius-card, 20px)",
  padding: 24,
  background: "var(--color-card)",
  border: "1px solid var(--app-border)",
  display: "grid",
  gap: 20,
  boxShadow: "var(--app-shadow-soft)",
};

const sectionHeaderStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 16,
  flexWrap: "wrap",
};

const fieldStyle = {
  display: "grid",
  gap: 8,
  color: "var(--app-text)",
  fontWeight: 700,
};

const metricGridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 14,
};

const eyebrowStyle = {
  display: "inline-flex",
  width: "fit-content",
  padding: "7px 12px",
  borderRadius: 999,
  background: "rgba(255,255,255,0.14)",
  color: "rgba(255,248,242,0.84)",
  fontSize: "var(--admin-text-label, 0.75rem)",
  fontWeight: 700,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
};

const linkButtonStyle = {
  textDecoration: "none",
  borderRadius: "var(--admin-radius-card, 14px)",
  minHeight: 50,
  padding: "13px 18px",
  background: "var(--color-card)",
  color: "var(--app-accent)",
  border: "1px solid var(--app-border)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  boxShadow: "var(--app-shadow-soft)",
};

const secondaryLinkStyle = {
  textDecoration: "none",
  borderRadius: "var(--admin-radius-card, 14px)",
  minHeight: 50,
  padding: "13px 18px",
  background: "rgba(255,255,255,0.1)",
  color: "var(--app-accent-contrast)",
  border: "1px solid rgba(255,255,255,0.24)",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
};

function statusPill(status) {
  const base = {
    display: "inline-flex",
    padding: "8px 12px",
    borderRadius: 999,
    fontSize: "var(--admin-text-label, 0.75rem)",
    fontWeight: 700,
    letterSpacing: "0.06em",
    whiteSpace: "nowrap",
  };

  if (status === "ACTIVE" || status === "CONFIRMED") {
    return { ...base, background: "var(--app-success-bg)", color: "var(--app-success-text)", border: "1px solid rgba(63, 166, 107, 0.2)" };
  }

  if (status === "ARCHIVED" || status === "CANCELLED") {
    const tone = status === "CANCELLED"
      ? { background: "var(--app-danger-bg)", color: "var(--app-danger-text)", border: "1px solid rgba(217, 92, 92, 0.2)" }
      : { background: "var(--app-neutral-bg)", color: "var(--app-neutral-text)", border: "1px solid rgba(122, 109, 97, 0.14)" };
    return { ...base, ...tone };
  }

  if (status === "EMAILED") {
    return { ...base, background: "var(--app-info-bg)", color: "var(--app-info-text)", border: "1px solid rgba(74, 125, 218, 0.18)" };
  }

  return { ...base, background: "var(--app-warning-bg)", color: "var(--app-warning-text)", border: "1px solid rgba(230, 162, 60, 0.18)" };
}

const typePillStyle = {
  background: "var(--app-secondary-soft)",
  color: "var(--app-accent)",
  borderRadius: 999,
  padding: "7px 12px",
  fontSize: "var(--admin-text-label, 0.75rem)",
  fontWeight: 700,
  border: "1px solid rgba(91, 141, 239, 0.16)",
};
