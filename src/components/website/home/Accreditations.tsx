import React from 'react';
import { ShieldCheck, Award, BookMarked, Building2, GraduationCap, Star } from 'lucide-react';
import { useWebsiteSettings, settingValue } from '@/hooks/useCms';

const ICONS: Record<string, React.ComponentType<any>> = {
  ShieldCheck, Award, BookMarked, Building2, GraduationCap, Star,
};

interface AccItem { name: string; desc: string; icon?: string }

const DEFAULTS: AccItem[] = [
  { name: 'WAEC', desc: 'West African Examinations Council', icon: 'Award' },
  { name: 'NECO', desc: 'National Examinations Council', icon: 'ShieldCheck' },
  { name: 'Cambridge', desc: 'Cambridge Assessment', icon: 'BookMarked' },
  { name: 'Ministry of Education', desc: 'Federal Republic of Nigeria', icon: 'Building2' },
  { name: 'NUC Recognised', desc: 'Pathway Partner', icon: 'GraduationCap' },
];

export const Accreditations: React.FC = () => {
  const { settings } = useWebsiteSettings();
  const bodies = settingValue<AccItem[]>(settings, 'accreditations', DEFAULTS);
  if (!bodies?.length) return null;
  return (
    <section className="py-14 border-y border-border bg-card/50">
      <div className="container mx-auto px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground mb-8">
          Accredited & affiliated with
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
          {bodies.map(({ name, desc, icon }) => {
            const Icon = (icon && ICONS[icon]) || Award;
            return (
              <div key={name} className="group flex flex-col items-center text-center gap-2 p-4 rounded-xl border border-transparent hover:border-gold/30 hover:bg-gold/5 transition-all">
                <Icon className="h-8 w-8 text-primary group-hover:text-gold transition-colors" />
                <div>
                  <p className="font-bold text-foreground text-sm">{name}</p>
                  <p className="text-[11px] text-muted-foreground leading-tight">{desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
