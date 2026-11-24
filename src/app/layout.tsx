import type { Metadata } from "next";
import localFont from "next/font/local";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const newsreader = localFont({
  src: "./fonts/newsreader-variable.ttf",
  variable: "--font-newsreader",
  weight: "400 500",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

const manrope = localFont({
  src: "./fonts/manrope-variable.ttf",
  variable: "--font-manrope",
  weight: "200 800",
  display: "swap",
  adjustFontFallback: "Arial",
});

export const metadata: Metadata = {
  title: "Coinciente",
  description: "Clareza para cuidar do que é seu.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${newsreader.variable} ${manrope.variable}`}>
      <body>
        <div className="root">
          <MotionProvider>{children}</MotionProvider>
        </div>
      </body>
    </html>
  );
}
