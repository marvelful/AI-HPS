import React from 'react';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="text-muted-foreground/40 mb-4">{icon}</div>
      <h3 className="font-semibold text-foreground mb-1" style={{ fontSize: '16px' }}>{title}</h3>
      <p className="text-muted-foreground mb-4" style={{ fontSize: '14px' }}>{description}</p>
      {action}
    </div>
  );
}