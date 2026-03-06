"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { useI18n } from "@/lib/i18n";

export default function About() {
  const { t } = useI18n();
  return (
    <section id="about" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.about.badge}
          title={t.about.title}
          centered={false}
        />

        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Left column */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="space-y-6"
          >
            <p className="text-muted leading-relaxed text-[15px]">
              {t.about.p1}
            </p>
            <p className="text-muted leading-relaxed text-[15px]">
              {t.about.p2}
            </p>
          </motion.div>

          {/* Right column - Key highlights */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-3"
          >
            {t.about.highlights.map((item, i) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                className="glass-card"
              >
                <h3 className="font-heading text-[13px] font-semibold text-foreground mb-1.5">
                  {item.title}
                </h3>
                <p className="text-muted text-[13px] leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}
