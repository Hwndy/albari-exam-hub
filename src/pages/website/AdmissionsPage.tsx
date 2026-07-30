import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, FileText, CreditCard, Calendar, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '@/components/website/SEO';
import { PageHero } from '@/components/website/PageHero';
import { useWebsiteSettings, settingValue } from '@/hooks/useCms';

export const AdmissionsPage = () => {
  const { settings } = useWebsiteSettings();
  const brochureUrl = settingValue<string>(settings, 'prospectus_url', '');
  const admissionSteps = [
    {
      step: 1,
      title: "Submit Application",
      description: "Complete and submit the online admission form with required documents",
      icon: FileText
    },
    {
      step: 2,
      title: "Entrance Examination",
      description: "Attend the scheduled entrance examination and interview",
      icon: Users
    },
    {
      step: 3,
      title: "Payment of Fees",
      description: "Pay admission and first term fees upon acceptance",
      icon: CreditCard
    },
    {
      step: 4,
      title: "Resume Classes",
      description: "Join your assigned class and begin your Al-Bari journey",
      icon: CheckCircle
    }
  ];

  const requirements = [
    "Birth Certificate or Age Declaration",
    "Previous School Report Card/Transcript", 
    "Passport Photographs (4 copies)",
    "Medical Certificate of Fitness",
    "Primary Six Leaving Certificate (for JSS1)",
    "JSS3 Certificate (for SSS1)",
    "Letter of Good Conduct from Previous School"
  ];

  const feeStructure = [
    { class: "JSS 1-3", admission: "₦25,000", tuition: "₦45,000", uniform: "₦15,000" },
    { class: "SSS 1-3", admission: "₦30,000", tuition: "₦50,000", uniform: "₦18,000" }
  ];

  return (
    <div className="space-y-0">
      <SEO
        title="Admissions — Al-Bari Group of Schools"
        description="Admission requirements, process, and important dates for Al-Bari Group of Schools. Apply online for nursery, primary, and secondary placement."
        path="/website/admissions"
      />
      {/* Hero Section */}
      <PageHero
        eyebrow="Join Al-Bari Group of Schools"
        title="Begin Your Journey to"
        highlight="Academic Excellence"
        subtitle="We welcome bright, motivated students who are ready to embrace our culture of excellence, integrity, and character development. Start your application today."
        crumbs={[{ label: 'Admissions' }]}
      >
        <Button size="lg" asChild className="w-full rounded-full px-7 sm:w-auto">
          <Link to="/website/admissions/apply">
            Start Application <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </Button>
        <Button variant="outline" size="lg" asChild className="w-full rounded-full px-7 sm:w-auto">
          <Link to="/website/track-application">Track Application</Link>
        </Button>
      </PageHero>

      {/* Why Choose Al-Bari */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Why Choose Al-Bari Group of Schools?
              </h2>
              <p className="text-lg text-muted-foreground">
                Discover the advantages that make us the preferred choice for quality education
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>98% Success Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Outstanding performance in WAEC, NECO, and JAMB examinations with consistent excellent results.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Small Class Sizes</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Maximum of 25 students per class ensuring personalized attention and optimal learning outcomes.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <FileText className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Modern Curriculum</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Updated curriculum incorporating technology, critical thinking, and 21st-century skills.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Qualified Teachers</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Experienced and certified educators committed to student success and character development.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Holistic Development</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Balanced focus on academics, character, sports, and extracurricular activities.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <CardHeader className="text-center">
                  <CreditCard className="h-12 w-12 text-primary mx-auto mb-4" />
                  <CardTitle>Affordable Fees</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-muted-foreground">
                    Quality education at competitive rates with flexible payment options available.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Admission Process */}
      <section className="py-16 bg-card/30">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Admission Process
              </h2>
              <p className="text-lg text-muted-foreground">
                Simple and transparent admission process designed for your convenience
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {admissionSteps.map((step, index) => (
                <Card key={index} className="border-0 shadow-lg relative">
                  <CardHeader className="text-center">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary-foreground">{step.step}</span>
                    </div>
                    <step.icon className="h-8 w-8 text-primary mx-auto mb-2" />
                    <CardTitle className="text-lg">{step.title}</CardTitle>
                  </CardHeader>
                  <CardContent className="text-center">
                    <p className="text-muted-foreground text-sm">
                      {step.description}
                    </p>
                  </CardContent>
                  {index < admissionSteps.length - 1 && (
                    <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2">
                      <ArrowRight className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Requirements */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
                Admission Requirements
              </h2>
              <p className="text-lg text-muted-foreground">
                Documents needed to complete your application
              </p>
            </div>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="text-xl text-center">Required Documents</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requirements.map((requirement, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <CheckCircle className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{requirement}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Information */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              Ready to Apply?
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Take the first step towards joining our community of excellence. 
              Our admissions team is ready to guide you through the process.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
              <Button size="lg" asChild>
                <Link to="/website/admissions/apply">
                  Apply Online <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link to="/website/track-application">
                  Track Application
                </Link>
              </Button>
              {brochureUrl ? (
                <Button variant="outline" size="lg" asChild>
                  <a href={brochureUrl} target="_blank" rel="noopener noreferrer">
                    Download Brochure
                  </a>
                </Button>
              ) : null}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div>
                <h3 className="font-semibold text-foreground mb-2">Admissions Office</h3>
                <p className="text-muted-foreground">+234 802 815 2097</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Email</h3>
                <p className="text-muted-foreground">admissions@albari.edu.ng</p>
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-2">Office Hours</h3>
                <p className="text-muted-foreground">Mon-Fri: 8AM - 4PM</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};