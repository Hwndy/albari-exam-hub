import React, { useEffect, useRef, useState } from 'react';

export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: 'div' | 'section';
}

/** Fades content up when it scrolls into view. Respects prefers-reduced-motion. */
export const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0, as = 'div' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced) {
      setVisible(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisible(true);
            io.disconnect();
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduced]);

  const Tag = as as any;
  return (
    <Tag
      ref={ref}
      className={`${className} transition-all duration-700 ease-out ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-6 opacity-0'
      }`}
      style={{ transitionDelay: visible && delay ? `${delay}ms` : undefined }}
    >
      {children}
    </Tag>
  );
};

/**
 * Counts up to the numeric part of a value like "600+" or "98%" while keeping
 * the surrounding characters intact.
 */
export const CountUp: React.FC<{ value: string; className?: string; duration?: number }> = ({
  value,
  className = '',
  duration = 1400,
}) => {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<string>(value);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const match = /^(\D*)(\d[\d,]*)(.*)$/.exec(value ?? '');
    if (!match || reduced) {
      setDisplay(value);
      return;
    }
    const [, prefix, digits, suffix] = match;
    const target = Number(digits.replace(/,/g, ''));
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }
    setDisplay(`${prefix}0${suffix}`);

    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const start = performance.now();
      const tick = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setDisplay(`${prefix}${Math.round(target * eased).toLocaleString()}${suffix}`);
        if (p < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
};