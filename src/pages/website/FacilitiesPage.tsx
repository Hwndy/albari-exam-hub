import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Microscope, Monitor, Trophy, Utensils, Bus, Home, Building2, Users, GraduationCap } from 'lucide-react';
import { useWebsiteSettings, useGallery, settingValue } from '@/hooks/useCms';
import { SEO } from '@/components/website/SEO';

const ICONS: Record<string, React.ComponentType<any>> = {
  BookOpen, Microscope, Monitor, Trophy, Utensils, Bus, Home, Building2, Users, GraduationCap,
};

interface Facility { title: string; description: string; icon?: string }

const DEFAULT_FACILITIES: Facility[] = [
  { title: 'Modern Library', description: 'Extensive collection of books, digital resources, and quiet study spaces for enhanced learning.', icon: 'BookOpen' },
  { title: 'Science Laboratories', description: 'Fully equipped labs for Biology, Chemistry, and Physics with modern equipment and safety measures.', icon: 'Microscope' },
  { title: 'Computer Laboratory', description: 'State-of-the-art computers with high-speed internet for digital literacy and research.', icon: 'Monitor' },
  { title: 'Sports Complex', description: 'Indoor and outdoor facilities including basketball court, football field, and athletics track.', icon: 'Trophy' },
  { title: 'Cafeteria', description: 'Hygienic food service providing nutritious meals and refreshments for students and staff.', icon: 'Utensils' },
  { title: 'Transportation', description: 'Safe and reliable school bus services covering major routes across Lagos.', icon: 'Bus' },
];

export const FacilitiesPage = () => {
  const { settings } = useWebsiteSettings();
  const intro = settingValue<string>(settings, 'facilities_intro', 'Modern infrastructure designed to support effective teaching, learning, and character development');
  const facilities = settingValue<Facility[]>(settings, 'facilities', DEFAULT_FACILITIES);
  const { data: photos = [] } = useGallery({ category: 'facilities', limit: 12 });

  return (
    <div className="space-y-0">
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">World-Class Facilities</h1>
            <p className="text-lg text-muted-foreground">{intro}</p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((facility, index) => {
              const Icon = (facility.icon && ICONS[facility.icon]) || BookOpen;
              return (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="text-center">
                    <Icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle>{facility.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground">{facility.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {photos.length > 0 && (
        <section className="py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center text-foreground mb-10">Campus Gallery</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border">
                  <img src={p.image_url} alt={p.alt_text || p.title || 'Facility'} loading="lazy"
                       className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  {p.title && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-sm font-medium text-white truncate">{p.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
