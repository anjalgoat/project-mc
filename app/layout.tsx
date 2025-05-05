// src/app/layout.tsx
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google"; // Assuming you still want these fonts globally
import "./globals.css";
import ConvexClientProvider from "@/components/ConvexClientProvider"; // Assuming path is correct

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "My Convex + Clerk App",
  description: "A Next.js app using Convex and Clerk",
  icons: {
    icon: "/convex.svg", // Make sure this path is correct in /public
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        {/* Apply fonts to the body or html tag */}
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {/* Providers wrap the children directly */}
          <ConvexClientProvider>{children}</ConvexClientProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}