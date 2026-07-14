import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { APP_NAME, IS_TESTNET } from "@/config/chains";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: `${APP_NAME} — USDC to Arc`,
  description: IS_TESTNET
    ? "Non-custodial USDC bridge to Arc Testnet via Circle CCTP v2"
    : "Non-custodial USDC bridge to Arc via Circle CCTP v2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
