"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeftRight,
  Repeat,
  Bot,
  Lock,
  ShieldCheck,
  Zap,
  Users,
  BarChart3,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface DefiProduct {
  icon: LucideIcon;
  color: string;
  accentIcon: LucideIcon;
}

const DEFI_PRODUCTS: DefiProduct[] = [
  { icon: ArrowLeftRight, color: "#6C63FF", accentIcon: ShieldCheck },
  { icon: Repeat, color: "#00E5FF", accentIcon: Zap },
  { icon: Bot, color: "#14F195", accentIcon: Users },
  { icon: Lock, color: "#FF6B6B", accentIcon: BarChart3 },
];

export default function DefiEcosystem() {
  const { t } = useI18n();

  return (
    <section id="defi" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.defiEcosystem.badge}
          title={t.defiEcosystem.title}
          subtitle={t.defiEcosystem.subtitle}
        />

        <div className="grid md:grid-cols-2 gap-5">
          {t.defiEcosystem.products.map((product, i) => {
            const { icon: Icon, color, accentIcon: AccentIcon } =
              DEFI_PRODUCTS[i];
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{
                  duration: 0.6,
                  delay: i * 0.1,
                  ease: [0.25, 0.46, 0.45, 0.94],
                }}
                className="glass-card group relative overflow-hidden"
              >
                {/* Top badge row */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full text-[11px] font-semibold tracking-wider uppercase"
                    style={{
                      backgroundColor: `${color}12`,
                      color: color,
                      border: `1px solid ${color}25`,
                    }}
                  >
                    <AccentIcon className="w-3 h-3" />
                    {product.tag}
                  </div>
                </div>

                {/* Icon & Title */}
                <div className="flex items-center gap-3.5 mb-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color }}
                    />
                  </div>
                  <h3 className="font-heading text-[18px] font-bold text-foreground leading-tight">
                    {product.title}
                  </h3>
                </div>

                {/* Description */}
                <p className="text-muted text-[14px] leading-relaxed mb-4">
                  {product.description}
                </p>

                {/* Feature pills */}
                <div className="flex flex-wrap gap-1.5">
                  {product.features.map((feat, fi) => (
                    <span
                      key={fi}
                      className="px-2.5 py-1 rounded-md text-[11px] font-medium"
                      style={{
                        backgroundColor: `${color}08`,
                        color: `${color}cc`,
                        border: `1px solid ${color}18`,
                      }}
                    >
                      {feat}
                    </span>
                  ))}
                </div>

                {/* Bottom accent line */}
                <div
                  className="absolute bottom-0 left-8 right-8 h-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{
                    background: `linear-gradient(90deg, transparent, ${color}40, transparent)`,
                  }}
                />
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
