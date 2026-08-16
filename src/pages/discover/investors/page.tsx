import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  listInvestorMatches,
  startOpportunity,
} from '@/lib/api';

export default function DiscoverInvestorsPage() {
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);
  const [dealCreated, setDealCreated] = useState(false);
  const [dealError, setDealError] = useState('');

  const createDeal = useMutation({
    mutationFn: startOpportunity,
    onMutate: () => {
      setDealError('');
    },
    onSuccess: () => {
      setDealCreated(true);
      setDealError('');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : 'Unable to start this Opportunity. Please try again.';

      setDealError(message);
    },
  });

  const { data = [], isLoading } = useQuery({
    queryKey: ['investorMatches', tier],
    queryFn: () => listInvestorMatches({ tier }),
  });

  const matches = useMemo(() => {
    return data.filter((m: any) => {
      const text = `${m.focus_sectors || ''} ${m.city || ''} ${m.country || ''}`.toLowerCase();
      return search ? text.includes(search.toLowerCase()) : true;
    });
  }, [data, search]);

  const tierStyle = (t: string) => {
    if (t === 'Gold') return 'text-yellow-300 border-yellow-400/70';
    if (t === 'Silver') return 'text-blue-300 border-blue-400/70';
    return 'text-orange-300 border-orange-400/70';
  };

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/75 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Discover Investors
        </div>
        <h1 className="text-3xl font-semibold mb-2">Backend AI-ranked investor matches</h1>
        <p className="text-sm text-gray-400">
          Scores come from the CRM matching engine. Investor identity remains protected while TD Venture manages the Opportunity.
        </p>
        <div className="mt-4 text-sm text-lime-300">
          Profile → Matching Engine → AI Match Score → Opportunity → Outreach → Deal Flow
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <aside className="border border-lime-500/60 bg-black/75 rounded-lg p-5 h-fit">
          <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-4">
            Match Filters
          </div>

          <div className="space-y-3">
            <input
              className="w-full bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Search focus, city, country..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            <select
              className="w-full bg-black border border-lime-500/50 rounded-md p-3"
              value={tier}
              onChange={(e) => setTier(e.target.value)}
            >
              <option value="">All Match Tiers</option>
              <option value="Gold">Gold 80%+</option>
              <option value="Silver">Silver 60%+</option>
              <option value="Bronze">Bronze 40%+</option>
            </select>

            <button
              type="button"
              className="w-full rounded-md border border-lime-500/60 p-3 text-lime-300"
              onClick={() => {
                setTier('');
                setSearch('');
              }}
            >
              Reset Filters
            </button>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-lime-300">
              {isLoading ? 'Loading AI-ranked matches...' : `${matches.length} backend-ranked investor matches`}
            </div>
            <div className="text-xs text-gray-400">
              Scores stored in PostgreSQL matches table
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {matches.map((m: any) => (
              <div key={m.id} className={`border ${tierStyle(m.tier)} bg-black/75 rounded-lg p-5`}>
                <div className="flex items-center justify-between mb-3">
                  <div className={`text-xs uppercase tracking-[0.25em] ${tierStyle(m.tier).split(' ')[0]}`}>
                    {m.tier} Match
                  </div>
                  <div className="text-lime-300 font-semibold">{m.match_score}%</div>
                </div>

                <div className="h-2 bg-gray-800 rounded-full mb-4">
                  <div className="h-2 bg-lime-400 rounded-full" style={{ width: `${m.match_score}%` }} />
                </div>

                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Investor Type:</span> {m.investor_category || m.investor_tier || 'Capital Partner'}</div>
                  <div><span className="text-gray-500">Focus:</span> {m.focus_sectors || 'Multi-sector'}</div>
                  <div><span className="text-gray-500">Region:</span> {[m.city, m.country].filter(Boolean).join(', ') || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Identity:</span> Protected</div>
                </div>

                {Array.isArray(m.reasons) && m.reasons.length > 0 && (
                  <div className="mt-4 border-t border-lime-500/30 pt-3">
                    <div className="text-xs uppercase tracking-[0.25em] text-lime-300 mb-2">Why matched</div>
                    <ul className="space-y-1 text-xs text-gray-400">
                      {m.reasons.slice(0, 4).map((r: string) => (
                        <li key={r}>✓ {r}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <button
                  type="button"
                  className="mt-5 w-full rounded-md bg-lime-400 text-black px-4 py-2 font-semibold"
                  onClick={() => {
                    setDealCreated(false);
                    setDealError('');
                    setSelectedMatch(m);
                  }}
                >
                  Open Opportunity
                </button>
              </div>
            ))}
          </div>
        </main>
      </div>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl border border-lime-500/70 bg-black rounded-xl p-6 shadow-[0_0_35px_rgba(163,255,18,0.25)]">
            <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
              Investor Opportunity
            </div>

            <h2 className="text-2xl font-semibold mb-2">
              Start investor opportunity
            </h2>

            <p className="text-sm text-gray-400 mb-5">
              Open this Opportunity to let TD Venture initiate and track investor outreach. Contact details remain protected at this stage.
            </p>

            <div className="border border-lime-500/40 rounded-lg p-4 mb-5 bg-lime-400/5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-400">Backend AI Match Score</span>
                <span className="text-lime-300 font-semibold">{selectedMatch.match_score}%</span>
              </div>
              <div className="h-2 bg-gray-800 rounded-full">
                <div className="h-2 bg-lime-400 rounded-full" style={{ width: `${selectedMatch.match_score}%` }} />
              </div>
              <div className="mt-3 text-sm text-gray-400">
                Current identity status:{' '}
                <span className="text-yellow-300">
                  Protected
                </span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div className="rounded-lg border border-lime-500/50 bg-lime-400/5 p-4">
                <div className="font-semibold text-lime-300">
                  Investor identity remains protected
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-400">
                  Starting this Opportunity asks TD Venture to initiate
                  and track investor outreach. Contact details are not
                  released merely because an Opportunity is opened.
                </p>
              </div>
            </div>

            {dealError && (
              <div className="mb-4 rounded-md border border-red-500/50 bg-red-500/10 p-4">
                <div className="font-semibold text-red-300">
                  Opportunity could not be started
                </div>
                <p className="mt-1 text-sm text-gray-300">
                  {dealError}
                </p>
              </div>
            )}

            {dealCreated && (
              <div className="border border-lime-500/60 rounded-md p-4 bg-lime-400/10 mb-4">
                <div className="font-semibold text-lime-300">Opportunity started: Interested.</div>
                <p className="text-sm text-gray-400 mt-1">
                  TD Venture will manage and track investor outreach through this Opportunity. The investor identity remains protected until the investor chooses to engage.
                </p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <button type="button" className="text-gray-400 hover:text-white" onClick={() => setSelectedMatch(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="rounded-md bg-lime-400 text-black px-5 py-2 font-semibold disabled:opacity-60"
                disabled={createDeal.isPending || dealCreated}
                onClick={() => {
                  createDeal.mutate({
                    match_id: selectedMatch.id,
                    startup_id: selectedMatch.startup_id,
                    investor_id: selectedMatch.investor_id,
                    direction: 'startup_to_investor',
                  });
                }}
              >
                {dealCreated
                  ? 'Opportunity Started'
                  : createDeal.isPending
                    ? 'Starting Opportunity...'
                    : 'Start Opportunity'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}