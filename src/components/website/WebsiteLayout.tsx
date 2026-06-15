import React, { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/Logo';
import { Phone, Mail, MapPin, Facebook, Twitter, Instagram, Menu, X } from 'lucide-react';
import { useState } from 'react';

interface WebsiteLayoutProps {
  children: ReactNode;
}

const navigation = [
  { name: 'Home', href: '/website' },
  { name: 'About Us', href: '/website/about' },
  { name: 'School Life', href: '/website/school-life' },
  { name: 'Admissions', href: '/website/admissions' },
  { name: 'News & Events', href: '/website/news' },
  { name: 'Facilities', href: '/website/facilities' },
  { name: 'Portals', href: '/website/portals' },
];

export const WebsiteLayout: React.FC<WebsiteLayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isActivePath = (path: string) => {
    if (path === '/website' && location.pathname === '/website') return true;
    if (path !== '/website' && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        {/* Top bar with contact info */}
        <div className="border-b border-border/50 bg-primary/5">
          <div className="container mx-auto px-4 py-2">
            <div className="flex justify-between items-center text-sm">
              <div className="flex items-center space-x-6 text-muted-foreground">
                <div className="flex items-center space-x-1">
                  <Phone className="h-3 w-3" />
                  <span>+234 802 815 2097</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>info@albari.edu.ng</span>
                </div>
                <div className="hidden md:flex items-center space-x-1">
                  <MapPin className="h-3 w-3" />
                  <span>Lagos, Nigeria</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-4 w-4" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-4 w-4" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Main navigation */}
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <Logo size="lg" />
              <div className="hidden md:block">
                <h1 className="text-lg font-bold text-foreground">Al-Bari College</h1>
                <p className="text-sm text-muted-foreground">Excellence in Education</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`text-sm font-medium transition-colors hover:text-primary ${
                    isActivePath(item.href)
                      ? 'text-primary border-b-2 border-primary pb-1'
                      : 'text-foreground/80'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          </div>

          {/* Mobile Navigation */}
          {isMobileMenuOpen && (
            <nav className="lg:hidden border-t border-border py-4">
              <div className="flex flex-col space-y-4">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`text-sm font-medium transition-colors hover:text-primary ${
                      isActivePath(item.href) ? 'text-primary' : 'text-foreground/80'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {item.name}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="min-h-screen">
        {children}
      </main>

      {/* Footer */}
      <footer className="bg-card border-t border-border mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* School Info */}
            <div className="md:col-span-2">
              <div className="flex items-center space-x-4 mb-4">
                <Logo size="md" />
                <div>
                  <h3 className="text-lg font-bold text-foreground">Al-Bari College</h3>
                  <p className="text-sm text-muted-foreground">Building Tomorrow's Leaders Today</p>
                </div>
              </div>
              <p className="text-muted-foreground mb-4">
                Al-Bari College is committed to providing quality education that nurtures the intellectual, 
                moral, and social development of our students, preparing them for success in an ever-changing world.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Facebook className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Twitter className="h-5 w-5" />
                </a>
                <a href="#" className="text-muted-foreground hover:text-primary transition-colors">
                  <Instagram className="h-5 w-5" />
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><Link to="/website/about" className="text-muted-foreground hover:text-primary transition-colors">About Us</Link></li>
                <li><Link to="/website/admissions" className="text-muted-foreground hover:text-primary transition-colors">Admissions</Link></li>
                <li><Link to="/website/school-life" className="text-muted-foreground hover:text-primary transition-colors">Academics</Link></li>
                <li><Link to="/website/news" className="text-muted-foreground hover:text-primary transition-colors">News & Events</Link></li>
                <li><Link to="/website/portals" className="text-muted-foreground hover:text-primary transition-colors">Portals</Link></li>
              </ul>
            </div>

            {/* Contact Info */}
            <div>
              <h3 className="font-semibold text-foreground mb-4">Contact Info</h3>
              <div className="space-y-3 text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>Lagos, Nigeria</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-primary" />
                  <span>+234 802 815 2097</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Mail className="h-4 w-4 text-primary" />
                  <span>info@albari.edu.ng</span>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-border mt-8 pt-8 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Al-Bari College. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};