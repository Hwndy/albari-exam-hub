import React, { useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface SessionMonitorProps {
  children: React.ReactNode;
}

export const SessionMonitor: React.FC<SessionMonitorProps> = ({ children }) => {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const tabSwitchCount = useRef(0);
  const lastActivity = useRef(Date.now());
  const warningShown = useRef(false);

  useEffect(() => {
    if (!user) return;

    let inactivityTimer: ReturnType<typeof setTimeout>;
    let tabSwitchTimer: ReturnType<typeof setTimeout>;

    // Track user activity
    const updateActivity = () => {
      lastActivity.current = Date.now();
    };

    // Handle page visibility changes (tab switching)
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCount.current += 1;
        
        if (tabSwitchCount.current >= 3 && !warningShown.current) {
          warningShown.current = true;
          toast({
            title: 'Security Warning',
            description: 'Multiple tab switches detected. Please stay on this page during the exam.',
            variant: 'destructive',
          });
        }

        if (tabSwitchCount.current >= 5) {
          toast({
            title: 'Session Terminated',
            description: 'Too many tab switches detected. Session has been ended for security.',
            variant: 'destructive',
          });
          
          tabSwitchTimer = setTimeout(async () => {
            await logout();
            navigate('/login');
          }, 2000);
        }
      }
    };

    // Disable right-click context menu for students only
    const handleContextMenu = (e: MouseEvent) => {
      const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';
      if (!isAdminOrTeacher) {
        e.preventDefault();
      }
    };

    // Disable certain keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      // Allow certain shortcuts for admin and teachers only
      const isAdminOrTeacher = user?.role === 'admin' || user?.role === 'teacher';
      
      // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J for students only
      if (!isAdminOrTeacher && (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J'))
      )) {
        e.preventDefault();
        toast({
          title: 'Action Blocked',
          description: 'This action is not allowed during the exam.',
          variant: 'destructive',
        });
      }

      // Allow Ctrl+U, Ctrl+C, Ctrl+V for admin and teachers, disable for students
      if (!isAdminOrTeacher && e.ctrlKey && ['u', 'c', 'v'].includes(e.key.toLowerCase())) {
        e.preventDefault();
        toast({
          title: 'Action Blocked',
          description: 'This action is not allowed during the exam.',
          variant: 'destructive',
        });
      }

      // Disable select all, save, cut for all users during exams
      if (e.ctrlKey && ['a', 's', 'x'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };

    // Check for inactivity
    const checkInactivity = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity.current;
      
      // 30 minutes of inactivity
      if (timeSinceActivity > 30 * 60 * 1000) {
        toast({
          title: 'Session Expired',
          description: 'You have been logged out due to inactivity.',
          variant: 'destructive',
        });
        logout();
        navigate('/login');
      }
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousemove', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('click', updateActivity);

    // Start inactivity timer
    inactivityTimer = setInterval(checkInactivity, 60000); // Check every minute

    return () => {
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousemove', updateActivity);
      document.removeEventListener('keypress', updateActivity);
      document.removeEventListener('click', updateActivity);
      
      if (inactivityTimer) clearInterval(inactivityTimer);
      if (tabSwitchTimer) clearTimeout(tabSwitchTimer);
    };
  }, [user, logout, navigate, toast]);

  return <>{children}</>;
};