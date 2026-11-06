import type { Metadata } from "next";
import { Manrope, Newsreader } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
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
