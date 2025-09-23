import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Microscope, Monitor, Trophy, Utensils, Bus } from 'lucide-react';

export const FacilitiesPage = () => {
  const facilities = [
    {
      title: "Modern Library",
      description: "Extensive collection of books, digital resources, and quiet study spaces for enhanced learning.",
      icon: BookOpen
    },
    {
      title: "Science Laboratories",
      description: "Fully equipped labs for Biology, Chemistry, and Physics with modern equipment and safety measures.",
      icon: Microscope
    },
    {
      title: "Computer Laboratory",
      description: "State-of-the-art computers with high-speed internet for digital literacy and research.",
      icon: Monitor
    },
    {
      title: "Sports Complex",
      description: "Indoor and outdoor facilities including basketball court, football field, and athletics track.",
      icon: Trophy
    },
    {
      title: "Cafeteria",
      description: "Hygienic food service providing nutritious meals and refreshments for students and staff.",
      icon: Utensils
    },
    {
      title: "Transportation",
      description: "Safe and reliable school bus services covering major routes across Lagos.",
      icon: Bus
    }
  ];

  return (
    <div className="space-y-0">
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              World-Class Facilities
            </h1>
            <p className="text-lg text-muted-foreground">
              Modern infrastructure designed to support effective teaching, learning, and character development
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {facilities.map((facility, index) => (
              <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <facility.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>{facility.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">{facility.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};