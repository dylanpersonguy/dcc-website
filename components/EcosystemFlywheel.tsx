"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { Code2, AppWindow, Users, TrendingUp } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const ICONS = [Code2, AppWindow, Users, TrendingUp];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function EcosystemFlywheel() {
  const { t } = useI18n();
  const stages = t.flywheel.stages.map((s, i) => ({ ...s, icon: ICONS[i] }));
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.flywheel.badge}
          title={t.flywheel.title}
          subtitle={t.flywheel.subtitle}
        />

        <div className="max-w-[800px] mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {stages.map((stage, i) => {
              const Icon = stage.icon;
              return (
                <motion.div
                  key={stage.title}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-40px" }}
                  transition={{ duration: 0.5, delay: i * 0.12, ease }}
                  className="glass-card text-center relative"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center mx-auto mb-3">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading text-[13px] font-semibold text-foreground mb-1.5">
                    {stage.title}
                  </h3>
                  <p className="text-muted text-[12px] leading-relaxed">
                    {stage.description}
                  </p>
                  {/* Connector dot on larger screens */}
                  {i < stages.length - 1 && (
                    <div className="hidden lg:block absolute -right-[7px] top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-dim z-10" />
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Loop indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="mt-6 flex justify-center"
          >
            <div className="flex items-center gap-2 text-[11px] font-mono text-muted">
              <span className="w-8 h-px bg-dim" />
              {t.flywheel.loop}
              <span className="w-8 h-px bg-dim" />
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
