"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { useI18n } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

export default function SocialProof() {
  const { t } = useI18n();
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.socialProof.badge}
          title={t.socialProof.title}
          subtitle={t.socialProof.subtitle}
        />

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {t.socialProof.logos.map((name, i) => (
            <motion.div
              key={name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.06, ease }}
              className="glass-card flex items-center justify-center group h-16"
            >
              <span className="text-[13px] font-medium text-muted group-hover:text-foreground transition-colors duration-300 text-center">
                {name}
              </span>
            </motion.div>
          ))}
        </div>

        {/* Trust metric row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.4, ease }}
          className="mt-10 flex flex-wrap items-center justify-center gap-8 text-center"
        >
          {t.socialProof.metrics.map((item) => (
            <div key={item.label}>
              <div className="font-heading text-xl font-bold text-foreground">
                {item.value}
              </div>
              <div className="text-[11px] text-muted tracking-wide uppercase">
                {item.label}
              </div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
