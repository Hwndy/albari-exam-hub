import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Award, Users, Heart, Target, Eye, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AboutPage = () => {
  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              About Al-Bari College
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Excellence in Education
              <span className="text-primary block">Since 2010</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              For over a decade, Al-Bari College has been at the forefront of educational excellence, 
              nurturing young minds and shaping future leaders through innovative teaching methods 
              and character development.
            </p>
          </div>
        </div>
      </section>

      {/* Our History */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
                Our Rich History
              </h2>
              <div className="space-y-6 text-muted-foreground">
                <p className="text-lg">
                  Al-Bari College was founded in 2010 with a vision to provide quality education 
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
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-lg flex items-center justify-center">
                <div className="text-center space-y-4">
                  <BookOpen className="h-24 w-24 text-primary mx-auto" />
                  <div className="text-2xl font-bold text-foreground">15+ Years</div>
                  <div className="text-muted-foreground">Of Educational Excellence</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
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

      {/* Core Values */}
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

      {/* Leadership Team */}
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">MA</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Dr. Mohammed Ali</h3>
                  <p className="text-primary font-medium mb-2">Principal</p>
                  <p className="text-muted-foreground text-sm">
                    Ph.D in Education Administration with 20+ years of experience in educational leadership.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">FA</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Mrs. Fatima Ahmed</h3>
                  <p className="text-primary font-medium mb-2">Vice Principal (Academics)</p>
                  <p className="text-muted-foreground text-sm">
                    Masters in Curriculum Development, dedicated to academic excellence and innovation.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl font-bold text-primary">AI</span>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">Mr. Abdul Ibrahim</h3>
                  <p className="text-primary font-medium mb-2">Vice Principal (Administration)</p>
                  <p className="text-muted-foreground text-sm">
                    MBA in Educational Management, ensuring smooth operational excellence.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};