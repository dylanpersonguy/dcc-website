"use client";

import SectionHeader from "./SectionHeader";
import FeatureCard from "./FeatureCard";
import { FEATURES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function WhyDecentralChain() {
  const { t } = useI18n();
  return (
    <section id="features" className="relative py-28 overflow-hidden">
      <div className="section-divider" />

      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.whyDC.badge}
          title={t.whyDC.title}
          subtitle={t.whyDC.subtitle}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature, i) => (
            <FeatureCard key={feature.title} {...feature} title={t.features[i].title} description={t.features[i].description} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
