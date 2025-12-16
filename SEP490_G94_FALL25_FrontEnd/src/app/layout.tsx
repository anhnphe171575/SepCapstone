import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "dhtmlx-gantt/codebase/dhtmlxgantt.css";
import MuiProvider from "./MuiProvider";
import EmotionRegistry from "./EmotionRegistry";
import Header from "@/components/Header";
import { Toaster } from "sonner";
import React from "react";

// Font setup
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SEP Workspace",
  description: "Modern project workspace for milestones, timelines, and collaboration.",
};

// Client component để kiểm tra pathname và ẩn Header ở trang login
// Tách ra file riêng để tránh lỗi hook client trong server component
const HeaderVisibility = React.lazy(() => import("@/components/HeaderVisibility"));

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased font-sans text-[var(--foreground)] bg-white`}
      >
        <EmotionRegistry>
          <MuiProvider>
            <React.Suspense fallback={null}>
              <HeaderVisibility>{children}</HeaderVisibility>
            </React.Suspense>
            <Toaster position="top-right" richColors closeButton />
          </MuiProvider>
        </EmotionRegistry>
      </body>
    </html>
  );
}