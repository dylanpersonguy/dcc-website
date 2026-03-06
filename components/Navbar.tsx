"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Sun, Moon, Globe } from "lucide-react";
import { NAV_LINKS } from "@/lib/constants";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import { useTheme } from "@/lib/theme";

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();

  const navLabels = [t.nav.about, t.nav.features, t.nav.ecosystem, t.nav.investors, t.nav.roadmap, t.nav.vision];

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close lang dropdown on outside click
  useEffect(() => {
    if (!langOpen) return;
    const close = () => setLangOpen(false);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [langOpen]);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? "bg-background/70 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_4px_30px_rgba(0,0,0,0.3)]"
          : "bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-[72px]">
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 group">
            <div className="relative w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center overflow-hidden">
              <span className="relative z-10 text-background font-bold text-xs tracking-tight">DC</span>
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <span className="font-heading text-[17px] font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
              {t.nav.brand}
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-1">
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                className="relative px-4 py-2 text-[13px] text-muted hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.03]"
              >
                {navLabels[i]}
              </a>
            ))}

            {/* Language Selector */}
            <div className="relative ml-2">
              <button
                onClick={(e) => { e.stopPropagation(); setLangOpen(!langOpen); }}
                className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-muted hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.03]"
                aria-label="Change language"
              >
                <Globe className="w-3.5 h-3.5" />
                {LOCALE_LABELS[locale]}
              </button>
              <AnimatePresence>
                {langOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full right-0 mt-1 py-1 rounded-lg border border-white/[0.06] bg-background/90 backdrop-blur-xl shadow-lg min-w-[80px] overflow-hidden"
                  >
                    {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                      <button
                        key={l}
                        onClick={() => { setLocale(l); setLangOpen(false); }}
                        className={`block w-full text-left px-4 py-1.5 text-[12px] transition-colors ${
                          locale === l ? "text-primary" : "text-muted hover:text-foreground hover:bg-white/[0.03]"
                        }`}
                      >
                        {LOCALE_LABELS[l]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="ml-1 p-2 text-muted hover:text-foreground transition-colors duration-200 rounded-lg hover:bg-white/[0.03]"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <div className="ml-3">
              <a
                href="#cta"
                className="btn-primary inline-flex items-center gap-2 !py-2.5 !px-5 !text-[13px]"
              >
                {t.nav.getStarted}
              </a>
            </div>
          </div>

          {/* Mobile controls */}
          <div className="flex items-center gap-1 lg:hidden">
            <button
              onClick={toggleTheme}
              className="p-2 text-muted hover:text-foreground transition-colors rounded-lg"
              aria-label="Toggle theme"
            >
              {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setIsMobileOpen(!isMobileOpen)}
              className="text-foreground p-2 rounded-lg hover:bg-white/[0.03] transition-colors"
              aria-label="Toggle menu"
            >
              {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="lg:hidden bg-background/90 backdrop-blur-2xl border-t border-white/[0.04] overflow-hidden"
          >
            <div className="px-6 py-6 space-y-1">
              {NAV_LINKS.map((link, i) => (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setIsMobileOpen(false)}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="block text-muted hover:text-foreground transition-colors py-3 px-3 rounded-lg hover:bg-white/[0.03]"
                >
                  {navLabels[i]}
                </motion.a>
              ))}

              {/* Mobile language picker */}
              <div className="pt-3 pb-1 flex items-center gap-2 px-3">
                <Globe className="w-3.5 h-3.5 text-muted" />
                {(Object.keys(LOCALE_LABELS) as Locale[]).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLocale(l)}
                    className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-colors ${
                      locale === l
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground"
                    }`}
                  >
                    {LOCALE_LABELS[l]}
                  </button>
                ))}
              </div>

              <div className="pt-4">
                <a
                  href="#cta"
                  onClick={() => setIsMobileOpen(false)}
                  className="btn-primary block text-center"
                >
                  {t.nav.getStarted}
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
}
