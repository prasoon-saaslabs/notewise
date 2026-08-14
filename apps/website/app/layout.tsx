import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { LenisProvider } from "@/components/providers/LenisProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { SITE } from "@/lib/constants";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "NoteWise — The meeting brain that remembers your relationships",
  description: SITE.description,
  metadataBase: new URL("https://notewise.app"),
  openGraph: {
    title: "NoteWise — The meeting brain that remembers your relationships",
    description: SITE.tagline,
    type: "website",
    locale: "en_US",
    siteName: "NoteWise",
    images: [{ url: "/og-image.svg", width: 1200, height: 630, alt: "NoteWise" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NoteWise — The meeting brain that remembers your relationships",
    description: SITE.tagline,
    images: ["/og-image.svg"],
  },
  robots: { index: true, follow: true },
  icons: {
    icon: [{ url: "/logo-mark.svg", type: "image/svg+xml" }],
    apple: [{ url: "/logo-mark.svg", type: "image/svg+xml" }],
  },
};

const themeInitScript = `
try {
  var t = localStorage.getItem("nw-theme");
  if (t === "ocean-mist" || t === "carbon-blue") {
    document.documentElement.dataset.theme = t;
  } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
    document.documentElement.dataset.theme = "carbon-blue";
  } else {
    document.documentElement.dataset.theme = "ocean-mist";
  }
} catch (e) {
  document.documentElement.dataset.theme = "ocean-mist";
}
`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      data-theme="ocean-mist"
      className={`${fraunces.variable} ${dmSans.variable} h-full scroll-smooth antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-paper font-body text-ink">
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ThemeProvider>
          <LenisProvider>{children}</LenisProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
