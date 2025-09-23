import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, GraduationCap, UserCheck, Shield, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const PortalsPage = () => {
  const portals = [
    {
      title: "Student Portal",
      description: "Access exam schedules, results, assignments, and academic resources",
      icon: GraduationCap,
      link: "/login?portal=true&role=student",
      features: ["View Exam Results", "Class Schedules", "Assignments", "Academic Calendar"]
    },
    {
      title: "Parent Portal",
      description: "Monitor your child's academic progress, attendance, and school activities",
      icon: Users,
      link: "/login?portal=true&role=parent",
      features: ["Child's Progress", "Fee Payment", "Communication", "Events Updates"]
    },
    {
      title: "Teacher Portal",
      description: "Manage classes, create exams, track student performance and communicate with parents",
      icon: UserCheck,
      link: "/login?portal=true&role=teacher",
      features: ["Class Management", "Exam Creation", "Grade Reports", "Student Records"]
    },
    {
      title: "Admin Portal",
      description: "Comprehensive school management system for administrators and staff",
      icon: Shield,
      link: "/login?portal=true&role=admin",
      features: ["User Management", "System Settings", "Reports", "School Analytics"]
    }
  ];

  return (
    <div className="space-y-0">
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Access Your Portal
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose your portal to access personalized features and stay connected with Al-Bari College
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
            {portals.map((portal, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <portal.icon className="h-16 w-16 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">{portal.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground text-center">
                    {portal.description}
                  </p>
                  <div className="space-y-2">
                    {portal.features.map((feature, idx) => (
                      <div key={idx} className="flex items-center text-sm text-muted-foreground">
                        <ArrowRight className="h-4 w-4 text-primary mr-2" />
                        {feature}
                      </div>
                    ))}
                  </div>
                  <Button className="w-full" size="lg" asChild>
                    <Link to={portal.link}>
                      Access {portal.title} <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};