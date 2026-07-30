import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  actionLabel?: string;
  actionHref?: string;
  children?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  actionHref,
  children,
}) => (
  <Card className="border-dashed bg-muted/30">
    <CardContent className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>}
      {actionLabel && actionHref && (
        <Button className="mt-6 rounded-full" asChild>
          <Link to={actionHref}>{actionLabel}</Link>
        </Button>
      )}
      {children && <div className="mt-6">{children}</div>}
    </CardContent>
  </Card>
);

export default EmptyState;