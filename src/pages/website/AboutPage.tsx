import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Users, Heart, Target, Eye, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage = () => {
  return (
    <div className="space-y-0">
      {/* Hero Section with Image Background */}
      <section className="relative py-24 overflow-hidden">
        {/* Background Image Layer */}
        <div className="absolute inset-0 z-0">
          <img 
            src="/albari-campus.png" // Path to your school building image
            alt="Al-Bari College Campus Background" 
            className="w-full h-full object-cover object-center"
          />
          {/* Constant dark scrim overlay + backdrop blur to ensure text readability */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-[px]" />
        </div>

        {/* Content Layer */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* badge style slightly altered to stand out against dark bg */}
            <Badge className="mb-6 bg-primary text-primary-foreground border-none px-3 py-1 shadow-md">
              About Al-Bari College
            </Badge>
            
            {/* typography colors altered for high-contrast presentation */}
            <h1 className="text-4xl lg:text-6xl font-bold text-white mb-6 leading-tight tracking-tight">
              Excellence in Education
              <span className="text-primary block mt-1 drop-shadow-sm text-white mb-6 leading-tight tracking-tight">Since 2004</span>
            </h1>
            <p className="text-lg sm:text-xl max-w-2xl mx-auto text-slate-200 font-medium leading-relaxed">
              For over a decade, Al-Bari College has been at the forefront of educational excellence, 
              nurturing young minds and shaping future leaders through innovative teaching methods 
              and character development.
            </p>
          </div>
        </div>
      </section>

      {/* Our History Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left side text column untouched */}
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Our Rich History
              </h2>
              <div className="space-y-6 text-muted-foreground">
                <p className="text-lg">
                  Al-Bari College was founded in 2004 with a vision to provide quality education 
                  that combines academic excellence with moral values. What started as a small 
                  institution with just 50 students has grown into one of Lagos' most respected 
                  educational establishments.
                </p>
                <p>
                  Over the years, we have consistently maintained our commitment to excellence, 
                  producing graduates who have gone on to achieve success in various fields 
                  including medicine, engineering, law, and business.
                </p>
                <p>
                  Our journey has been marked by continuous innovation in teaching methodologies, 
                  infrastructure development, and the integration of modern technology into 
                  traditional learning approaches.
                </p>
              </div>
              <Button className="mt-6" asChild>
                <Link to="/website/admissions">Join Our Legacy</Link>
              </Button>
            </div>
            
            {/* Right side Showcase Box - Now a sharp Image container */}
            <div className="relative group">
              {/* Soft glow background decorative element retained from previous design concepts */}
              <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-75 transition duration-1000 group-hover:opacity-100" />
              
              {/* The new image container, using aspect ratio to keep sharp layout */}
              <div className="relative aspect-square w-full overflow-hidden rounded-2xl border bg-background shadow-2xl flex items-center justify-center p-6 text-center">
                <img 
                  src="/albari_logo.jpg" // Using the same image asset
                  alt="Campus Detail View" 
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-500 hover:scale-105"
                />
                {/* Subtle dark-to-transparent gradient mask strictly for legend text readability */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent pointer-events-none" />
                
                {/* Content Overlay */}
                <div className="relative z-10 space-y-4">
                  <div className="flex items-center justify-center h-20 w-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mx-auto shadow-inner">
                    <BookOpen className="h-10 w-10 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-white tracking-tight drop-shadow-md">22+ Years</div>
                  <div className="text-xl text-slate-100 font-medium leading-tight">Of Educational Excellence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission Section Untouched */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Our Vision & Mission
              </h2>
              <p className="text-lg text-muted-foreground">
                Guiding principles that drive our commitment to educational excellence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Eye className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">Our Vision</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    To be the leading educational institution in Nigeria, recognized for academic 
                    excellence, character development, and the production of well-rounded individuals 
                    who contribute positively to society.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Target className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle className="text-2xl">Our Mission</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground text-lg leading-relaxed">
                    To provide quality education that nurtures intellectual growth, moral development, 
                    and practical skills, preparing students to excel in their chosen careers while 
                    maintaining the highest ethical standards.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Core Values Section Untouched */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Our Core Values
              </h2>
              <p className="text-lg text-muted-foreground">
                The fundamental principles that shape our educational philosophy
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <Award className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Excellence</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    We strive for the highest standards in all aspects of education, 
                    encouraging students to achieve their full potential.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <Heart className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Integrity</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    We uphold honesty, transparency, and ethical conduct in all our 
                    interactions and decision-making processes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Community</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    We foster a supportive and inclusive environment where every 
                    member feels valued and respected.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Leadership Team Section Untouched */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Our Leadership Team
              </h2>
              <p className="text-lg text-muted-foreground">
                Experienced educators leading Al-Bari College towards excellence
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">MA</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">HON. SULAIMON RASAQ</h3>
                  <p className="text-primary font-medium mb-2">Proprietor</p>
                  <p className="text-muted-foreground text-sm">
                    20+ years of experience in educational leadership.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">FA</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Dr. Sulaimon Dhikroh Awe</h3>
                  <p className="text-primary font-medium mb-2">Director of Studies (D.O.S)</p>
                  <p className="text-muted-foreground text-sm">
                    PhD. Mathematics, dedicated to academic excellence and innovation.
                  </p>
                </CardContent>
              </Card>

              
              {/* </Card> */}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};