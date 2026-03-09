"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV_SECTIONS = [
  {
    label: "General",
    items: [
      { href: "/admin", label: "Overview", icon: "📊" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/blog", label: "Blog Posts", icon: "📝" },
      { href: "/admin/blog/new", label: "New Post", icon: "➕" },
      { href: "/admin/blog/comments", label: "Comments", icon: "💬" },
      { href: "/admin/blog/seo", label: "SEO Dashboard", icon: "🔍" },
    ],
  },
  {
    label: "Automations",
    items: [
      { href: "/admin/automations", label: "GitHub Scanner", icon: "🤖" },
    ],
  },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:sticky top-0 left-0 z-50 h-screen w-64 bg-surface border-r border-white/[0.06] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center gap-3 px-5 border-b border-white/[0.06] shrink-0">
          <Image src="/logo.png" alt="DecentralChain" width={28} height={28} className="rounded-md" />
          <span className="font-heading text-sm font-semibold text-foreground">Admin Dashboard</span>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label}>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                {section.label}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/60 hover:text-foreground hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-white/[0.06] shrink-0">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-foreground/40 hover:text-foreground/70 transition-colors"
          >
            <span>←</span>
            <span>Back to Site</span>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-16 border-b border-white/[0.06] bg-surface/50 backdrop-blur-xl flex items-center px-4 lg:px-6 shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-foreground/60 hover:text-foreground"
            aria-label="Open sidebar"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-xs text-muted">DecentralChain Admin</span>
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">
              A
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
