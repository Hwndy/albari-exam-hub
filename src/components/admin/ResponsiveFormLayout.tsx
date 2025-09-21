import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveFormLayoutProps {
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveFormLayout: React.FC<ResponsiveFormLayoutProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn(
      "w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8",
      "space-y-6",
      className
    )}>
      {children}
    </div>
  );
};

interface FormSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  children,
  className
}) => {
  return (
    <div className={cn("space-y-4", className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && (
            <h3 className="text-lg font-semibold leading-none tracking-tight">
              {title}
            </h3>
          )}
          {description && (
            <p className="text-sm text-muted-foreground">
              {description}
            </p>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

interface FormGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export const FormGrid: React.FC<FormGridProps> = ({
  children,
  columns = 2,
  className
}) => {
  const gridClasses = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3", 
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4"
  };

  return (
    <div className={cn(
      "grid gap-4",
      gridClasses[columns],
      className
    )}>
      {children}
    </div>
  );
};

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
  fullWidth?: boolean;
}

export const FormField: React.FC<FormFieldProps> = ({
  children,
  className,
  fullWidth = false
}) => {
  return (
    <div className={cn(
      "space-y-2",
      fullWidth && "md:col-span-2 lg:col-span-3",
      className
    )}>
      {children}
    </div>
  );
};

interface MobileStackProps {
  children: React.ReactNode;
  className?: string;
}

export const MobileStack: React.FC<MobileStackProps> = ({
  children,
  className
}) => {
  return (
    <div className={cn(
      "flex flex-col space-y-3",
      "sm:flex-row sm:space-y-0 sm:space-x-3",
      "sm:items-end",
      className
    )}>
      {children}
    </div>
  );
};