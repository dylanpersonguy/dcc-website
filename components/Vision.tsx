"use client";

import { motion } from "framer-motion";
import { useI18n } from "@/lib/i18n";

export default function Vision() {
  const { t } = useI18n();
  return (
    <section id="vision" className="relative py-32 lg:py-40 overflow-hidden">
      <div className="section-divider" />
      {/* Background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-secondary/[0.04] blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 left-1/3 w-[250px] h-[250px] rounded-full bg-primary/[0.03] blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-[900px] mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-primary/90 bg-primary/[0.06] border border-primary/[0.12] mb-8">
            {t.vision.badge}
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="font-heading text-3xl sm:text-4xl md:text-[44px] lg:text-[52px] font-bold leading-[1.1] tracking-[-0.02em]"
        >
          {t.vision.headline}{" "}
          <span className="text-gradient">{t.vision.headlineHighlight}</span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-8 text-muted text-[15px] md:text-base lg:text-lg max-w-[600px] mx-auto leading-relaxed"
        >
          {t.vision.body}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.45 }}
          className="mt-12 flex flex-wrap justify-center gap-10 sm:gap-12"
        >
          {t.vision.pillars.map((v, i) => (
            <motion.div
              key={v.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.5 + i * 0.08 }}
              className="text-center"
            >
              <div className="text-lg font-heading font-semibold text-foreground">
                {v.label}
              </div>
              <div className="text-muted text-[11px] mt-1 tracking-wide">{v.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
