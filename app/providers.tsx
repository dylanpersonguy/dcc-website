"use client";

import { type ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { WalletProvider } from "@/lib/wallet-context";

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <WalletProvider>{children}</WalletProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
