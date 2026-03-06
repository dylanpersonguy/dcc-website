"use client";

import { motion, useInView } from "framer-motion";
import { useRef, useEffect, useState } from "react";

interface StatCardProps {
  value: string;
  label: string;
  suffix?: string;
  index: number;
}

function AnimatedNumber({ target, suffix }: { target: string; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!isInView) return;
    const numericTarget = parseFloat(target);
    const isDecimal = target.includes(".");
    const duration = 2000;
    const start = performance.now();

    const step = (time: number) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = numericTarget * eased;

      if (isDecimal) {
        setDisplay(current.toFixed(1));
      } else {
        setDisplay(Math.floor(current).toLocaleString());
      }

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };
    requestAnimationFrame(step);
  }, [isInView, target]);

  return (
    <span ref={ref}>
      {display}
      {suffix}
    </span>
  );
}

export default function StatCard({ value, label, suffix, index }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="glass-card text-center"
    >
      <div className="font-heading text-2xl md:text-3xl font-bold text-gradient-accent mb-1">
        <AnimatedNumber target={value} suffix={suffix} />
      </div>
      <div className="text-muted text-[12px] tracking-wide">{label}</div>
    </motion.div>
  );
}
