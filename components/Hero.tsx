"use client";

import { motion } from "framer-motion";
import { HERO_STATS } from "@/lib/constants";
import StatCard from "./StatCard";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useBlockchainData } from "@/hooks/useBlockchainData";

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

function formatNumber(n: number): string {
  return n.toLocaleString();
}

export default function Hero() {
  const { t } = useI18n();
  const { data: chain } = useBlockchainData();
  return (
    <section className="relative min-h-screen flex flex-col justify-center pt-24 pb-20 overflow-hidden">
      {/* Hero-specific radial lighting */}
      <div className="absolute top-[15%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[600px] rounded-full bg-primary/[0.07] blur-[150px] pointer-events-none" />
      <div className="absolute top-[40%] left-[15%] w-[350px] h-[350px] rounded-full bg-secondary/[0.05] blur-[130px] pointer-events-none" />
      <div className="absolute top-[50%] right-[10%] w-[250px] h-[250px] rounded-full bg-accent/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8 text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-primary/90 bg-primary/[0.06] border border-primary/[0.12] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.hero.badge}
          </span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl lg:text-[72px] font-bold leading-[1.05] tracking-[-0.02em] max-w-[900px] mx-auto"
        >
          {t.hero.headline}{" "}
          <span className="text-gradient">{t.hero.headlineHighlight}</span>
        </motion.h1>

        {/* Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55, ease }}
          className="mt-6 text-muted text-[15px] md:text-[17px] lg:text-lg max-w-[580px] mx-auto leading-relaxed"
        >
          {t.hero.subheadline}
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.75, ease }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <a href="#ecosystem" className="btn-primary group flex items-center gap-2">
            {t.hero.cta1}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
          </a>
          <a href="#investors" className="btn-secondary">
            {t.hero.cta2}
          </a>
        </motion.div>

        {/* Protocol mini-panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0, ease }}
          className="mt-16 max-w-[520px] mx-auto"
        >
          <div className="glass-card !p-4 !rounded-xl flex items-center justify-between text-[12px] font-mono max-sm:gap-4 max-sm:flex-wrap max-sm:justify-center">
            <div className="flex items-center gap-2 text-muted">
              <span className={`w-1.5 h-1.5 rounded-full ${chain ? "bg-accent animate-pulse" : "bg-muted"}`} />
              {t.hero.mainnetLive}
            </div>
            <div className="text-muted">
              {t.hero.block} <span className="text-foreground/80 tabular-nums">#{chain ? formatNumber(chain.height) : "···"}</span>
            </div>
            <div className="text-muted">
              {t.hero.tps} <span className="text-accent/80 tabular-nums">{chain ? `${formatNumber(chain.txPerBlock)} tx` : "···"}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1, ease }}
          className="mt-12 grid grid-cols-2 lg:grid-cols-4 gap-3 max-w-[860px] mx-auto"
        >
          {HERO_STATS.map((stat, i) => (
            <StatCard key={stat.label} {...stat} label={t.heroStats.labels[i]} index={i} />
          ))}
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ delay: 2 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown className="w-5 h-5 text-muted" />
        </motion.div>
      </motion.div>
    </section>
  );
}
