"use client";

import { motion } from "framer-motion";
import { ROADMAP_PHASES } from "@/lib/constants";
import SectionHeader from "./SectionHeader";
import { Check, Circle, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export default function Roadmap() {
  const { t } = useI18n();
  return (
    <section id="roadmap" className="relative py-28 overflow-hidden">
      <div className="section-divider" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.roadmap.badge}
          title={t.roadmap.title}
          subtitle={t.roadmap.subtitle}
        />

        <div className="relative max-w-4xl mx-auto">
          {/* Timeline line */}
          <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-secondary/40 to-transparent" />

          {ROADMAP_PHASES.map((phase, i) => {
            const isLeft = i % 2 === 0;
            const StatusIcon =
              phase.status === "completed"
                ? Check
                : phase.status === "active"
                ? Clock
                : Circle;
            const statusColor =
              phase.status === "completed"
                ? "text-accent bg-accent/20 border-accent/30"
                : phase.status === "active"
                ? "text-primary bg-primary/20 border-primary/30"
                : "text-muted bg-surface border-white/10";

            return (
              <motion.div
                key={phase.phase}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`relative flex items-start mb-12 last:mb-0 ${
                  isLeft ? "md:flex-row" : "md:flex-row-reverse"
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 -translate-x-1/2 z-10">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${statusColor}`}
                  >
                    <StatusIcon className="w-4 h-4" />
                  </div>
                </div>

                {/* Content */}
                <div
                  className={`ml-14 md:ml-0 md:w-[calc(50%-2rem)] ${
                    isLeft ? "md:pr-8 md:text-right" : "md:pl-8"
                  }`}
                >
                  <div className="glass-card transition-all duration-300">
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      <span className="text-xs font-medium text-primary uppercase tracking-wider">
                        {t.roadmap.phases[i].phase}
                      </span>
                      <span className="text-xs text-muted">{t.roadmap.phases[i].period}</span>
                    </div>
                    <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2">
                      {t.roadmap.phases[i].title}
                    </h3>
                    <ul
                      className={`space-y-1.5 ${
                        isLeft ? "md:text-right" : ""
                      }`}
                    >
                      {t.roadmap.phases[i].items.map((item) => (
                        <li
                          key={item}
                          className="text-muted text-[13px] flex items-center gap-2"
                          style={{
                            justifyContent: isLeft ? undefined : undefined,
                          }}
                        >
                          <span className="w-1 h-1 rounded-full bg-primary/60 shrink-0" />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
