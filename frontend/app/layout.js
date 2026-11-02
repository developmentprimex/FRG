import localFont from "next/font/local";
import "./globals.css";
import PublicLegalFooter from "../components/public-legal-footer";

const manrope = localFont({
  src: "./fonts/Manrope-Variable.ttf",
  weight: "400 800",
  style: "normal",
  display: "swap",
});

export const metadata = {
  title: "Fragmento",
  description: "Next.js frontend for the Fragmento kitchen configurator.",
  other: {
    google: "notranslate",
  },
  icons: {
    icon: "/img/architecto-favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="de" translate="no" className="notranslate">
      <body className={manrope.className} suppressHydrationWarning>
        <div className="public-app-shell">
          <div className="public-app-content">{children}</div>
          <PublicLegalFooter />
        </div>
      </body>
    </html>
  );
}
