import { useQuery } from '@tanstack/react-query';
import { adminListUsers } from '@/lib/api';
import { Authenticated } from '@/components/AuthGuard';

export default function PartnersPage() {
  const { data: users = [] } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: adminListUsers,
  });

  const partners = users.filter((u: any) => u.role === 'partner');

  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Partners ({partners.length})</h1>
        {partners.length === 0 ? (
          <p className="text-muted-foreground">No partners yet.</p>
        ) : (
          <div className="space-y-2">
            {partners.map((p: any) => (
              <div key={p.id} className="border rounded-md p-3">
                <div className="font-medium">{p.full_name || p.email}</div>
                <div className="text-sm text-muted-foreground">{p.email}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Authenticated>
  );
}
