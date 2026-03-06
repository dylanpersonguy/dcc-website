"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";
import SectionHeader from "./SectionHeader";
import { FAQ_ITEMS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const { t } = useI18n();

  return (
    <section id="faq" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[700px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.faq.badge}
          title={t.faq.title}
          subtitle={t.faq.subtitle}
        />

        <div className="space-y-2.5">
          {FAQ_ITEMS.map((item, i) => {
            const isOpen = openIndex === i;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="glass-card !rounded-xl overflow-hidden !p-0"
              >
                <button
                  onClick={() => setOpenIndex(isOpen ? null : i)}
                  className="w-full flex items-center justify-between p-5 text-left hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-heading text-[13px] font-medium text-foreground pr-4">
                    {t.faq.items[i].question}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 text-muted text-[13px] leading-relaxed border-t border-white/[0.04] pt-4">
                        {t.faq.items[i].answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
