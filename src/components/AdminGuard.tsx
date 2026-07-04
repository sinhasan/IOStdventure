import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/api';

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });
  if (isLoading) return null;
  if ((user as any)?.role !== 'admin') {
    return <p className="p-6 text-red-500">Access denied.</p>;
  }
  return <>{children}</>;
}
