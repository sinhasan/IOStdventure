import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getInvestorMatchInventory, startOpportunity } from '@/lib/api';

const PAGE_SIZE = 24;
const TIERS = ['All', 'Gold', 'Silver', 'Bronze', 'Coal'] as const;

function money(value: unknown) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) return 'Not verified';
  return `$${number.toLocaleString('en-US')}`;
}

function reasonText(reason: unknown) {
  if (typeof reason === 'string') return reason;
  if (reason && typeof reason === 'object') {
    const item = reason as Record<string, unknown>;
    return String(item.reason || item.label || item.name || '').trim();
  }
  return '';
}

export default function InvestorMatchesPage() {
  const [tier, setTier] = useState<(typeof TIERS)[number]>('All');
  const [page, setPage] = useState(0);
  const [startError, setStartError] = useState<{ matchId: string; message: string } | null>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const offset = page * PAGE_SIZE;

  const query = useQuery({
    queryKey: ['investorMatchInventory', tier, page],
    queryFn: () =>
      getInvestorMatchInventory({
        tier: tier === 'All' ? undefined : tier,
        limit: PAGE_SIZE,
        offset,
      }),
    staleTime: 60 * 1000,
  });

  const items = Array.isArray(query.data?.items) ? query.data.items : [];
  const total = Number(query.data?.total || 0);
  const direction = String(query.data?.direction || 'startup_to_investor');
  const isInvestorView = direction === 'investor_to_startup';
  const from = total ? offset + 1 : 0;
  const to = Math.min(offset + PAGE_SIZE, total);
  const hasNext = offset + PAGE_SIZE < total;

  const opportunityMutation = useMutation({
    mutationFn: (match: any) =>
      startOpportunity({
        match_id: match.match_id ?? (match.exploratory ? null : match.id),
        startup_id: match.startup_id,
        investor_id: match.investor_id,
        direction: match.direction || direction,
      }),
    onMutate: (match: any) => {
      setStartError(null);
      return { matchId: String(match.id) };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      navigate('/opportunities');
    },
    onError: (error: unknown, match: any) => {
      const message =
        error instanceof Error && error.message
          ? error.message
          : 'The opportunity could not be started. Your match remains unchanged.';
      setStartError({ matchId: String(match.id), message });
    },
  });

  return (
    <div className="mx-auto max-w-[1800px] pb-16">
      <section className="rounded-xl border border-lime-500/50 bg-black/75 p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-lime-300">
          {isInvestorView ? 'Canonical startup matching' : 'Canonical investor matching'}
        </p>
        <div className="mt-2 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-semibold text-white">
              {isInvestorView ? 'Startup Matches' : 'Available Investor Opportunities'}
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              {isInvestorView
                ? 'Every stored startup match for your investor mandate, ranked by sector, stage, geography and USD ticket alignment. Founder identity remains protected until reveal.'
                : 'Available opportunities are ranked deterministically against sector, stage, geography and USD ticket range. If stored matches are insufficient, exploratory candidates are added without changing the Opportunity Score or implying TD Qualification.'}
            </p>
          </div>
          <div className="shrink-0 text-left lg:text-right">
            <div className="text-3xl font-semibold text-lime-300">{total.toLocaleString('en-IN')}</div>
            <div className="font-mono text-[10px] uppercase tracking-widest text-gray-500">
              {isInvestorView ? 'matching startups' : 'available investors'}
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {TIERS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setTier(item);
                setPage(0);
              }}
              className={`rounded border px-4 py-2 text-xs font-semibold transition ${
                tier === item
                  ? 'border-lime-300 bg-lime-300 text-black'
                  : 'border-white/15 bg-white/[0.03] text-gray-300 hover:border-lime-300/60'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {query.isLoading && (
        <div className="mt-3 rounded-xl border border-white/10 bg-black/70 p-6 text-sm text-gray-400">
          Loading stored matches…
        </div>
      )}

      {query.isError && (
        <div className="mt-3 rounded-xl border border-red-400/50 bg-black/70 p-6">
          <p className="font-semibold text-red-200">Matches could not be loaded.</p>
          <p className="mt-1 text-sm text-gray-400">Your stored matches remain unchanged. Please retry.</p>
        </div>
      )}

      {!query.isLoading && !query.isError && (
        <>
          <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
            <span>Showing {from.toLocaleString('en-IN')}–{to.toLocaleString('en-IN')} of {total.toLocaleString('en-IN')}</span>
            <span className="font-mono uppercase tracking-widest">{tier} tier</span>
          </div>

          <section className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {items.map((match: any) => {
              const reasons = Array.isArray(match.reasons)
                ? match.reasons.map(reasonText).filter(Boolean)
                : [];
              const startupMatch =
                String(match.direction || direction) === 'investor_to_startup';
              const name = startupMatch
                ? `${match.sector || 'Sector not disclosed'} · ${match.stage || 'Stage not disclosed'}`
                : match.firm || match.full_name || 'Protected investor';

              return (
                <article key={match.id} className="rounded-xl border border-white/10 bg-black/75 p-4 transition hover:border-lime-300/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">{name}</p>
                      {match.exploratory && (
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-yellow-300">
                          {match.available_label || 'Exploratory Opportunity'}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500">
                        {startupMatch
                          ? 'Founder identity protected until reveal'
                          : [match.city, match.country].filter(Boolean).join(', ') ||
                            match.geography ||
                            'Global'}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-2xl font-semibold text-lime-300">{match.match_score}</div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-gray-500">{match.tier}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-500">Sector</span>
                      <span className="mt-1 block text-gray-200">{match.sector || 'Agnostic'}</span>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-500">Stage</span>
                      <span className="mt-1 block text-gray-200">{match.stage || 'Broad'}</span>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-500">Geography</span>
                      <span className="mt-1 block text-gray-200">{match.geography || 'Global'}</span>
                    </div>
                    <div className="rounded border border-white/10 bg-white/[0.03] p-2">
                      <span className="block text-[9px] uppercase tracking-wider text-gray-500">
                        {startupMatch ? 'Ask' : 'Ticket'}
                      </span>
                      <span className="mt-1 block text-gray-200">
                        {startupMatch
                          ? money(match.ask_usd)
                          : `${money(match.ticket_min_usd)} – ${money(match.ticket_max_usd)}`}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {reasons.slice(0, 4).map((reason: string) => (
                      <span key={reason} className="rounded-full border border-lime-400/25 bg-lime-400/[0.06] px-2 py-1 text-[10px] text-lime-200">
                        {reason}
                      </span>
                    ))}
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-4">
                    <p className="text-[11px] leading-5 text-gray-500">
                      {startupMatch
                        ? 'Create an investor-selected Deal Desk opportunity. The founder is not contacted and their identity is not revealed at this stage.'
                        : match.exploratory
                          ? 'Exploratory Opportunity is ranked from current profile signals and is not TD Qualified. Starting it records your judgment; the investor is not contacted at this stage.'
                          : 'Create a Deal Desk execution record for this match. The investor is not contacted at this stage.'}
                    </p>
                    {startError?.matchId === String(match.id) && (
                      <p className="mt-2 text-xs leading-5 text-red-300">{startError.message}</p>
                    )}
                    <button
                      type="button"
                      disabled={opportunityMutation.isPending}
                      onClick={() => opportunityMutation.mutate(match)}
                      className="mt-3 w-full rounded-md border border-lime-300/70 bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95 disabled:cursor-wait disabled:opacity-50"
                    >
                      {opportunityMutation.isPending &&
                      opportunityMutation.variables?.id === match.id
                        ? 'Starting opportunity…'
                        : startupMatch
                          ? 'Start Investor-Selected Opportunity'
                          : match.exploratory
                            ? 'Start Exploratory Opportunity'
                            : 'Start Opportunity'}
                    </button>
                  </div>
                </article>
              );
            })}
          </section>

          {!items.length && (
            <div className="mt-3 rounded-xl border border-white/10 bg-black/70 p-8 text-center">
              <p className="text-lg font-semibold text-white">No matches in this tier.</p>
              <p className="mt-1 text-sm text-gray-500">Choose another tier to continue exploring.</p>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((value) => Math.max(0, value - 1))}
              className="rounded border border-white/15 px-4 py-2 text-sm text-gray-300 disabled:opacity-30"
            >
              Previous
            </button>
            <Link to="/opportunities" className="text-sm font-semibold text-lime-300 hover:underline">
              Open execution workspace →
            </Link>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => setPage((value) => value + 1)}
              className="rounded border border-lime-400/60 px-4 py-2 text-sm font-semibold text-lime-300 disabled:opacity-30"
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
