import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Users, GraduationCap, Trophy, BookOpen, Calendar, Star, Quote } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { SchoolInfo, NewsArticle, Testimonial } from '@/types/website';

export const HomePage = () => {
  const [schoolStats, setSchoolStats] = useState<Record<string, string>>({});
  const [latestNews, setLatestNews] = useState<NewsArticle[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);

  useEffect(() => {
    fetchSchoolStats();
    fetchLatestNews();
    fetchTestimonials();
  }, []);

  const fetchSchoolStats = async () => {
    const { data } = await supabase
      .from('school_info')
      .select('*')
      .eq('category', 'statistics')
      .eq('is_active', true);
    
    if (data) {
      const stats = data.reduce((acc, item) => {
        acc[item.info_key] = item.info_value;
        return acc;
      }, {} as Record<string, string>);
      setSchoolStats(stats);
    }
  };

  const fetchLatestNews = async () => {
    const { data } = await supabase
      .from('news_articles')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3);
    
    if (data) setLatestNews(data as NewsArticle[]);
  };

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from('testimonials')
      .select('*')
      .eq('is_published', true)
      .eq('is_featured', true)
      .limit(3);
    
    if (data) setTestimonials(data as Testimonial[]);
  };

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge variant="secondary" className="w-fit">
                Excellence in Education Since 2010
              </Badge>
              <h1 className="text-4xl lg:text-6xl font-bold text-foreground leading-tight">
                Building Tomorrow's
                <span className="text-primary block">Leaders Today</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                At Al-Bari College, we are committed to nurturing young minds and developing future leaders 
                through innovative education, character building, and academic excellence.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" asChild>
                  <Link to="/website/admissions">
                    Apply Now <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" asChild>
                  <Link to="/website/about">Learn More</Link>
                </Button>
              </div>
            </div>
            
            <div className="relative">
              <div className="aspect-square bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                <div className="text-center space-y-4">
                  <GraduationCap className="h-24 w-24 text-primary mx-auto" />
                  <div className="text-2xl font-bold text-foreground">Al-Bari College</div>
                  <div className="text-muted-foreground">Excellence in Education</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {schoolStats.student_count || '500+'}
              </div>
              <div className="text-muted-foreground">Students</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {schoolStats.teacher_count || '50+'}
              </div>
              <div className="text-muted-foreground">Teachers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">
                {schoolStats.success_rate || '98%'}
              </div>
              <div className="text-muted-foreground">Success Rate</div>
            </div>
            <div className="text-center">
              <div className="text-3xl lg:text-4xl font-bold text-primary mb-2">15+</div>
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

      {/* Latest News & Events */}
      {latestNews.length > 0 && (
        <section className="py-16 bg-card/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Latest News & Events
              </h2>
              <p className="text-lg text-muted-foreground">
                Stay updated with the latest happenings at Al-Bari College
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {latestNews.map((article) => (
                <Card key={article.id} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  {article.featured_image && (
                    <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                      <Calendar className="h-12 w-12 text-primary" />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant={article.category === 'events' ? 'default' : 'secondary'}>
                        {article.category}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(article.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <CardTitle className="text-lg">{article.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {article.excerpt || article.content.substring(0, 100) + '...'}
                    </p>
                    <Button variant="ghost" size="sm" asChild>
                      <Link to={`/website/news/${article.slug}`}>
                        Read More <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-8">
              <Button variant="outline" asChild>
                <Link to="/website/news">View All News & Events</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Testimonials Section */}
      {testimonials.length > 0 && (
        <section className="py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                What Our Community Says
              </h2>
              <p className="text-lg text-muted-foreground">
                Hear from our students, parents, and alumni about their Al-Bari experience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {testimonials.map((testimonial) => (
                <Card key={testimonial.id} className="border-0 shadow-lg">
                  <CardContent className="pt-6">
                    <Quote className="h-8 w-8 text-primary mb-4" />
                    <p className="text-muted-foreground mb-4 italic">
                      "{testimonial.content}"
                    </p>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-primary font-semibold">
                          {testimonial.name.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground capitalize">{testimonial.role}</div>
                      </div>
                      {testimonial.rating && (
                        <div className="flex ml-auto">
                          {Array.from({ length: testimonial.rating }, (_, i) => (
                            <Star key={i} className="h-4 w-4 fill-primary text-primary" />
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

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