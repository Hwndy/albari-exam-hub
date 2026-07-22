import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, UserCheck, Shield, ArrowRight, Briefcase, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useWebsiteSettings, settingValue } from '@/hooks/useCms';
import { SEO } from '@/components/website/SEO';

const ICONS: Record<string, React.ComponentType<any>> = {
  Users, GraduationCap, UserCheck, Shield, Briefcase, BookOpen,
};

interface Portal {
  title: string;
  description: string;
  icon?: string;
  link: string;
  features: string[];
  enabled?: boolean;
}

const DEFAULTS: Portal[] = [
  { title: 'Student Portal', description: 'Access exam schedules, results, assignments, and academic resources', icon: 'GraduationCap', link: '/login?portal=true&role=student', features: ['View Exam Results', 'Class Schedules', 'Assignments', 'Academic Calendar'], enabled: true },
  { title: 'Parent Portal', description: "Monitor your child's academic progress, attendance, and school activities", icon: 'Users', link: '/login?portal=true&role=parent', features: ["Child's Progress", 'Fee Payment', 'Communication', 'Events Updates'], enabled: true },
  { title: 'Teacher Portal', description: 'Manage classes, create exams, track student performance and communicate with parents', icon: 'UserCheck', link: '/login?portal=true&role=teacher', features: ['Class Management', 'Exam Creation', 'Grade Reports', 'Student Records'], enabled: true },
  { title: 'Admin Portal', description: 'Comprehensive school management system for administrators and staff', icon: 'Shield', link: '/login?portal=true&role=admin', features: ['User Management', 'System Settings', 'Reports', 'School Analytics'], enabled: true },
];

export const PortalsPage = () => {
  const { settings } = useWebsiteSettings();
  const portals = settingValue<Portal[]>(settings, 'portals', DEFAULTS).filter((p) => p.enabled !== false);

  return (
    <div className="space-y-0">
      <SEO
        title="Portals — Al-Bari Group of Schools"
        description="Sign in to the Al-Bari student, parent, teacher, or admin portal to access grades, results, fees, communications, and school resources."
        path="/website/portals"
      />
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">Access Your Portal</h1>
            <p className="text-lg text-muted-foreground">
              Choose your portal to access personalized features and stay connected with Al-Bari Group of Schools
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {portals.map((portal, idx) => {
              const Icon = (portal.icon && ICONS[portal.icon]) || GraduationCap;
              return (
                <Card key={idx} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                        <Icon className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">{portal.title}</CardTitle>
                        <p className="text-sm text-muted-foreground mt-1">{portal.description}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                      {portal.features?.map((f) => (
                        <li key={f} className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-primary" />{f}</li>
                      ))}
                    </ul>
                    <Button asChild className="w-full">
                      <Link to={portal.link}>
                        Enter Portal <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
};
