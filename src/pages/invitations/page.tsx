import { useQuery } from '@/lib/react-query-client';
import { Authenticated } from '@/components/AuthGuard';

export default function InvitationsPage() {
  const { data: invitations = [] } = useQuery('api.invitations.list');
  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Invitations</h1>
        {!(invitations as any[]).length ? (
          <p className="text-muted-foreground">No invitations yet.</p>
        ) : (
          <ul className="space-y-2">
            {(invitations as any[]).map((inv) => (
              <li key={inv.id} className="border rounded-md p-3">
                {inv.email} – {inv.status}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Authenticated>
  );
}
