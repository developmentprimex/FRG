import { cookies } from "next/headers";

export default async function AdminLoading() {
  const language = (await cookies()).get("adminLanguage")?.value;
  return (
    <div role="status" aria-live="polite" style={{ padding: "32px", maxWidth: 1200, margin: "0 auto" }}>
      <p>{language === "de" ? "Wird geladen…" : "Loading…"}</p>
      <div aria-hidden="true" style={{ display: "grid", gap: 16 }}>
        {[80, 180, 180].map((height, index) => (
          <div key={index} style={{ height, borderRadius: 8, background: "var(--app-surface-muted, #f1ece6)" }} />
        ))}
      </div>
    </div>
  );
}
