import type { Metadata, Viewport } from "next";
import Script from "next/script";
import "./globals.css";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#141414" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL("https://hyperfix.hypeer.cloud"),
  title: {
    default: "HyperFix - Tout ce dont vous avez besoin. Rien de superflu.",
    template: "%s | HyperFix",
  },
  description:
    "Tout ce dont vous avez besoin. Rien de superflu. Une gestion de projet open source qui travaille pour vous, pas contre vous.",
  keywords: [
    "hyperfix",
    "gestion de projet",
    "open source",
    "kanban",
    "gestion des tâches",
    "auto-hébergé",
    "collaboration d'équipe",
  ],
  applicationName: "HyperFix",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "https://hyperfix.hypeer.cloud",
    siteName: "HyperFix",
    title: "HyperFix - Tout ce dont vous avez besoin. Rien de superflu.",
    description:
      "Gestion de projet open source qui travaille pour vous, pas contre vous. Auto-hébergé, simple et puissant.",
    images: [
      {
        url: "/images/hero.png",
        width: 1200,
        height: 630,
        alt: "HyperFix",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "HyperFix - Tout ce dont vous avez besoin. Rien de superflu.",
    description:
      "Gestion de projet open source qui travaille pour vous, pas contre vous. Auto-hébergé, simple et puissant.",
    images: ["/images/hero.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
  category: "productivity",
  creator: "HyperFix",
  publisher: "HyperFix",
};

const jsonLd = [
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "HyperFix",
    url: "https://hyperfix.hypeer.cloud",
    logo: "https://hyperfix.hypeer.cloud/logo-512.png",
    sameAs: ["https://github.com/samalehzen/hyper"],
  },
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "HyperFix",
    url: "https://hyperfix.hypeer.cloud",
    inLanguage: "fr",
  },
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "HyperFix",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web, Linux, macOS, Windows",
    description:
      "Gestion de projet open source qui travaille pour vous, pas contre vous. Auto-hébergé, simple et puissant.",
    url: "https://hyperfix.hypeer.cloud",
    image: "https://hyperfix.hypeer.cloud/images/hero.png",
    license: "https://github.com/samalehzen/hyper/blob/main/LICENSE",
  },
];

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: This is necessary to apply the user's preferred color scheme before React hydration to prevent a flash of incorrect theme.
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var media = window.matchMedia('(prefers-color-scheme: dark)');
                  function applyTheme(isDark) {
                    document.documentElement.classList.toggle('dark', isDark);
                    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                  }
                  applyTheme(media.matches);
                  if (media.addEventListener) {
                    media.addEventListener('change', function(e) { applyTheme(e.matches); });
                  } else if (media.addListener) {
                    media.addListener(function(e) { applyTheme(e.matches); });
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {children}
        <script
          type="application/ld+json"
          // biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD structured data must be inlined as a script tag for search engines to parse.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Script
          defer
          data-domain="hyperfix.hypeer.cloud"
          src="https://hyperfix.hypeer.cloud/js/script.file-downloads.hash.outbound-links.pageview-props.revenue.tagged-events.js"
          strategy="afterInteractive"
        />
        <Script id="plausible-init" strategy="afterInteractive">
          {
            "window.plausible = window.plausible || function() { (window.plausible.q = window.plausible.q || []).push(arguments) }"
          }
        </Script>
      </body>
    </html>
  );
}
