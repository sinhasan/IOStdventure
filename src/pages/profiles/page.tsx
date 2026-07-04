import { useQuery } from '@tanstack/react-query';
import { adminListUsers, getCurrentUser } from '@/lib/api';
import { Authenticated } from '@/components/AuthGuard';

export default function ProfilesPage() {
  const { data: profiles = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminListUsers,
  });
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  const startups = profiles.filter((p: any) => p.role === 'startup');
  const investors = profiles.filter((p: any) => p.role === 'investor');

  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Profiles</h1>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="border rounded-md p-4">
            <div className="text-sm text-muted-foreground">Startups</div>
            <div className="text-2xl font-bold">{startups.length}</div>
          </div>
          <div className="border rounded-md p-4">
            <div className="text-sm text-muted-foreground">Investors</div>
            <div className="text-2xl font-bold">{investors.length}</div>
          </div>
        </div>
        <div className="border rounded-md p-4">
          <h2 className="font-medium mb-2">All Users</h2>
          {profiles.length === 0 ? (
            <p className="text-muted-foreground">No users.</p>
          ) : (
            <ul className="space-y-1">
              {profiles.map((u: any) => (
                <li key={u.id} className="text-sm flex justify-between">
                  <span>{u.full_name || u.email}</span>
                  <span className="text-muted-foreground">{u.role || 'user'}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Authenticated>
  );
}
