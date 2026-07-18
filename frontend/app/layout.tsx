import type { Metadata } from "next";
import { Newsreader, Fraunces, Source_Serif_4, IBM_Plex_Mono, IBM_Plex_Sans, Noto_Naskh_Arabic } from "next/font/google";
import "./globals.css";

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["300", "400", "600", "700"],
  display: "swap",
});

const sourceSerif = Source_Serif_4({
  variable: "--font-source-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  weight: ["400", "600"],
  display: "swap",
});


const ibmPlexSans = IBM_Plex_Sans({
  variable: "--font-ibm-plex-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

const notoNaskhArabic = Noto_Naskh_Arabic({
  variable: "--font-noto-naskh",
  subsets: ["arabic"],
  weight: ["400"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Munazara — AI Debate Arena",
  description: "Multi-agent AI debate arena. Two models argue, a third judges.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${newsreader.variable} ${fraunces.variable} ${sourceSerif.variable} ${ibmPlexMono.variable} ${ibmPlexSans.variable} ${notoNaskhArabic.variable}`}
    >
      <body style={{ margin: 0, padding: 0, height: "100%", display: "flex", flexDirection: "column" }}>{children}</body>
    </html>
  );
}
