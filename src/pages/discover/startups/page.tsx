import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listStartupMatches } from '@/lib/api';

export default function DiscoverStartupsPage() {
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const { data = [], isLoading } = useQuery({
    queryKey: ['startupMatches', tier],
    queryFn: () => listStartupMatches({ tier }),
  });

  const matches = useMemo(() => {
    return data.filter((m: any) => {
      const text = `${m.sector || ''} ${m.stage || ''} ${m.city || ''} ${m.country || ''} ${m.ask || ''}`.toLowerCase();
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
          Discover Startups
        </div>
        <h1 className="text-3xl font-semibold mb-2">Backend AI-ranked startup matches</h1>
        <p className="text-sm text-gray-400">
          Scores come from the CRM matching engine. Founder identity remains protected until Connect → Payment → Reveal.
        </p>
        <div className="mt-4 text-sm text-lime-300">
          Profile → Matching Engine → AI Match Score → Connect → Reveal → Deal Flow
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
              placeholder="Search sector, stage, city, ask..."
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
              {isLoading ? 'Loading AI-ranked startup matches...' : `${matches.length} backend-ranked startup matches`}
            </div>
            <div className="text-xs text-gray-400">
              Founder identity protected until reveal
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
                  <div><span className="text-gray-500">Sector:</span> {m.sector || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Stage:</span> {m.stage || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Ask:</span> {m.ask || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Region:</span> {[m.city, m.country].filter(Boolean).join(', ') || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Startup:</span> Protected</div>
                  <div><span className="text-gray-500">Founder:</span> Protected until reveal</div>
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
                  onClick={() => setSelectedMatch(m)}
                >
                  Connect
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
              Connect Request
            </div>

            <h2 className="text-2xl font-semibold mb-2">
              Reveal protected startup identity
            </h2>

            <p className="text-sm text-gray-400 mb-5">
              Use reveal credits or purchase an access plan to unlock startup name, founder, email, LinkedIn and contact details.
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
                Current identity status: <span className="text-yellow-300">Protected</span>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <button className="w-full text-left border border-lime-500/50 rounded-lg p-4 hover:bg-lime-400 hover:text-black">
                <div className="font-semibold">Use 1 Reveal Credit</div>
                <div className="text-sm opacity-80">Recommended if you already have credits.</div>
              </button>
              <button className="w-full text-left border border-blue-500/50 rounded-lg p-4 hover:bg-blue-400 hover:text-black">
                <div className="font-semibold">Buy 10 Reveals — ₹999</div>
                <div className="text-sm opacity-80">Best for active investor discovery.</div>
              </button>
              <button className="w-full text-left border border-yellow-500/50 rounded-lg p-4 hover:bg-yellow-300 hover:text-black">
                <div className="font-semibold">Sector Startup Pass — ₹19,999</div>
                <div className="text-sm opacity-80">Unlock startups in one selected sector.</div>
              </button>
              <button className="w-full text-left border border-red-500/50 rounded-lg p-4 hover:bg-red-400 hover:text-black">
                <div className="font-semibold">All Startups — ₹99,999</div>
                <div className="text-sm opacity-80">Full startup database access.</div>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <button type="button" className="text-gray-400 hover:text-white" onClick={() => setSelectedMatch(null)}>
                Cancel
              </button>
              <button type="button" className="rounded-md bg-lime-400 text-black px-5 py-2 font-semibold" onClick={() => { setSelectedMatch(null); window.location.href = '/payments'; }}>
                Continue to Payments
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
