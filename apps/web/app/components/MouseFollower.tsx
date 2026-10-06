"use client";

import { useEffect, useState } from "react";

export function MouseFollower() {
  const [pos, setPos] = useState({ x: -1000, y: -1000 });
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    let rafId: number;

    const handleMouseMove = (e: MouseEvent) => {
      setOpacity(1);
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setPos({ x: e.clientX, y: e.clientY });
      });
    };

    const handleMouseLeave = () => setOpacity(0);

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden transition-opacity duration-500 select-none"
      style={{ opacity }}
      aria-hidden="true"
    >
      {/* Soft ambient radiant aura */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none transition-transform duration-200 ease-out will-change-transform"
        style={{
          transform: `translate3d(${pos.x - 300}px, ${pos.y - 300}px, 0)`,
          background:
            "radial-gradient(circle, rgba(37, 99, 235, 0.12) 0%, rgba(59, 130, 246, 0.06) 35%, transparent 70%)",
        }}
      />
      {/* Crisp inner mouse spotlight */}
      <div
        className="absolute w-[240px] h-[240px] rounded-full pointer-events-none transition-transform duration-100 ease-out will-change-transform"
        style={{
          transform: `translate3d(${pos.x - 120}px, ${pos.y - 120}px, 0)`,
          background:
            "radial-gradient(circle, rgba(96, 165, 250, 0.15) 0%, transparent 70%)",
        }}
      />
      {/* Floating smooth interactive cursor ring */}
      <div
        className="absolute w-8 h-8 rounded-full border border-blue-500/40 bg-blue-500/10 pointer-events-none transition-transform duration-75 ease-out shadow-xs"
        style={{
          transform: `translate3d(${pos.x - 16}px, ${pos.y - 16}px, 0)`,
        }}
      />
    </div>
  );
}
