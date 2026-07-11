'use client';

import { useRef } from 'react';

// Perspective tilt that follows the cursor — the card leans toward the
// pointer and eases back on leave. Mouse-only by design: on touch there is
// no hover to drive it, and reduced-motion users get a static card (the
// transform transition is the only motion, and we never set it for them).
export default function TiltCard({
  children,
  className = '',
  maxTilt = 7,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el || e.pointerType !== 'mouse') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(900px) rotateY(${px * maxTilt * 2}deg) rotateX(${-py * maxTilt * 2}deg)`;
  };

  const handleLeave = () => {
    const el = ref.current;
    if (el) el.style.transform = 'perspective(900px) rotateY(0deg) rotateX(0deg)';
  };

  return (
    <div
      ref={ref}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className={className}
      style={{ transition: 'transform 300ms cubic-bezier(0.22, 1, 0.36, 1)', willChange: 'transform' }}
    >
      {children}
    </div>
  );
}
