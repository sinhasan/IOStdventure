import { useQuery } from '@tanstack/react-query';
import { getMatches } from '@/lib/api';
import { Authenticated } from '@/components/AuthGuard';

export default function ConnectionsPage() {
  const { data: matches = [] } = useQuery({
    queryKey: ['matches'],
    queryFn: getMatches,
  });

  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Connections ({matches.length})</h1>
        {matches.length === 0 ? (
          <p className="text-muted-foreground">No connections yet.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((m: any) => (
              <li key={m.id} className="border rounded-md p-3">
                Connection with {m.target_type} – {m.status || 'pending'}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Authenticated>
  );
}
