import React from 'react';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';
import { ApplicationTracker } from '@/components/website/ApplicationTracker';

export const TrackApplicationPage = () => {
  return (
    <WebsiteLayout>
      <div className="min-h-screen py-12">
        <ApplicationTracker />
      </div>
    </WebsiteLayout>
  );
};