import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ThemeController from "@/components/ThemeController";
import { getLocale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "MeteorTest",
  description: "General-purpose automation testing platform",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale()

  return (
    <html lang={locale} className="h-full">
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
