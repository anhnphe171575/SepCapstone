import type { Metadata } from "next";

// SVG Icon cho đăng ký - User với dấu cộng
const registerIconSvg = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ec4899;stop-opacity:1" />
    </linearGradient>
  </defs>
  <circle cx="50" cy="50" r="48" fill="url(#grad)"/>
  <!-- User icon -->
  <circle cx="50" cy="35" r="12" fill="white"/>
  <path d="M30 70 Q30 60 50 60 Q70 60 70 70 L70 75 L30 75 Z" fill="white"/>
  <!-- Plus sign -->
  <rect x="65" y="20" width="18" height="6" rx="3" fill="white"/>
  <rect x="74" y="11" width="6" height="18" rx="3" fill="white"/>
</svg>
`);

export const metadata: Metadata = {
  title: "Đăng ký - SEP Workspace",
  description: "Tạo tài khoản mới để bắt đầu sử dụng SEP Workspace",
  icons: {
    icon: [
      {
        url: `data:image/svg+xml,${registerIconSvg}`,
        type: "image/svg+xml",
      },
    ],
    apple: [
      {
        url: `data:image/svg+xml,${registerIconSvg}`,
        type: "image/svg+xml",
      },
    ],
    shortcut: [
      {
        url: `data:image/svg+xml,${registerIconSvg}`,
        type: "image/svg+xml",
      },
    ],
  },
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

