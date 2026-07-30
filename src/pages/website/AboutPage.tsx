import React from 'react';
import { Button } from '@/components/ui/button';
import { Award, Users, Target, Eye, ShieldCheck, GraduationCap, Landmark, BookOpen, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings, settingValue } from '@/hooks/useCms';
import { SEO } from '@/components/website/SEO';
import { PageHero } from '@/components/website/PageHero';
import { SectionBand, SectionHeading } from '@/components/website/Section';
import { Reveal } from '@/components/website/Reveal';

const ICONS: Record<string, React.ComponentType<any>> = {
  Award,
  Users,
  Target,
  Eye,
  BookOpen,
  ShieldCheck,
  GraduationCap,
  Landmark,
};

interface Leader { name: string; role: string; bio?: string; image?: string }
interface Value { title: string; description: string; icon?: string }

const DEFAULT_VALUES: Value[] = [
  { title: 'Excellence', description: 'We strive for the highest standards in all aspects of education, encouraging students to achieve their full potential.', icon: 'Award' },
  { title: 'Integrity', description: 'We uphold honesty, transparency, and ethical conduct in all our interactions and decision-making processes.', icon: 'ShieldCheck' },
  { title: 'Community', description: 'We foster a supportive and inclusive environment where every member feels valued and respected.', icon: 'Users' },
];

const DEFAULT_LEADERS: Leader[] = [
  { name: 'HON. SULAIMON RASAQ', role: 'Proprietor', bio: '20+ years of experience in educational leadership.', image: '/rsk.png' },
  { name: 'Dr. Sulaimon Dhikroh Awe', role: 'Director of Studies (D.O.S)', bio: 'PhD. Mathematics, dedicated to academic excellence and innovation.', image: '/awe.png' },
];

export const AboutPage = () => {
  const { settings } = useWebsiteSettings();
  const heroImage = settingValue<string>(settings, 'about_hero_image', '/albari-campus.png');
  const heroTitle = settingValue<string>(settings, 'about_hero_title', 'Excellence in Education');
  const heroHighlight = settingValue<string>(settings, 'about_hero_highlight', 'Since 2004');
  const heroSubtitle = settingValue<string>(settings, 'about_hero_subtitle',
    'For over a decade, Al-Bari Group of Schools has been at the forefront of educational excellence, nurturing young minds and shaping future leaders through innovative teaching methods and character development.');
  const historyParagraphs = settingValue<string[]>(settings, 'about_history_paragraphs', [
    "Al-Bari Group of Schools was founded in 2004 with a vision to provide quality education that combines academic excellence with moral values. What started as a small institution with just 50 students has grown into one of Lagos' most respected educational establishments.",
    'Over the years, we have consistently maintained our commitment to excellence, producing graduates who have gone on to achieve success in various fields including medicine, engineering, law, and business.',
    'Our journey has been marked by continuous innovation in teaching methodologies, infrastructure development, and the integration of modern technology into traditional learning approaches.',
  ]);
  const historyImage = settingValue<string>(settings, 'about_history_image', '/albari_logo.jpg');
  const yearsBadge = settingValue<string>(settings, 'about_years_badge', '22+ Years');
  const vision = settingValue<string>(settings, 'about_vision',
    'To be the leading educational institution in Nigeria, recognized for academic excellence, character development, and the production of well-rounded individuals who contribute positively to society.');
  const mission = settingValue<string>(settings, 'about_mission',
    'To provide quality education that nurtures intellectual growth, moral development, and practical skills, preparing students to excel in their chosen careers while maintaining the highest ethical standards.');
  const values = settingValue<Value[]>(settings, 'about_values', DEFAULT_VALUES);
  const leaders = settingValue<Leader[]>(settings, 'about_leaders', DEFAULT_LEADERS);

  return (
    <div className="space-y-0">
      <SEO
        title="About Us — Al-Bari Group of Schools"
        description="Learn about Al-Bari Group of Schools: our vision, mission, core values, and leadership team shaping the next generation of Nigerian leaders."
        path="/website/about"
      />
      <PageHero
        eyebrow="About Al-Bari Group of Schools"
        title={heroTitle}
        highlight={heroHighlight}
        subtitle={heroSubtitle}
        image={heroImage}
        crumbs={[{ label: 'About Us' }]}
      />

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">Our Rich History</h2>
              <div className="space-y-6 text-muted-foreground">
                {historyParagraphs.map((p, i) => (
                  <p key={i} className={i === 0 ? 'text-lg' : ''}>{p}</p>
                ))}
              </div>
              <Button className="mt-6" asChild><Link to="/website/admissions">Join Our Legacy</Link></Button>
            </div>
            <div className="relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-75 transition duration-1000 group-hover:opacity-100" />
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-background shadow-2xl flex items-center justify-center p-6 text-center">
                <img src={historyImage} alt="Campus Detail View" className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mx-auto shadow-inner">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md">{yearsBadge}</div>
                  <div className="text-xl text-slate-100 font-medium leading-tight">Of Educational Excellence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Our Vision & Mission</h2>
            <p className="text-lg text-muted-foreground">Guiding principles that drive our commitment to educational excellence</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center"><Eye className="h-12 w-12 text-primary mx-auto mb-4" /><CardTitle className="text-2xl">Our Vision</CardTitle></CardHeader>
              <CardContent className="text-center"><p className="text-muted-foreground text-lg leading-relaxed">{vision}</p></CardContent>
            </Card>
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center"><Target className="h-12 w-12 text-primary mx-auto mb-4" /><CardTitle className="text-2xl">Our Mission</CardTitle></CardHeader>
              <CardContent className="text-center"><p className="text-muted-foreground text-lg leading-relaxed">{mission}</p></CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Our Core Values</h2>
            <p className="text-lg text-muted-foreground">The fundamental principles that shape our educational philosophy</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v, i) => {
              const Icon = (v.icon && ICONS[v.icon]) || Award;
              return (
                <Card key={i} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="text-center"><Icon className="h-12 w-12 text-primary mx-auto mb-4" /><CardTitle>{v.title}</CardTitle></CardHeader>
                  <CardContent className="text-center"><p className="text-muted-foreground">{v.description}</p></CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">Our Leadership Team</h2>
            <p className="text-lg text-muted-foreground">Experienced educators leading Al-Bari Group of Schools towards excellence</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {leaders.map((l, i) => (
              <Card key={i} className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 rounded-full mx-auto mb-4 overflow-hidden shadow-md border-2 border-primary/20 flex items-center justify-center bg-muted">
                    {l.image ? (
                      <img src={l.image} alt={l.name} className="w-full h-full object-cover object-center" />
                    ) : (
                      <Users className="h-10 w-10 text-primary" />
                    )}
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{l.name}</h3>
                  <p className="text-primary font-medium mb-2">{l.role}</p>
                  {l.bio && <p className="text-muted-foreground text-sm">{l.bio}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};
