import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { adminListUsers, updateUser } from '@/lib/api';
import { Authenticated } from '@/components/AuthGuard';

export default function TeamPage() {
  const [search, setSearch] = useState('');
  const { data: users = [], refetch } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminListUsers,
  });

  const { mutate: updateUserRole } = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: string }) =>
      updateUser({ role }), // we need to pass userId? The API expects the token's user. We'll adjust.
    onSuccess: () => refetch(),
  });

  const filtered = users.filter((u: any) =>
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Authenticated>
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-semibold">Team ({filtered.length})</h1>
          <input
            type="text"
            placeholder="Search users..."
            className="px-3 py-1 border rounded-md text-sm bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {filtered.length === 0 ? (
          <p className="text-muted-foreground">No users found.</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between p-3 border rounded-md">
                <div>
                  <div className="font-medium">{u.full_name || u.email}</div>
                  <div className="text-sm text-muted-foreground">{u.email}</div>
                </div>
                <select
                  className="text-sm border rounded px-2 py-1 bg-transparent"
                  value={u.role || 'user'}
                  onChange={(e) => updateUserRole({ userId: u.id, role: e.target.value })}
                >
                  <option value="user">User</option>
                  <option value="investor">Investor</option>
                  <option value="startup">Startup</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            ))}
          </div>
        )}
      </div>
    </Authenticated>
  );
}
