"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface EcosystemCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
  index: number;
}

export default function EcosystemCard({
  icon: Icon,
  title,
  description,
  color,
  index,
}: EcosystemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card group relative overflow-hidden"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 transition-transform duration-300 group-hover:scale-105"
        style={{ backgroundColor: `${color}10` }}
      >
        <Icon className="w-[18px] h-[18px]" style={{ color }} />
      </div>
      <h3 className="font-heading text-[14px] font-semibold text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-muted text-[13px] leading-relaxed">{description}</p>
      {/* Bottom accent line */}
      <div
        className="absolute bottom-0 left-6 right-6 h-px opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `linear-gradient(90deg, transparent, ${color}30, transparent)`,
        }}
      />
    </motion.div>
  );
}
