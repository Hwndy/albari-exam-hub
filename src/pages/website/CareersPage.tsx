import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SEO } from '@/components/website/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

export const CareersPage: React.FC = () => {
  const [jobs, setJobs] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from('job_openings')
      .select('*')
      .eq('is_open', true)
      .order('created_at', { ascending: false })
      .then(({ data }) => setJobs(data || []));
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <SEO
        title="Careers | Al-Bari Model Schools"
        description="Join our team. Explore teaching and support staff opportunities at Al-Bari Model Schools."
      />
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-3">Careers</h1>
          <p className="text-muted-foreground text-lg">
            Passionate educators and dedicated staff make Al-Bari what it is. Explore current openings below.
          </p>
        </div>

        {jobs.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-lg text-muted-foreground">No open positions at the moment.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Please check back soon or email us at{' '}
                <a className="text-primary underline" href="mailto:careers@albari.com.ng">careers@albari.com.ng</a>.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <Card key={job.id}>
                <CardHeader>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <div className="flex flex-wrap gap-2 mt-2 text-sm text-muted-foreground items-center">
                        {job.department && <Badge variant="outline">{job.department}</Badge>}
                        <Badge variant="secondary" className="capitalize">{job.employment_type.replace('_', ' ')}</Badge>
                        {job.location && <span>{job.location}</span>}
                      </div>
                    </div>
                    {job.closes_on && (
                      <span className="text-sm text-muted-foreground">
                        Closes {format(new Date(job.closes_on), 'MMM d, yyyy')}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed">{job.description}</p>
                  {job.requirements && (
                    <div>
                      <h3 className="font-semibold mb-1">Requirements</h3>
                      <p className="whitespace-pre-line text-sm text-muted-foreground">{job.requirements}</p>
                    </div>
                  )}
                  <Button asChild>
                    <a href={`mailto:${job.apply_email}?subject=Application: ${encodeURIComponent(job.title)}`}>
                      Apply via Email
                    </a>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CareersPage;