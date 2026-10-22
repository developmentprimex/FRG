import Link from "next/link";

export const metadata = {
  title: "Seite nicht gefunden | Fragmento",
};

export default function NotFound() {
  return (
    <main style={{ minHeight: "65vh", display: "grid", placeItems: "center", padding: "32px 20px" }}>
      <div style={{ textAlign: "center", maxWidth: 480 }}>
        <p style={{ margin: "0 0 12px", color: "var(--app-text-muted)", fontSize: 14 }}>404</p>
        <h1 style={{ margin: "0 0 12px", fontSize: 28 }}>Seite nicht gefunden</h1>
        <p style={{ margin: "0 0 24px", color: "var(--app-text-muted)", lineHeight: 1.6 }}>
          Die angeforderte Seite ist nicht verfügbar.
        </p>
        <Link href="/" style={{ color: "var(--app-accent)", textUnderlineOffset: 4 }}>Zur Startseite</Link>
      </div>
    </main>
  );
}
