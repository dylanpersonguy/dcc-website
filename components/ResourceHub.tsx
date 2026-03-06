"use client";

import { motion } from "framer-motion";
import SectionHeader from "./SectionHeader";
import { ArrowUpRight, Play, Wallet, Search, Github, FileCode2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const CARD_LINKS = [
  "https://Decentral.Exchange",
  "https://DecentralScan.com",
  "https://github.com/Decentral-America",
  "https://mainnet-node.decentralchain.io/api-docs/index.html",
];

const CARD_ICONS = [Wallet, Search, Github, FileCode2];

const ease: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

export default function ResourceHub() {
  const { t } = useI18n();

  return (
    <section id="hub" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="absolute top-[30%] right-[10%] w-[350px] h-[300px] rounded-full bg-primary/[0.04] blur-[130px] pointer-events-none" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.hub.badge}
          title={t.hub.title}
          subtitle={t.hub.subtitle}
        />

        {/* Resource Cards Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-16">
          {t.hub.cards.map((card, i) => {
            const Icon = CARD_ICONS[i];
            return (
              <motion.a
                key={i}
                href={CARD_LINKS[i]}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: i * 0.08, ease }}
                className="glass-card group !p-6 !rounded-xl flex flex-col justify-between hover:border-primary/20 transition-colors duration-300"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-primary/[0.08] border border-primary/[0.12] flex items-center justify-center mb-4">
                    <Icon className="w-5 h-5 text-primary/80" />
                  </div>
                  <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2">
                    {card.title}
                  </h3>
                  <p className="text-muted text-[13px] leading-relaxed">
                    {card.description}
                  </p>
                </div>
                <div className="mt-5 flex items-center gap-1.5 text-primary/80 text-[12px] font-medium tracking-wide uppercase group-hover:text-primary transition-colors duration-200">
                  {card.cta}
                  <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* Video Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: 0.1, ease }}
          className="glass-card !p-0 !rounded-2xl overflow-hidden"
        >
          <div className="grid lg:grid-cols-5">
            {/* Video Embed */}
            <div className="lg:col-span-3 relative aspect-video lg:aspect-auto">
              <iframe
                src="https://www.youtube.com/embed/2nU-kO6XcOU"
                title="DecentralChain Explainer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="absolute inset-0 w-full h-full"
              />
            </div>
            {/* Video Info */}
            <div className="lg:col-span-2 p-8 lg:p-10 flex flex-col justify-center">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center">
                  <Play className="w-3.5 h-3.5 text-accent fill-accent" />
                </div>
                <span className="text-[11px] font-medium tracking-[0.08em] uppercase text-accent/80">
                  Explainer
                </span>
              </div>
              <h3 className="font-heading text-xl md:text-2xl font-bold text-foreground leading-tight">
                {t.hub.videoTitle}
              </h3>
              <p className="mt-3 text-muted text-[13px] md:text-sm leading-relaxed">
                {t.hub.videoSubtitle}
              </p>
              <a
                href="https://www.youtube.com/watch?v=2nU-kO6XcOU"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-6 inline-flex items-center gap-2 text-accent text-[13px] font-medium hover:text-accent/80 transition-colors duration-200 w-fit"
              >
                <Play className="w-4 h-4 fill-current" />
                {t.hub.watchVideo}
              </a>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
