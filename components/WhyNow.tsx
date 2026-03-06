"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { TrendingUp, Globe, ShieldCheck, Zap } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ICONS = [TrendingUp, Globe, ShieldCheck, Zap];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function WhyNow() {
  const { t } = useI18n();
  const reasons = t.whyNow.reasons.map((r, i) => ({ ...r, icon: ICONS[i] }));
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.whyNow.badge}
          title={t.whyNow.title}
          subtitle={t.whyNow.subtitle}
        />

        <div className="grid md:grid-cols-2 gap-4">
          {reasons.map((reason, i) => {
            const Icon = reason.icon;
            return (
              <motion.div
                key={reason.title}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.6, delay: i * 0.1, ease }}
                className="glass-card group flex gap-5"
              >
                <div className="shrink-0 w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center group-hover:bg-primary/[0.14] transition-colors duration-300">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2">
                    {reason.title}
                  </h3>
                  <p className="text-muted text-[13px] leading-relaxed">
                    {reason.description}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
