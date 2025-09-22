import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
}) => {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center space-x-2 sm:space-x-4">
              <Logo size="md" />
              <div>
                <p className="text-sm text-muted-foreground">{title}</p>
              </div>
            </div>
            
            <div className="flex items-center justify-between w-full sm:w-auto gap-3">
              <div className="text-left sm:text-right">
                <p className="font-medium text-foreground text-sm sm:text-base">{user?.name}</p>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize">
                  {user?.role} {user?.class && `• ${user.class}`} {user?.subject && `• ${user.subject}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-1 sm:space-x-2 shrink-0"
              >
                <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-2 sm:px-4 py-4 sm:py-8">
        {children}
      </main>
    </div>
  );
};