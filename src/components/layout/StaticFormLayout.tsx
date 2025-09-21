import React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface StaticFormLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export const StaticFormLayout: React.FC<StaticFormLayoutProps> = ({
  children,
  header,
  footer,
  className
}) => {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Static Header */}
      {header && (
        <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
          {header}
        </div>
      )}
      
      {/* Scrollable Content */}
      <ScrollArea className="flex-1">
        <div className="p-6">
          {children}
        </div>
      </ScrollArea>
      
      {/* Static Footer */}
      {footer && (
        <div className="flex-shrink-0 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky bottom-0 z-10 p-4">
          {footer}
        </div>
      )}
    </div>
  );
};