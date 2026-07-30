import React from 'react';
import { Reveal } from '@/components/website/Reveal';

interface SectionBandProps {
  children: React.ReactNode;
  /** Alternating surface tone so pages have vertical rhythm. */
  tone?: 'default' | 'muted' | 'accent';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  id?: string;
}

const TONES: Record<NonNullable<SectionBandProps['tone']>, string> = {
  default: 'bg-background',
  muted: 'bg-muted/40',
  accent: 'bg-gradient-to-br from-primary/10 via-background to-accent/10',
};

const SIZES: Record<NonNullable<SectionBandProps['size']>, string> = {
  sm: 'py-12',
  md: 'py-16 sm:py-20',
  lg: 'py-20 sm:py-24',
};

export const SectionBand: React.FC<SectionBandProps> = ({
  children,
  tone = 'default',
  size = 'md',
  className = '',
  id,
}) => (
  <section id={id} className={`${TONES[tone]} ${SIZES[size]} ${className}`}>
    <div className="container mx-auto px-4">{children}</div>
  </section>
);

interface SectionHeadingProps {
  eyebrow?: string;
  title: React.ReactNode;
  intro?: string;
  align?: 'center' | 'left';
  className?: string;
}

/** The single heading treatment used by every section across the site. */
export const SectionHeading: React.FC<SectionHeadingProps> = ({
  eyebrow,
  title,
  intro,
  align = 'center',
  className = '',
}) => (
  <Reveal
    className={`mb-12 max-w-2xl ${align === 'center' ? 'mx-auto text-center' : 'text-left'} ${className}`}
  >
    {eyebrow && (
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
    )}
    <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground lg:text-4xl">{title}</h2>
    {intro && <p className="mt-4 text-lg text-muted-foreground">{intro}</p>}
  </Reveal>
);

export default SectionBand;
