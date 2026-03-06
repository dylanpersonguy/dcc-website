"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  index: number;
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  index,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card group cursor-default"
    >
      <div className="w-10 h-10 rounded-lg bg-primary/[0.08] flex items-center justify-center mb-5 group-hover:bg-primary/[0.14] transition-colors duration-300">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-heading text-[15px] font-semibold text-foreground mb-2.5">
        {title}
      </h3>
      <p className="text-muted text-[13px] leading-relaxed">{description}</p>
    </motion.div>
  );
}
