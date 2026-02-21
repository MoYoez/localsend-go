"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useLanguage } from "../context/LanguageContext";
import { NotifyProvider } from "../context/NotifyContext";
import { LuSendToBack, LuSettings, LuInfo, LuShare2, LuDownload } from "react-icons/lu";
import { ConfirmReceiveModal } from "./components/ConfirmReceiveModal";
import { ConfirmDownloadModal } from "./components/ConfirmDownloadModal";
import { TextReceivedModal } from "./components/TextReceivedModal";
import { ReceiveProgressPanel } from "./components/ReceiveProgressPanel";
import { ReceiveHistoryPanel } from "./components/ReceiveHistoryPanel";
import { NotifyToasts } from "./components/NotifyToasts";
import { ManageGate } from "./components/ManageGate";

const nav = [
  { href: "/", labelKey: "nav.download", icon: LuDownload },
  { href: "/manage", labelKey: "nav.manage", icon: LuSendToBack },
  { href: "/manage/settings", labelKey: "nav.settings", icon: LuSettings },
  { href: "/manage/about", labelKey: "nav.about", icon: LuInfo },
  { href: "/manage/share", labelKey: "nav.share", icon: LuShare2 },
];

export default function ManageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <NotifyProvider>
      <ManageGate>
        <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950">
          <header className="sticky top-0 z-10 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur">
            <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
              <nav className="flex items-center gap-1 flex-wrap">
                {nav.map(({ href, labelKey, icon: Icon }) => {
                  const isActive =
                    href === "/"
                      ? pathname === "/"
                      : href === "/manage"
                        ? pathname === "/manage"
                        : pathname.startsWith(href);
                  return (
                    <Link
                      key={href}
                      href={href}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
                          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t(labelKey)}</span>
                    </Link>
                  );
                })}
              </nav>
              <LanguageSwitcher />
            </div>
          </header>
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6">
            <ReceiveProgressPanel />
            <ReceiveHistoryPanel />
            {children}
          </main>
          <ConfirmReceiveModal />
          <ConfirmDownloadModal />
          <TextReceivedModal />
          <NotifyToasts />
        </div>
      </ManageGate>
    </NotifyProvider>
  );
}
