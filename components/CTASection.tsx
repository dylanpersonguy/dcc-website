"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function CTASection() {
  const { t } = useI18n();
  return (
    <section id="cta" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/[0.04] blur-[120px] pointer-events-none" />

      <div className="relative z-10 max-w-[860px] mx-auto px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="glass-card !p-12 md:!p-16 !rounded-2xl"
        >
          <h2 className="font-heading text-3xl md:text-4xl lg:text-[44px] font-bold leading-[1.1] tracking-[-0.01em]">
            {t.cta.headline}
          </h2>
          <p className="mt-5 text-muted text-[15px] md:text-base max-w-[480px] mx-auto leading-relaxed">
            {t.cta.subtitle}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            <a
              href="https://Decentral.Exchange"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-primary group flex items-center gap-2"
            >
              {t.cta.cta1}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-200" />
            </a>
            <a
              href="https://docs.decentralchain.io"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              {t.cta.cta2}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
