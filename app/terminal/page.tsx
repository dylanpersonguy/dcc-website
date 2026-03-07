"use client";

import dynamic from "next/dynamic";

const AnimatedBackground = dynamic(
  () => import("@/components/AnimatedBackground"),
  { ssr: false }
);
const Dashboard = dynamic(() => import("@/components/Dashboard"), {
  ssr: false,
});

export default function TerminalPage() {
  return (
    <>
      <AnimatedBackground />
      <main className="relative z-10">
        <Dashboard />
      </main>
    </>
  );
}
