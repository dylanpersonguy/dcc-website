"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { useI18n } from "@/lib/i18n";

const COLORS = [
  "var(--color-accent)",
  "var(--color-secondary)",
  "var(--color-primary)",
  "var(--color-primary)",
];

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function Architecture() {
  const { t } = useI18n();
  const layers = t.architecture.layers.map((l, i) => ({ ...l, color: COLORS[i] }));
  return (
    <section id="architecture" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.architecture.badge}
          title={t.architecture.title}
          subtitle={t.architecture.subtitle}
        />

        <div className="max-w-[700px] mx-auto space-y-3">
          {layers.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.6, delay: i * 0.12, ease }}
              className="glass-card relative overflow-hidden group"
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: layer.color }}
                    />
                    <h3 className="font-heading text-[14px] font-semibold text-foreground">
                      {layer.label}
                    </h3>
                  </div>
                  <p className="text-muted text-[12px] ml-5 font-mono tracking-wide">
                    {layer.description}
                  </p>
                </div>
                <div className="shrink-0 text-[11px] font-mono text-dim uppercase tracking-wider">
                  L{layers.length - i}
                </div>
              </div>
              {/* Left accent */}
              <div
                className="absolute left-0 top-0 bottom-0 w-px opacity-40"
                style={{ backgroundColor: layer.color }}
              />
            </motion.div>
          ))}
        </div>

        {/* Connecting visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.5, ease }}
          className="mt-12 text-center"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-primary/[0.06] border border-primary/[0.1] text-[12px] font-mono text-primary/80">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {t.architecture.finality}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
