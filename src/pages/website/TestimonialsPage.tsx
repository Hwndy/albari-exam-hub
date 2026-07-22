import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, Quote } from 'lucide-react';
import { useTestimonials } from '@/hooks/useCms';
import { SEO } from '@/components/website/SEO';

const ROLES = ['all', 'student', 'parent', 'alumni', 'staff'] as const;
type Role = typeof ROLES[number];

export const TestimonialsPage: React.FC = () => {
  const [role, setRole] = useState<Role>('all');
  const { data: items = [], isLoading } = useTestimonials();
  const filtered = role === 'all' ? items : items.filter((t) => t.role === role);

  return (
    <div className="space-y-0">
      <SEO
        title="Testimonials — Al-Bari Group of Schools"
        description="Read what students, parents, alumni and staff say about their experience at Al-Bari Group of Schools."
        path="/website/testimonials"
      />

      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4 text-center max-w-3xl">
          <Badge variant="secondary" className="mb-6">Voices of Al-Bari</Badge>
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-4">What Our Community Says</h1>
          <p className="text-lg text-muted-foreground">
            Real stories from the students, families and educators who call Al-Bari home.
          </p>
        </div>
      </section>

      <section className="py-8 border-b border-border">
        <div className="container mx-auto px-4 flex flex-wrap gap-2 justify-center">
          {ROLES.map((r) => (
            <Button key={r} size="sm" variant={role === r ? 'default' : 'outline'} onClick={() => setRole(r)} className="capitalize">
              {r}
            </Button>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No testimonials yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((t) => (
                <figure key={t.id} className="relative rounded-2xl bg-card border border-border p-8 shadow-sm hover:shadow-lg transition-shadow">
                  <Quote className="absolute top-6 right-6 h-8 w-8 text-gold/30" />
                  {t.rating ? (
                    <div className="flex gap-0.5 mb-4">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className={`h-4 w-4 ${i < (t.rating || 0) ? 'fill-gold text-gold' : 'text-muted'}`} />
                      ))}
                    </div>
                  ) : null}
                  <blockquote className="text-foreground leading-relaxed mb-6">"{t.content}"</blockquote>
                  <figcaption className="flex items-center gap-3 pt-4 border-t border-border">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary-hover flex items-center justify-center text-primary-foreground font-semibold overflow-hidden">
                      {t.image_url ? (
                        <img src={t.image_url} alt={t.name} className="h-full w-full object-cover" loading="lazy" />
                      ) : t.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">{t.name}</p>
                      <p className="text-xs text-muted-foreground capitalize">{t.role}</p>
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default TestimonialsPage;