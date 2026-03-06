"use client";

import { motion } from "framer-motion";

interface SectionHeaderProps {
  badge?: string;
  title: string;
  subtitle?: string;
  centered?: boolean;
}

export default function SectionHeader({
  badge,
  title,
  subtitle,
  centered = true,
}: SectionHeaderProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={`mb-16 ${centered ? "text-center" : ""}`}
    >
      {badge && (
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-[11px] font-medium tracking-[0.08em] uppercase text-primary/90 bg-primary/[0.06] border border-primary/[0.12] mb-6">
          {badge}
        </span>
      )}
      <h2 className="font-heading text-3xl md:text-4xl lg:text-[44px] font-bold text-foreground leading-[1.1] tracking-[-0.01em]">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-5 text-muted text-[15px] md:text-base max-w-[540px] mx-auto leading-relaxed">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}
