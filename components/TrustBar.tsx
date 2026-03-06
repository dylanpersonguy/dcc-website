"use client";

import { motion } from "framer-motion";
import { TRUST_ITEMS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function TrustBar() {
  const { t } = useI18n();
  return (
    <section className="relative py-14 border-y border-white/[0.04]">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="flex flex-wrap justify-center gap-8 md:gap-12 lg:gap-16"
        >
          {TRUST_ITEMS.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="flex items-center gap-2.5 text-muted/70 hover:text-foreground transition-colors duration-300"
            >
              <item.icon className="w-4 h-4" />
              <span className="text-[12px] font-medium whitespace-nowrap tracking-wide">
                {t.trustItems.labels[i]}
              </span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
