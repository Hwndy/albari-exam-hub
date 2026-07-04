import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut } from 'lucide-react';
import { Logo } from '@/components/shared/Logo';
import { useIsMobile } from '@/hooks/use-mobile';
interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
}) => {
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-accent/10">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Logo size={isMobile ? "sm" : "md"} />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Desktop User Info */}
              {!isMobile && (
                <div className="text-right">
                  <p className="font-medium text-foreground">{user?.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {user?.role} {user?.class && `• ${user.class}`} {user?.subject && `• ${user.subject}`}
                  </p>
                </div>
              )}
              
              {/* Mobile User Info */}
              {isMobile && (
                <div className="text-right">
                  <p className="font-medium text-foreground text-sm truncate max-w-[120px]">{user?.name}</p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {user?.role}
                  </p>
                </div>
              )}
              
              <Button
                variant="outline"
                size={isMobile ? "sm" : "sm"}
                onClick={handleLogout}
                className={`flex items-center ${isMobile ? 'px-2' : 'space-x-2'}`}
              >
                <LogOut className="h-4 w-4" />
                {!isMobile && <span>Logout</span>}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4 sm:py-6 lg:py-8">
        {children}
      </main>
    </div>
  );
};