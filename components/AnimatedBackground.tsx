"use client";

import { useEffect, useRef } from "react";

export default function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      opacity: number;
      color: string;
    }

    let nodes: Node[] = [];

    const colors = [
      "0, 229, 255",
      "108, 99, 255",
      "20, 241, 149",
    ];

    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = window.innerWidth + "px";
      canvas.style.height = window.innerHeight + "px";
      ctx.scale(dpr, dpr);
    };

    const createNodes = () => {
      const count = Math.min(Math.floor(window.innerWidth / 35), 40);
      nodes = [];
      for (let i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
          vx: (Math.random() - 0.5) * 0.15,
          vy: (Math.random() - 0.5) * 0.15,
          radius: Math.random() * 1.2 + 0.4,
          opacity: Math.random() * 0.4 + 0.08,
          color: colors[Math.floor(Math.random() * colors.length)],
        });
      }
    };

    const w = () => window.innerWidth;
    const h = () => window.innerHeight;

    const animate = () => {
      ctx.clearRect(0, 0, w(), h());

      // Draw connections
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 180) {
            const opacity = (1 - dist / 180) * 0.06;
            ctx.beginPath();
            ctx.strokeStyle = `rgba(${nodes[i].color}, ${opacity})`;
            ctx.lineWidth = 0.5;
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodes.forEach((n) => {
        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > w()) n.vx *= -1;
        if (n.y < 0 || n.y > h()) n.vy *= -1;

        // Node glow
        const gradient = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 6);
        gradient.addColorStop(0, `rgba(${n.color}, ${n.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(${n.color}, 0)`);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${n.color}, ${n.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    createNodes();
    animate();

    const onResize = () => {
      resize();
      createNodes();
    };
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <>
      {/* Ambient gradient orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="orb orb-secondary w-[400px] h-[400px] top-[-10%] left-[-5%]" style={{ animationDelay: '0s' }} />
        <div className="orb orb-primary w-[320px] h-[320px] top-[20%] right-[-8%]" style={{ animationDelay: '3s' }} />
        <div className="orb orb-accent w-[280px] h-[280px] bottom-[10%] left-[20%]" style={{ animationDelay: '5s' }} />
      </div>
      {/* Grid overlay */}
      <div className="fixed inset-0 pointer-events-none z-0 grid-overlay opacity-25" />
      {/* Particle canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
        style={{ opacity: 0.5 }}
      />
    </>
  );
}
