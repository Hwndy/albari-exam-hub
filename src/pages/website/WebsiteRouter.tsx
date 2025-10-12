import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';
import { HomePage } from './HomePage';
import { AboutPage } from './AboutPage';
import { SchoolLifePage } from './SchoolLifePage';
import { AdmissionsPage } from './AdmissionsPage';
import { NewsPage } from './NewsPage';
import { FacilitiesPage } from './FacilitiesPage';
import { PortalsPage } from './PortalsPage';
import { TrackApplicationPage } from './TrackApplicationPage';
import { ApplyPage } from './ApplyPage';
import { AcceptOfferPage } from './AcceptOfferPage';

export const WebsiteRouter = () => {
  return (
    <WebsiteLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/school-life" element={<SchoolLifePage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/admissions/apply" element={<ApplyPage />} />
        <Route path="/track-application" element={<TrackApplicationPage />} />
        <Route path="/accept-offer/:token" element={<AcceptOfferPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/portals" element={<PortalsPage />} />
      </Routes>
    </WebsiteLayout>
  );
};