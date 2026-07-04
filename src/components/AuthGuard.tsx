import React from 'react';
import { Navigate } from 'react-router-dom';
import { useCurrentUser } from '@/hooks/useCurrentUser';

export function Authenticated({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return <div className="flex items-center justify-center h-screen"><p className="text-muted-foreground">Loading...</p></div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function Unauthenticated({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}
