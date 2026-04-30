import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Test Platform",
  description: "通用自动化测试平台",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh" className="h-full">
      <body className="h-full bg-slate-50 text-gray-900">
        <div className="flex h-full">
          <Sidebar />
          <main className="flex-1 overflow-auto p-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
