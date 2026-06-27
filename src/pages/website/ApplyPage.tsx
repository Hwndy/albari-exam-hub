import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AdmissionForm } from '@/components/website/AdmissionForm';
import { FileText, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const ApplyPage = () => {
  return (
    <div className="min-h-screen py-8 sm:py-12 bg-gradient-to-b from-background to-card/20">
      <div className="container mx-auto px-3 sm:px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <Badge variant="secondary" className="mb-4">
              <FileText className="h-4 w-4 mr-2" />
              Admission Application
            </Badge>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-3 sm:mb-4">
              Apply to Al-Bari Group of Schools
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-2xl mx-auto">
              Complete the form below to submit your application. All fields marked with an asterisk (*) are required.
            </p>
          </div>

          {/* Important Notice */}
          <Alert className="mb-6 sm:mb-8">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Please ensure all information provided is accurate. You will receive an application number upon successful submission, 
              which you can use to track your application status.
            </AlertDescription>
          </Alert>

          {/* Admission Form (provides its own card shell) */}
          <AdmissionForm />

          {/* Help Text */}
          <div className="mt-6 sm:mt-8 text-center text-xs sm:text-sm text-muted-foreground px-2">
            <p>
              Need help? Contact our admissions office at{' '}
              <a href="mailto:admissions@albari.com.ng" className="text-primary hover:underline break-all">
                admissions@albari.com.ng
              </a>
              {' '}or call{' '}
              <a href="tel:+2348028152097" className="text-primary hover:underline whitespace-nowrap">
                +234 802 815 2097
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
