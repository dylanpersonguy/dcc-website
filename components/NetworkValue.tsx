"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { NETWORK_VALUE_LAYERS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function NetworkValue() {
  const { t } = useI18n();
  return (
    <section className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.networkValue.badge}
          title={t.networkValue.title}
          subtitle={t.networkValue.subtitle}
        />

        <div className="max-w-3xl mx-auto space-y-4">
          {NETWORK_VALUE_LAYERS.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, scaleX: 0.3 }}
              whileInView={{ opacity: 1, scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.12, ease: "easeOut" }}
              style={{ width: layer.width, originX: 0.5 }}
              className="mx-auto"
            >
              <div className="glass-card !p-5 hover:border-primary/[0.12] transition-all duration-300 group">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-heading text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                    {t.networkValue.layers[i].label}
                  </h4>
                  <span className="text-[10px] text-muted uppercase tracking-widest">
                    Layer {NETWORK_VALUE_LAYERS.length - i}
                  </span>
                </div>
                <p className="text-muted text-xs">{t.networkValue.layers[i].description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Value indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.8 }}
          className="text-center mt-8"
        >
          <div className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full bg-white/[0.02] border border-white/[0.04] text-[11px] font-mono text-muted tracking-wide">
            {t.networkValue.indicator}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
