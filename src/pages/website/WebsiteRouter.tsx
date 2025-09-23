import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { WebsiteLayout } from '@/components/website/WebsiteLayout';
import { HomePage } from '@/pages/website/HomePage';
import { AboutPage } from '@/pages/website/AboutPage';
import { SchoolLifePage } from '@/pages/website/SchoolLifePage';
import { AdmissionsPage } from '@/pages/website/AdmissionsPage';
import { NewsPage } from '@/pages/website/NewsPage';
import { FacilitiesPage } from '@/pages/website/FacilitiesPage';
import { PortalsPage } from '@/pages/website/PortalsPage';

export const WebsiteRouter = () => {
  return (
    <WebsiteLayout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/school-life" element={<SchoolLifePage />} />
        <Route path="/admissions" element={<AdmissionsPage />} />
        <Route path="/news" element={<NewsPage />} />
        <Route path="/news/:slug" element={<NewsPage />} />
        <Route path="/facilities" element={<FacilitiesPage />} />
        <Route path="/portals" element={<PortalsPage />} />
      </Routes>
    </WebsiteLayout>
  );
};