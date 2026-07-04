import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDashboardStats, recalculateMatches } from '@/lib/api';

export default function DashboardPage() {
  const hasToken = Boolean(localStorage.getItem('tdventure_token'));
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['crmDashboard'],
    queryFn: getDashboardStats,
    enabled: hasToken,
  });

  const recalc = useMutation({
    mutationFn: recalculateMatches,
    onSuccess: () => {
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['crmDashboard'] });
      }, 1500);
    },
  });

  const cards = [
    { label: 'Startups', value: stats?.startups ?? 0 },
    { label: 'Investors', value: stats?.investors ?? 0 },
    { label: 'AI Matches', value: stats?.connections ?? 0 },
    { label: 'Payments', value: stats?.payments ?? 0 },
    { label: 'New Startups - 7 Days', value: stats?.recent_startups ?? 0 },
    { label: 'New Investors - 7 Days', value: stats?.recent_investors ?? 0 },
  ];

  if (!hasToken) {
    return (
      <div className="p-8">
        <h1 className="text-3xl font-semibold text-white mb-2">TD Venture Deal Desk</h1>
        <p className="text-lime-300 mb-6">Professional fundraising workspace</p>

        <div className="border border-lime-500/60 rounded-lg p-6 max-w-2xl bg-black/70">
          <h2 className="text-xl font-semibold mb-2">Please login to start</h2>
          <p className="text-sm text-gray-400 mb-4">
            Register, discover, connect, reveal and manage opportunities in Deal Flow.
          </p>
          <Link to="/login" className="inline-block rounded-md bg-lime-400 text-black px-5 py-2 font-semibold">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">TD Venture Deal Desk</h1>
        <p className="text-sm text-lime-300">Fundraising operations dashboard</p>
      </div>

      {isLoading && <p className="text-sm text-gray-400">Loading dashboard...</p>}

      {error && (
        <div className="border border-lime-500/60 rounded-md p-4 bg-black/70">
          <p className="text-sm text-lime-300">Refreshing your dashboard...</p>
          <p className="text-xs text-gray-400 mt-1">
            If this continues, logout and login again.
          </p>
        </div>
      )}

      {!isLoading && !error && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {cards.map((card) => (
              <div key={card.label} className="border border-lime-500/60 rounded-md p-4 bg-black/70">
                <div className="text-sm text-gray-400">{card.label}</div>
                <div className="text-3xl font-bold mt-2 text-white">{card.value}</div>
              </div>
            ))}
          </div>

          <div className="border border-lime-500/60 rounded-md p-4 bg-black/70">
            <h2 className="font-medium mb-2">Process Flow</h2>
            <p className="text-sm text-gray-400 mb-4">
              Register → Discover → Connect → Reveal → Deal Flow
            </p>

            <button
              type="button"
              onClick={() => recalc.mutate()}
              disabled={recalc.isPending}
              className="rounded-md bg-lime-400 text-black px-4 py-2 font-semibold disabled:opacity-60"
            >
              {recalc.isPending ? 'Recalculating Matches...' : 'Recalculate AI Matches'}
            </button>

            {recalc.isPending && (
              <p className="text-sm text-lime-300 mt-3">
                AI Match Engine running. Refreshing dashboard shortly...
              </p>
            )}

            {recalc.isSuccess && (
              <p className="text-sm text-lime-300 mt-3">
                Matching in progress / completed. Refresh to see the latest AI matches.
              </p>
            )}

            {recalc.isError && (
              <p className="text-sm text-yellow-300 mt-3">
                Matching in progress. Refresh to see the latest.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
