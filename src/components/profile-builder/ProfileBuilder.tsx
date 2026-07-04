import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCurrentUser } from '@/lib/api';

export default function ProfileBuilder() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Profile Builder</h1>
      <p className="text-muted-foreground">
        Welcome, {(user as any)?.full_name || (user as any)?.email}. Your profile is set up.
      </p>
    </div>
  );
}
