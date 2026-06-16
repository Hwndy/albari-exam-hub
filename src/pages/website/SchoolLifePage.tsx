import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Users, Microscope, Calculator, Globe, Palette, Music, Trophy } from 'lucide-react';

export const SchoolLifePage = () => {
  const academicPrograms = [
    {
      title: "Science Track",
      description: "Comprehensive science education preparing students for medical and engineering careers",
      icon: Microscope,
      subjects: ["Biology", "Chemistry", "Physics", "Mathematics", "English"]
    },
    {
      title: "Commercial Track", 
      description: "Business-focused curriculum developing entrepreneurial and financial skills",
      icon: Calculator,
      subjects: ["Accounting", "Economics", "Commerce", "Mathematics", "English"]
    },
    {
      title: "Arts Track",
      description: "Liberal arts program fostering critical thinking and cultural awareness",
      icon: Palette,
      subjects: ["Literature", "Government", "History", "Islamic Studies", "Arabic"]
    }
  ];

  const facilities = [
    {
      title: "Modern Library",
      description: "Extensive collection of books, digital resources, and quiet study spaces",
      icon: BookOpen
    },
    {
      title: "Science Laboratories", 
      description: "Fully equipped labs for Biology, Chemistry, and Physics practical sessions",
      icon: Microscope
    },
    {
      title: "Computer Lab",
      description: "State-of-the-art computers with internet access for digital literacy",
      icon: Globe
    },
    {
      title: "Sports Complex",
      description: "Indoor and outdoor facilities for various sports and physical activities",
      icon: Trophy
    }
  ];

  const extracurricular = [
    "Debate Club", "Science Club", "Literature Society", "Mathematics Club",
    "Football Team", "Basketball Team", "Athletics", "Table Tennis",
    "Quranic Recitation", "Arabic Calligraphy"
  ];

  return (
    <div className="space-y-0">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6">
              School Life at Al-Bari
            </Badge>
            <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
              Academic Excellence &
              <span className="text-primary block">Holistic Development</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Experience a vibrant school life that combines rigorous academics with character 
              development, extracurricular activities, and a supportive community environment.
            </p>
          </div>
        </div>
      </section>

      {/* Academic Programs */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Academic Programs
              </h2>
              <p className="text-lg text-muted-foreground">
                Comprehensive curriculum designed to prepare students for higher education and career success
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {academicPrograms.map((program, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="text-center">
                    <program.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <CardTitle className="text-xl">{program.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-center">
                      {program.description}
                    </p>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Core Subjects:</h4>
                      <div className="flex flex-wrap gap-2">
                        {program.subjects.map((subject, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Class Structure */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Class Structure
              </h2>
              <p className="text-lg text-muted-foreground">
                Well-organized class system ensuring personalized attention and optimal learning
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">CRECHE</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Your babies in safe hands</h3>
                  <p className="text-muted-foreground text-sm">
                    Foundation years building core competencies in all subject areas with emphasis on literacy and numeracy.
                  </p>
                </CardContent>
              </Card>
                <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">KG - NURSERY</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Kindergarten</h3>
                  <p className="text-muted-foreground text-sm">
                    Foundation years building core competencies in all subject areas with emphasis on literacy and numeracy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">PRY 1 - 6</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">PRIMARY</h3>
                  <p className="text-muted-foreground text-sm">
                    Foundation years building core competencies in all subject areas with emphasis on literacy and numeracy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">JSS 1-3</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Junior Secondary</h3>
                  <p className="text-muted-foreground text-sm">
                    Foundation years building core competencies in all subject areas with emphasis on literacy and numeracy.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">SSS 1-3</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Senior Secondary</h3>
                  <p className="text-muted-foreground text-sm">
                    Specialized tracks preparing students for WAEC, NECO, and JAMB examinations.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary mb-2">20-25</div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">Class Size</h3>
                  <p className="text-muted-foreground text-sm">
                    Small class sizes ensuring individual attention and personalized learning experiences.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Facilities */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                World-Class Facilities
              </h2>
              <p className="text-lg text-muted-foreground">
                Modern infrastructure supporting effective teaching and learning
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {facilities.map((facility, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <div className="p-3 bg-primary/10 rounded-lg">
                        <facility.icon className="h-8 w-8 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-2">
                          {facility.title}
                        </h3>
                        <p className="text-muted-foreground">
                          {facility.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Extracurricular Activities */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Extracurricular Activities
              </h2>
              <p className="text-lg text-muted-foreground">
                Beyond academics - developing talents, leadership skills, and personal interests
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Clubs & Societies</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extracurricular.slice(0, 4).map((activity, idx) => (
                      <Badge key={idx} variant="outline" className="mr-2 mb-2">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Sports & Athletics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extracurricular.slice(4, 8).map((activity, idx) => (
                      <Badge key={idx} variant="outline" className="mr-2 mb-2">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="text-center">
                  <Music className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Arts & Culture</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {extracurricular.slice(8, 12).map((activity, idx) => (
                      <Badge key={idx} variant="outline" className="mr-2 mb-2">
                        {activity}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Daily Schedule */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Typical School Day
              </h2>
              <p className="text-lg text-muted-foreground">
                Structured learning environment with balanced academic and recreational activities
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardContent className="p-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-foreground">7:30 - 8:00 AM</span>
                    <span className="text-muted-foreground">Morning Assembly & Prayers</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-foreground">8:00 - 11:30 AM</span>
                    <span className="text-muted-foreground">First Academic Session</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-foreground">11:30 - 12:00 PM</span>
                    <span className="text-muted-foreground">Break & Refreshments</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-foreground">11:00 - 1:00 PM</span>
                    <span className="text-muted-foreground">Second Academic Session</span>
                  </div>
                  <div className="flex justify-between items-center border-b border-border pb-3">
                    <span className="font-medium text-foreground">12:00 - 2:00 PM</span>
                    <span className="text-muted-foreground">Lunch Break & Prayers</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-foreground">2:00 - 4:00 PM</span>
                    <span className="text-muted-foreground">Madrasah & Study Period</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
};