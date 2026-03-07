"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { getAccountFromSeed, isValidSeed, type WalletAccount } from "./wallet";

interface WalletContextValue {
  account: WalletAccount | null;
  isConnected: boolean;
  connect: (seed: string) => boolean;
  disconnect: () => void;
  /** The seed is stored in memory only — never persisted */
  getSeed: () => string | null;
}

const WalletContext = createContext<WalletContextValue>({
  account: null,
  isConnected: false,
  connect: () => false,
  disconnect: () => {},
  getSeed: () => null,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<WalletAccount | null>(null);
  // Seed stored in closure via ref-like approach — never written to storage
  const [seed, setSeed] = useState<string | null>(null);

  const connect = useCallback((phrase: string): boolean => {
    if (!isValidSeed(phrase)) return false;
    const acct = getAccountFromSeed(phrase);
    setAccount(acct);
    setSeed(phrase);
    return true;
  }, []);

  const disconnect = useCallback(() => {
    setAccount(null);
    setSeed(null);
  }, []);

  const getSeed = useCallback(() => seed, [seed]);

  return (
    <WalletContext.Provider
      value={{ account, isConnected: !!account, connect, disconnect, getSeed }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
