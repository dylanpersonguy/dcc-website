import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "DCC Terminal — DecentralChain AI Blockchain Interface",
  description:
    "Interact with the DecentralChain blockchain using natural language. Query blocks, balances, transactions, and network status in real-time.",
};

export default function TerminalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
