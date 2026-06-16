import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, GraduationCap, Trophy, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

// 1. Array storing your public folder background image assets
const HERO_IMAGES = [
  '/albari-campus.png',      // Your cleaned up campus image
  '/img1.png',       // Placeholder: Add your second image here
  '/img2.png',
  '/img3.png',        // Placeholder: Add your third image here
];

export const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  // 2. Setup interval timer to advance the background automatically
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000); // Transitions slide every 5000ms (5 seconds)

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-0">
      {/* Hero Section with Slideshow Background */}
      <section className="relative min-h-[600px] flex items-center py-24 overflow-hidden">
        
        {/* Background Slideshow Layer */}
        <div className="absolute inset-0 z-0">
          {HERO_IMAGES.map((imageSrc, index) => (
            <img
              key={imageSrc}
              src={imageSrc}
              alt={`Al-Bari College Slideshow Background ${index + 1}`}
              className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ease-in-out ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          
          {/* Constant dark scrim layer overlay + backdrop blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[px]" />
        </div>

        {/* Content Layer */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-3xl space-y-6">
            <Badge className="w-fit bg-primary text-primary-foreground border-none px-3 py-1 text-sm shadow-md">
              Excellence in Education Since 2004
            </Badge>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight tracking-tight">
              Building Tomorrow's
              <span className="text-primary block mt-1 drop-shadow-sm text-white leading-tight tracking-tight">Leaders Today</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-slate-200 font-medium max-w-2xl leading-relaxed">
              At Al-Bari College, we are committed to nurturing young minds and developing future leaders 
              through innovative education, character building, and academic excellence.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <Button size="lg" className="shadow-lg text-base" asChild>
                <Link to="/website/admissions">
                  Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="bg-white/10 hover:bg-white/20 text-white border-white/30 backdrop-blur-sm shadow-lg text-base" 
                asChild
              >
                <Link to="/website/about">Learn More</Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Interactive Slide Navigation Dots Indicator */}
        <div className="absolute bottom-6 right-6 z-20 flex space-x-2 bg-black/30 backdrop-blur-sm py-2 px-3 rounded-full border border-white/10">
          {HERO_IMAGES.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'w-6 bg-primary' : 'w-2 bg-white/50 hover:bg-white'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">1000+</div>
              <div className="text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">50+</div>
              <div className="text-muted-foreground">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">98%</div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">22+</div>
              <div className="text-muted-foreground">Years Excellence</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Why Choose Al-Bari College?
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Discover what makes us the preferred choice for parents and students seeking quality education.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Academic Excellence</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Consistent outstanding results in national examinations with personalized learning approaches.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Expert Faculty</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  Qualified and experienced teachers dedicated to nurturing every student's potential.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="text-center">
                <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
                <CardTitle>Modern Facilities</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-muted-foreground">
                  State-of-the-art laboratories, libraries, and technology-enabled classrooms.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16 bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
            Ready to Join Al-Bari College?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Take the first step towards an exceptional education. Apply now and become part of our 
            growing community of future leaders.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link to="/website/admissions">
                Start Your Application <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild>
              <Link to="/website/portals">Access Portals</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};