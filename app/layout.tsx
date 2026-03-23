import type { Metadata } from "next";
import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import { CreateTruckLink } from "@/components/CreateTruckLink";
import { HeaderAuthControls } from "@/components/HeaderAuthControls";
import { AuthProvider } from "@/components/providers/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TruckGo Market",
  description: "Cho thuê xe tải theo phong cách marketplace hiện đại",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <AuthProvider>
          <div className="flex min-h-full flex-col">
            <header className="sticky top-0 z-40 border-b border-white/70 bg-[rgba(255,247,240,0.88)] backdrop-blur-xl">
              <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-6 px-4 py-4 sm:px-6 lg:px-8">
                <Link href="/" className="flex items-center gap-3">
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#ff7a18,#ff4d00)] text-sm font-bold text-white shadow-[0_12px_30px_rgba(255,97,39,0.35)]">
                    TG
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-orange-500">
                      TruckGo
                    </p>
                    <p className="text-sm font-medium text-stone-700">
                      Cho thuê xe tải theo ngày
                    </p>
                  </div>
                </Link>

                <nav className="hidden items-center gap-2 rounded-full border border-white/70 bg-white/80 p-1.5 text-sm font-medium text-stone-700 shadow-[0_12px_40px_rgba(41,24,12,0.06)] md:flex">
                  <Link
                    href="/"
                    className="rounded-full px-4 py-2 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    Trang chủ
                  </Link>
                  <Link
                    href="/trucks"
                    className="rounded-full px-4 py-2 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    Danh sách xe
                  </Link>
                  <CreateTruckLink className="rounded-full px-4 py-2 transition hover:bg-orange-50 hover:text-orange-600">
                    Đăng xe
                  </CreateTruckLink>
                  <Link
                    href="/bookings"
                    className="rounded-full px-4 py-2 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    Đơn thuê
                  </Link>
                  <Link
                    href="/profile"
                    className="rounded-full px-4 py-2 transition hover:bg-orange-50 hover:text-orange-600"
                  >
                    Hồ sơ
                  </Link>
                </nav>

                <div className="flex items-center gap-3">
                  <HeaderAuthControls />
                  <CreateTruckLink className="rounded-full bg-stone-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-orange-600 ">
                    Đăng xe ngay
                  </CreateTruckLink>
                </div>
              </div>
            </header>

            <main className="flex-1">{children}</main>

            <footer className="border-t border-white/70 bg-white/80">
              <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-8 text-sm text-stone-600 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
                <p>
                  TruckGo Market - cung cấp dịch vụ thuê xe tải uy tín hàng đầu.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link
                    href="/trucks"
                    className="transition hover:text-orange-600"
                  >
                    Khám phá xe
                  </Link>
                  <Link
                    href="/trucks/create"
                    className="transition hover:text-orange-600"
                  >
                    Trở thành chủ xe
                  </Link>
                  <Link
                    href="/profile"
                    className="transition hover:text-orange-600"
                  >
                    Quản lý profile
                  </Link>
                </div>
              </div>
            </footer>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
