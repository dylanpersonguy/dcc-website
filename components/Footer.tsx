"use client";

import Image from "next/image";
import { NAV_LINKS } from "@/lib/constants";
import { useI18n } from "@/lib/i18n";

const RESOURCE_URLS = [
  "https://docs.decentralchain.io",
  "https://docs.decentralchain.io",
  "https://DecentralScan.com",
  "https://github.com/Decentral-America",
  "#",
];

const COMMUNITY_URLS = [
  "https://x.com/decaborachain",
  "https://discord.gg/decentralchain",
  "https://t.me/decentralchain",
  "https://medium.com/@decentralchain",
  "https://linkedin.com/company/decentralchain",
];

export default function Footer() {
  const { t } = useI18n();
  const navLabels = [t.nav.about, t.nav.features, t.nav.ecosystem, t.nav.investors, t.nav.roadmap, t.nav.vision];
  return (
    <footer className="relative border-t border-white/[0.04] py-16">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5 mb-4">
              <Image
                src="/logo.png"
                alt="DecentralChain"
                width={32}
                height={32}
                className="rounded-lg"
              />
              <span className="font-heading text-[17px] font-semibold text-foreground">
                {t.footer.brand}
              </span>
            </div>
            <p className="text-muted text-[13px] leading-relaxed max-w-xs">
              {t.footer.tagline}
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h4 className="font-heading text-[12px] font-semibold text-foreground uppercase tracking-wider mb-4">
              {t.footer.navigation}
            </h4>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((link, i) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-muted text-[13px] hover:text-foreground transition-colors duration-200"
                  >
                    {navLabels[i]}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-heading text-[12px] font-semibold text-foreground uppercase tracking-wider mb-4">
              {t.footer.resources}
            </h4>
            <ul className="space-y-2.5">
              {t.footer.resourceLinks.map((item, i) => (
                <li key={item}>
                  <a
                    href={RESOURCE_URLS[i]}
                    target={RESOURCE_URLS[i].startsWith("#") ? undefined : "_blank"}
                    rel={RESOURCE_URLS[i].startsWith("#") ? undefined : "noopener noreferrer"}
                    className="text-muted text-[13px] hover:text-foreground transition-colors duration-200"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Community */}
          <div>
            <h4 className="font-heading text-[12px] font-semibold text-foreground uppercase tracking-wider mb-4">
              {t.footer.community}
            </h4>
            <ul className="space-y-2.5">
              {t.footer.communityLinks.map((item, i) => (
                <li key={item}>
                  <a
                    href={COMMUNITY_URLS[i]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted text-[13px] hover:text-foreground transition-colors duration-200"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-muted/60 text-[11px]">
            &copy; {new Date().getFullYear()} {t.footer.copyright}
          </p>
          <div className="flex items-center gap-6">
            {t.footer.legalLinks.map((item) => (
              <a
                key={item}
                href="#"
                className="text-muted/60 text-[11px] hover:text-foreground transition-colors duration-200"
              >
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
