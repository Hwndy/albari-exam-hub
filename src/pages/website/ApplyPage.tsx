import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdmissionForm } from '@/components/website/AdmissionForm';
import { FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ApplyPage = () => {
  return (
    <div className="min-h-screen py-12 bg-gradient-to-b from-background to-card/20">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <Badge variant="secondary" className="mb-4">
              <FileText className="h-4 w-4 mr-2" />
              Admission Application
            </Badge>
            <h1 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
              Apply to Al-Bari College
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete the form below to submit your application. All fields marked with an asterisk (*) are required.
            </p>
          </div>

          {/* Important Notice */}
          <Alert className="mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please ensure all information provided is accurate. You will receive an application number upon successful submission, 
              which you can use to track your application status.
            </AlertDescription>
          </Alert>

          {/* Admission Form */}
          <Card className="border-0 shadow-xl">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Application Form</CardTitle>
            </CardHeader>
            <CardContent>
              <AdmissionForm />
            </CardContent>
          </Card>

          {/* Help Text */}
          <div className="mt-8 text-center text-sm text-muted-foreground">
            <p>
              Need help? Contact our admissions office at{' '}
              <a href="mailto:admissions@albari.edu.ng" className="text-primary hover:underline">
                admissions@albari.edu.ng
              </a>
              {' '}or call{' '}
              <a href="tel:+2341234567890" className="text-primary hover:underline">
                +234 802 815 2097
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
