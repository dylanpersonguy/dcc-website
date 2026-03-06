"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { INVESTOR_THESIS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function InvestorThesis() {
  const { t } = useI18n();
  return (
    <section id="investors" className="relative py-28 overflow-hidden">
      <div className="section-divider" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.investorThesis.badge}
          title={t.investorThesis.title}
          subtitle={t.investorThesis.subtitle}
        />

        <div className="grid md:grid-cols-2 gap-4 max-w-[900px] mx-auto">
          {INVESTOR_THESIS.map((item, i) => (
            <motion.div
              key={item.title}
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="glass-card group"
            >
              <div className="w-10 h-10 rounded-lg bg-secondary/[0.08] flex items-center justify-center mb-5 group-hover:bg-secondary/[0.14] transition-colors duration-300">
                <item.icon className="w-5 h-5 text-secondary" />
              </div>
              <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2.5">
                {t.investorThesis.items[i].title}
              </h3>
              <p className="text-muted text-[13px] leading-relaxed">
                {t.investorThesis.items[i].description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
