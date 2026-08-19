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
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      const mandate = m.investor_mandate || {};
      const text = [
        m.sector,
        m.stage,
        m.geography,
        m.city,
        m.country,
        m.investor_category,
        mandate.investment_thesis,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return search ? text.includes(search.toLowerCase()) : true;
    });
  }, [data, search]);

  const tierStyle = (t: string) => {
    if (t === 'Gold') return 'text-yellow-300 border-yellow-400/70';
    if (t === 'Silver') return 'text-blue-300 border-blue-400/70';
    return 'text-orange-300 border-orange-400/70';
  };


  const alignmentLabel = (state?: string) => {
    if (state === 'aligned') return 'Aligned';
    if (state === 'outside_mandate') {
      return 'Outside mandate';
    }
    return 'Awaiting';
  };

  const alignmentStyle = (state?: string) => {
    if (state === 'aligned') {
      return [
        'border-emerald-500/50',
        'bg-emerald-500/10',
        'text-emerald-300',
      ].join(' ');
    }

    if (state === 'outside_mandate') {
      return [
        'border-amber-500/50',
        'bg-amber-500/10',
        'text-amber-300',
      ].join(' ');
    }

    return [
      'border-slate-700',
      'bg-slate-900/70',
      'text-slate-400',
    ].join(' ');
  };

  const formatMoney = (value: unknown) => {
    const amount = Number(value);

    if (!Number.isFinite(amount)) {
      return 'Awaiting';
    }

    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  const mandateValue = (value: unknown) => {
    const rendered =
      value === null ||
      value === undefined
        ? ''
        : String(value).trim();

    return (
      rendered ||
      'Awaiting investor input'
    );
  };

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/75 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Discover Investors
        </div>

        <h1 className="text-3xl font-semibold mb-2">
          Investor Matches with mandate intelligence
        </h1>

        <p className="text-sm text-gray-400">
          Match Fit remains the stored Match score. Investor mandate,
          thesis and evidence expectations explain relevance without
          changing your startup score.
        </p>

        <div className="mt-4 text-sm text-lime-300">
          Match Fit → Mandate Scope → Investor Lens → Opportunity →
          TD Venture Outreach
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
              placeholder="Search sector, stage, geography, thesis..."
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
              {isLoading ? 'Loading investor matches...' : `${matches.length} investor matches`}
            </div>
            <div className="text-xs text-gray-400">
              Match Fit is canonical; mandate context is explanatory
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {matches.map((m: any) => {
              const mandate =
                m.investor_mandate || {};

              const scope =
                mandate.scope || {};

              const alignment =
                mandate.alignment || {};

              const evidence =
                mandate.evidence_record || {};

              const expanded =
                expandedId === String(m.id);

              const evidenceCount =
                typeof evidence.completion_count
                  === 'number'
                  ? `${evidence.completion_count}/12`
                  : 'Awaiting';

              return (
                <div
                  key={m.id}
                  className={`border ${tierStyle(m.tier)} bg-black/75 rounded-lg p-5`}
                >
                  <div className="flex items-center justify-between gap-4 mb-3">
                    <div>
                      <div
                        className={`text-xs uppercase tracking-[0.25em] ${tierStyle(m.tier).split(' ')[0]}`}
                      >
                        {m.tier} Match
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Protected investor ·{' '}
                        {m.investor_category ||
                          m.investor_tier ||
                          'Capital Partner'}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-[0.2em] text-gray-500">
                        Match Fit
                      </div>

                      <div className="text-xl text-lime-300 font-semibold">
                        {m.match_score}%
                      </div>
                    </div>
                  </div>

                  <div className="h-2 bg-gray-800 rounded-full mb-4">
                    <div
                      className="h-2 bg-lime-400 rounded-full"
                      style={{
                        width:
                          `${m.match_score}%`,
                      }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      [
                        'Sector',
                        alignment.sector,
                      ],
                      [
                        'Stage',
                        alignment.stage,
                      ],
                      [
                        'Geography',
                        alignment.geography,
                      ],
                    ].map(
                      (
                        [label, item]: any
                      ) => (
                        <div
                          key={label}
                          className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                        >
                          <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">
                            {label}
                          </div>

                          <div className="mt-2">
                            <span
                              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${alignmentStyle(item?.state)}`}
                            >
                              {alignmentLabel(
                                item?.state
                              )}
                            </span>
                          </div>
                        </div>
                      )
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-cyan-300">
                        Ticket context
                      </div>

                      <div className="mt-2 text-sm text-gray-200">
                        {scope.ticket_min_usd !==
                          null &&
                        scope.ticket_min_usd !==
                          undefined
                          ? formatMoney(
                              scope.ticket_min_usd
                            )
                          : 'Awaiting'}

                        {' — '}

                        {scope.ticket_max_usd !==
                          null &&
                        scope.ticket_max_usd !==
                          undefined
                          ? formatMoney(
                              scope.ticket_max_usd
                            )
                          : 'Awaiting'}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        Your round ask:{' '}

                        {alignment
                          .ticket_context
                          ?.startup_ask_usd !==
                          null &&
                        alignment
                          .ticket_context
                          ?.startup_ask_usd !==
                          undefined
                          ? formatMoney(
                              alignment
                                .ticket_context
                                .startup_ask_usd
                            )
                          : 'Awaiting'}
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                      <div className="text-[10px] uppercase tracking-[0.18em] text-violet-300">
                        Mandate evidence
                      </div>

                      <div className="mt-2 text-sm text-gray-200">
                        {evidenceCount}
                      </div>

                      <div className="mt-1 text-xs text-gray-500">
                        {evidence.rubric_version
                          ? (
                            'Investor-supplied '
                            + 'decision evidence'
                          )
                          : (
                            'Richer investor lens '
                            + 'awaiting input'
                          )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-lime-300">
                      Investment thesis
                    </div>

                    <div className="mt-2 text-sm leading-6 text-gray-300">
                      {mandateValue(
                        mandate.investment_thesis
                      )}
                    </div>
                  </div>

                  {Array.isArray(m.reasons) &&
                    m.reasons.length > 0 && (
                      <div className="mt-4 border-t border-lime-500/30 pt-3">
                        <div className="text-xs uppercase tracking-[0.25em] text-lime-300 mb-2">
                          Why matched
                        </div>

                        <ul className="grid gap-1 text-xs text-gray-400">
                          {m.reasons
                            .slice(0, 4)
                            .map(
                              (
                                reason: string,
                                index: number
                              ) => (
                                <li
                                  key={`${m.id}-reason-${index}`}
                                >
                                  ✓ {reason}
                                </li>
                              )
                            )}
                        </ul>
                      </div>
                    )}

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      className="rounded-md border border-cyan-500/50 bg-cyan-500/5 px-4 py-2 text-sm font-semibold text-cyan-300"
                      onClick={() =>
                        setExpandedId(
                          expanded
                            ? null
                            : String(m.id)
                        )
                      }
                    >
                      {expanded
                        ? 'Hide Investor Lens'
                        : 'View Investor Lens'}
                    </button>

                    <button
                      type="button"
                      className="rounded-md bg-lime-400 text-black px-4 py-2 font-semibold"
                      onClick={() => {
                        setDealCreated(false);
                        setDealError('');
                        setSelectedMatch(m);
                      }}
                    >
                      Open Opportunity
                    </button>
                  </div>

                  {expanded && (
                    <div className="mt-4 border-t border-slate-800 pt-4">
                      <div className="mb-3">
                        <div className="text-xs uppercase tracking-[0.25em] text-lime-300">
                          Investor decision lens
                        </div>

                        <p className="mt-1 text-xs leading-5 text-gray-500">
                          These are investor-supplied
                          preferences and expectations.
                          They explain relevance; they do
                          not change Match Fit or your
                          startup assessment.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                            Founder Lens
                          </div>

                          <div className="mt-3 space-y-3 text-sm">
                            <div>
                              <div className="text-gray-500">
                                Qualities that create conviction
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .founder_lens
                                    ?.founder_qualities
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                When they may pursue despite risk
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .founder_lens
                                    ?.pursuit_criteria
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-violet-300">
                            Market & Moat
                          </div>

                          <div className="mt-3 space-y-3 text-sm">
                            <div>
                              <div className="text-gray-500">
                                Attractive market characteristics
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .market_moat_lens
                                    ?.market_opportunity
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                Defensibility expected
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .market_moat_lens
                                    ?.moat_expectation
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                Market risks they watch
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .market_moat_lens
                                    ?.market_risks
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-amber-300">
                            Evidence Expected
                          </div>

                          <div className="mt-3 space-y-3 text-sm">
                            <div>
                              <div className="text-gray-500">
                                Traction expectation
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .evidence_expected
                                    ?.traction_expectation
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                Economics expectation
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .evidence_expected
                                    ?.economics_expectation
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                Evidence required before diligence
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .evidence_expected
                                    ?.evidence_required
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                          <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                            Capital & Decision Style
                          </div>

                          <div className="mt-3 space-y-3 text-sm">
                            <div>
                              <div className="text-gray-500">
                                Capital strategy
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .capital_decision_style
                                    ?.capital_strategy
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                What capital should accomplish
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .capital_decision_style
                                    ?.capital_outcomes
                                )}
                              </div>
                            </div>

                            <div>
                              <div className="text-gray-500">
                                Decision & engagement
                              </div>
                              <div className="mt-1 leading-6 text-gray-300">
                                {mandateValue(
                                  mandate
                                    .capital_decision_style
                                    ?.decision_engagement
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
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