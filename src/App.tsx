import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { SessionMonitor } from '@/components/security/SessionMonitor';
import { StudentDashboard } from '@/pages/StudentDashboard';
import { TeacherDashboard } from '@/pages/TeacherDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { AuthPage } from '@/pages/AuthPage';
import { ExamInstructionsPage } from '@/pages/ExamInstructionsPage';
import { ExamPage } from '@/pages/ExamPage';
import { ExamResultsPage } from '@/pages/ExamResultsPage';
import NotFound from '@/pages/NotFound';

const queryClient = new QueryClient();

// Dashboard Router Component
const DashboardRouter = () => {
  const { user } = useAuth();
  
  if (!user) return <Navigate to="/login" replace />;
  
  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <Navigate to="/login" replace />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AuthProvider>
        <BrowserRouter>
          <SessionMonitor>
            <Routes>
              {/* Redirect root to dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Login route */}
              <Route path="/login" element={<AuthPage />} />
              
              {/* Protected dashboard routes */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardRouter />
                  </ProtectedRoute>
                }
              />
            
            {/* Role-specific routes */}
            <Route
              path="/student/*"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <StudentDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/*"
              element={
                <ProtectedRoute allowedRoles={['teacher']}>
                  <TeacherDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/*"
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            
            {/* Exam route with instructions and results */}
            <Route
              path="/exam/instructions/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ExamInstructionsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['student', 'teacher', 'admin']}>
                  <ExamPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/exam/results/:sessionId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <ExamResultsPage />
                </ProtectedRoute>
              }
            />
            
            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
            </Routes>
          </SessionMonitor>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
