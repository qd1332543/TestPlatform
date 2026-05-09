import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeController from "@/components/ThemeController";

export const metadata: Metadata = {
  title: "MeteorTest",
  description: "通用自动化测试平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="h-full">
      <body className="h-full text-white">
        <ThemeController />
        <div className="app-shell flex h-full">
          <Sidebar />
          <main className="app-main flex-1 overflow-auto p-6 min-w-0">{children}</main>
        </div>
      </body>
    </html>
  );
}
