"use client";

import SectionHeader from "./SectionHeader";
import EcosystemCard from "./EcosystemCard";
import { ECOSYSTEM_MODULES } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

export default function Ecosystem() {
  const { t } = useI18n();
  return (
    <section id="ecosystem" className="relative py-28 overflow-hidden">
      <div className="section-divider" />
      <div className="relative z-10 max-w-[1200px] mx-auto px-6 lg:px-8">
        <SectionHeader
          badge={t.ecosystemSection.badge}
          title={t.ecosystemSection.title}
          subtitle={t.ecosystemSection.subtitle}
        />

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ECOSYSTEM_MODULES.map((mod, i) => (
            <EcosystemCard key={mod.title} {...mod} title={t.ecosystemModules[i].title} description={t.ecosystemModules[i].description} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
