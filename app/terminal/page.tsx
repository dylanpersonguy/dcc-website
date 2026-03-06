"use client";

import dynamic from "next/dynamic";
import Navbar from "@/components/Navbar";

const AnimatedBackground = dynamic(
  () => import("@/components/AnimatedBackground"),
  { ssr: false }
);
const TerminalChat = dynamic(() => import("@/components/TerminalChat"), {
  ssr: false,
});

export default function TerminalPage() {
  return (
    <>
      <AnimatedBackground />
      <Navbar />
      <main className="relative z-10 pt-[72px]">
        <TerminalChat />
      </main>
    </>
  );
}
