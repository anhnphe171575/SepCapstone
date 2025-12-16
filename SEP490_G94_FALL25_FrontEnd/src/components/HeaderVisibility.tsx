"use client";
import Header from "@/components/Header";
import { usePathname } from "next/navigation";

export default function HeaderVisibility({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hideHeader =
    pathname === "/login" ||
    pathname === "/register" ||
    pathname === "/forgotpassword" ||
    pathname === "/verify-otp" ||
    pathname === "/reset-password" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/auto-join-team");
  return (
    <>
      {!hideHeader && <Header />}
      {children}
    </>
  );
}