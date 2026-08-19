import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDealFlow, listStartupMatches, startOpportunity } from '@/lib/api';

const tierTone: Record<string, string> = {
  Gold: 'border-yellow-300/60 text-yellow-200',
  Silver: 'border-slate-300/50 text-slate-200',
  Bronze: 'border-orange-400/50 text-orange-200',
  Coal: 'border-gray-600 text-gray-300',
};

function ScoreBar({
  label,
  value,
  tone = 'bg-[#D4FF00]',
}: {
  label: string;
  value: number | null | undefined;
  tone?: string;
}) {
  const score = typeof value === 'number' ? Math.max(0, Math.min(100, value)) : null;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="uppercase tracking-[0.16em] text-gray-500">{label}</span>
        <span className={score === null ? 'text-gray-600' : 'font-semibold text-white'}>
          {score === null ? 'Awaiting evidence' : `${score}/100`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-[width] duration-700 ${tone}`}
          style={{ width: `${score ?? 0}%` }}
        />
      </div>
    </div>
  );
}

function confidenceValue(value: unknown) {
  const normalized = String(value || '').toLowerCase();
  if (normalized === 'strong' || normalized === 'high') return 100;
  if (normalized === 'medium' || normalized === 'moderate') return 66;
  if (normalized === 'weak' || normalized === 'low') return 33;
  return 0;
}

function qualificationTone(label: string) {
  if (label === 'High conviction') return 'border-[#D4FF00]/70 bg-[#D4FF00]/10 text-[#D4FF00]';
  if (label === 'Qualified') return 'border-white/50 bg-white/10 text-white';
  if (label === 'Developing') return 'border-yellow-400/50 bg-yellow-400/10 text-yellow-200';
  return 'border-gray-700 bg-white/[0.03] text-gray-400';
}

function numericScore(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function reviewScore(match: any) {
  return (
    numericScore(match.review_score) ??
    numericScore(match.opportunity_score) ??
    numericScore(match.match_score)
  );
}

function evidenceInputCount(match: any) {
  const supplied = Number(match.evidence_inputs_present);
  if (Number.isFinite(supplied)) return supplied;
  return [match.match_score, match.conversion_score, match.diamond_score].filter(
    (value) => numericScore(value) !== null,
  ).length;
}

export default function DiscoverStartupsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const contextStartupId = String(
    searchParams.get('startup_id') || ''
  ).trim();
  const [tier, setTier] = useState('');
  const [search, setSearch] = useState('');
  const [reviewThreshold, setReviewThreshold] = useState(50);
  const [evidenceFilter, setEvidenceFilter] = useState<'all' | 'available' | 'awaiting'>('all');
  const [topQueueOnly, setTopQueueOnly] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState<any | null>(null);

  const { data = [], isLoading, isError, error } = useQuery({
    queryKey: ['startupMatches', tier],
    queryFn: () => listStartupMatches({ tier }),
  });

  const { data: dealFlow = [] } = useQuery({
    queryKey: ['dealFlow'],
    queryFn: getDealFlow,
  });

  const activeOpportunityPairs = useMemo(() => {
    const items = Array.isArray(dealFlow) ? dealFlow : [];

    return new Set(
      items
        .filter(
          (item: any) =>
            !['declined', 'closed', 'funded'].includes(
              String(item.status || 'interested').toLowerCase(),
            ),
        )
        .map(
          (item: any) =>
            `${item.startup_id}:${item.investor_id}`,
        ),
    );
  }, [dealFlow]);

  const createOpportunity = useMutation({
    mutationFn: (match: any) =>
      startOpportunity({
        match_id: match.id,
        startup_id: match.startup_id,
        investor_id: match.investor_id,
        direction: 'investor_to_startup',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['dealFlow'],
      });
    },
  });

  const matches = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const filtered = data.filter((match: any) => {
      const score = reviewScore(match);
      if (score === null || score < reviewThreshold) return false;
      const hasEvidence = evidenceInputCount(match) >= 2;
      if (evidenceFilter === 'available' && !hasEvidence) return false;
      if (evidenceFilter === 'awaiting' && hasEvidence) return false;
      if (!needle) return true;
      return [
        match.startup_sector,
        match.sector,
        match.stage,
        match.geography,
        match.city,
        match.country,
        match.ask,
        match.tier,
        match.qualification,
        match.review_label,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(needle);
    });

    filtered.sort((a: any, b: any) => {
      const canonicalDelta = Number(b.opportunity_score != null) - Number(a.opportunity_score != null);
      if (canonicalDelta) return canonicalDelta;
      const evidenceDelta = evidenceInputCount(b) - evidenceInputCount(a);
      if (evidenceDelta) return evidenceDelta;
      const reviewDelta = (reviewScore(b) ?? -1) - (reviewScore(a) ?? -1);
      if (reviewDelta) return reviewDelta;
      return Number(b.match_score || 0) - Number(a.match_score || 0);
    });

    if (contextStartupId) {
      const contextIndex = filtered.findIndex(
        (item: any) =>
          String(item.startup_id || '') ===
          contextStartupId
      );

      if (contextIndex > 0) {
        const [contextMatch] =
          filtered.splice(contextIndex, 1);

        filtered.unshift(contextMatch);
      } else if (contextIndex < 0) {
        const contextMatch = data.find(
          (item: any) =>
            String(item.startup_id || '') ===
            contextStartupId
        );

        if (contextMatch) {
          filtered.unshift(contextMatch);
        }
      }
    }

    return topQueueOnly ? filtered.slice(0, 40) : filtered;
  }, [
    data,
    search,
    reviewThreshold,
    evidenceFilter,
    topQueueOnly,
    contextStartupId,
  ]);

  const inventory = useMemo(
    () => ({
      total: data.length,
      qualified: data.filter((m: any) => Number(m.opportunity_score) >= 50).length,
      evidenceAvailable: data.filter((m: any) => evidenceInputCount(m) >= 2).length,
      awaiting: data.filter((m: any) => evidenceInputCount(m) < 2).length,
    }),
    [data],
  );

  return (
    <div className="p-6 text-white">
      <section className="rounded-xl border border-[#D4FF00]/50 bg-black/80 p-6">
        <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#D4FF00]">
          Investor deal-flow intelligence
        </p>
        <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Startup Match Workspace</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-400">
              Evidence guides your attention. It does not replace investor judgment. You may
              start an opportunity from any genuine match, even while qualification evidence
              is still developing.
            </p>
          </div>
          <button
            type="button"
            className="rounded-md border border-white/20 px-4 py-2 text-sm text-gray-200 hover:border-[#D4FF00]/60 hover:text-[#D4FF00]"
            onClick={() => navigate('/qualification')}
          >
            View qualification logic
          </button>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ['Your startup matches', inventory.total],
          ['TD Qualified · 50+', inventory.qualified],
          ['Evidence available', inventory.evidenceAvailable],
          ['Awaiting evidence', inventory.awaiting],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-white/10 bg-black/70 p-4">
            <div className="text-[10px] uppercase tracking-[0.18em] text-gray-500">{label}</div>
            <div className="mt-2 text-2xl font-semibold text-white">{value}</div>
          </div>
        ))}
      </section>

      <section className="mt-5 rounded-lg border border-white/10 bg-black/70 p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border border-white/15 bg-black px-3 py-2 text-sm outline-none focus:border-[#D4FF00]/60"
            placeholder="Search sector, stage, geography or qualification..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className="rounded-md border border-white/15 bg-black px-3 py-2 text-sm"
            value={tier}
            onChange={(event) => setTier(event.target.value)}
          >
            <option value="">All match tiers</option>
            <option value="Gold">Gold</option>
            <option value="Silver">Silver</option>
            <option value="Bronze">Bronze</option>
            <option value="Coal">Coal</option>
          </select>
          <select
            className="rounded-md border border-white/15 bg-black px-3 py-2 text-sm"
            value={evidenceFilter}
            onChange={(event) =>
              setEvidenceFilter(event.target.value as 'all' | 'available' | 'awaiting')
            }
          >
            <option value="all">All evidence states</option>
            <option value="available">Evidence available</option>
            <option value="awaiting">Awaiting evidence</option>
          </select>
          <button
            type="button"
            onClick={() => setTopQueueOnly((current) => !current)}
            className={`rounded-md border px-4 py-2 text-sm font-semibold ${
              topQueueOnly
                ? 'border-[#D4FF00]/70 bg-[#D4FF00]/10 text-[#D4FF00]'
                : 'border-white/15 text-gray-300'
            }`}
          >
            {topQueueOnly ? 'Top 40 Review Queue' : 'Show all passing'}
          </button>
        </div>

        <div className="mt-4 rounded-md border border-[#D4FF00]/25 bg-[#D4FF00]/[0.025] p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#D4FF00]">
                Investor Review Threshold
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Changes your review queue only. TD Qualification remains fixed at 50.
              </p>
            </div>
            <div className="text-2xl font-black tabular-nums text-white">{reviewThreshold}/100</div>
          </div>
          <div className="relative mt-4">
            <input
              aria-label="Investor review threshold"
              type="range"
              min="0"
              max="100"
              step="1"
              value={reviewThreshold}
              onChange={(event) => setReviewThreshold(Number(event.target.value))}
              className="w-full accent-[#D4FF00]"
            />
            <div className="pointer-events-none absolute -bottom-4 left-[66%] -translate-x-1/2 text-[9px] font-mono text-cyan-300">
              TD 66
            </div>
          </div>
          <div className="mt-6 flex items-center justify-between text-xs text-gray-500">
            <span>{matches.length} shown</span>
            <button
              type="button"
              className="hover:text-white"
              onClick={() => setReviewThreshold(50)}
            >
              Reset to recommended 50
            </button>
          </div>
        </div>
      </section>

      {isLoading && (
        <div className="mt-5 rounded-lg border border-white/10 bg-black/70 p-6 text-gray-400">
          Loading your canonical startup matches…
        </div>
      )}

      {isError && (
        <div className="mt-5 rounded-lg border border-red-400/40 bg-red-950/20 p-6 text-red-200">
          {error instanceof Error ? error.message : 'Could not load startup matches.'}
        </div>
      )}

      {!isLoading && !isError && matches.length === 0 && (
        <div className="mt-5 rounded-lg border border-dashed border-white/15 bg-black/60 p-8">
          <h2 className="text-xl font-semibold">No matches in this view.</h2>
          <p className="mt-2 text-sm text-gray-400">
            Reset the filters or strengthen your investor application so the matching engine
            can compare sector, stage, geography and ticket range.
          </p>
        </div>
      )}

      {contextStartupId && (
        <div className="mt-5 rounded-lg border border-cyan-400/30 bg-cyan-400/5 px-4 py-3 text-xs text-cyan-100">
          Conversion handoff · Selected startup context preserved.
          The corresponding genuine startup match is shown first.
        </div>
      )}

      <section className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {matches.map((match: any) => {
          const opportunityScore =
            typeof match.opportunity_score === 'number' ? match.opportunity_score : null;
          const investorReviewScore = reviewScore(match);
          const evidenceCount = evidenceInputCount(match);
          const isTdQualified = opportunityScore !== null && opportunityScore >= 50;
          const signalConfidence = confidenceValue(match.signal_confidence);
          const started = activeOpportunityPairs.has(
            `${match.startup_id}:${match.investor_id}`,
          );
          const reasons = Array.isArray(match.reasons) ? match.reasons : [];
          const leadingSignals = Array.isArray(match.leading_signals)
            ? match.leading_signals
            : [];
          const riskFlags = Array.isArray(match.risk_flags) ? match.risk_flags : [];

          return (
            <article
              key={match.id}
              className="rounded-xl border border-white/10 bg-black/75 p-5 transition hover:border-[#D4FF00]/35"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div
                    className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      tierTone[match.tier] || tierTone.Coal
                    }`}
                  >
                    {match.tier || 'Match'} · {match.match_score}/100
                  </div>
                  <h2 className="mt-3 text-xl font-semibold">
                    {match.startup_sector || match.sector || 'Sector not disclosed'} · {match.stage || 'Stage pending'}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    Founder identity protected until reveal
                  </p>
                </div>
                <div
                  className={`rounded-md border px-3 py-2 text-xs font-semibold ${qualificationTone(
                    match.qualification,
                  )}`}
                >
                  {opportunityScore !== null
                    ? `${match.qualification} · ${opportunityScore}/100`
                    : `Investor review · ${investorReviewScore ?? 'Awaiting'}/100`}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <ScoreBar label="Match fit · 50%" value={match.match_score} />
                <ScoreBar label="Conversion · 30%" value={match.conversion_score} />
                <ScoreBar label="Independent Diamond · 20%" value={match.diamond_score} />
                <ScoreBar
                  label={`Signal confidence · ${match.signal_confidence || 'Awaiting'}`}
                  value={signalConfidence || null}
                  tone={
                    signalConfidence === 66
                      ? 'bg-yellow-300'
                      : signalConfidence === 100
                        ? 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]'
                        : 'bg-gray-500'
                  }
                />
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
                {[
                  ['Ask', match.ask || (match.ask_usd ? `$${match.ask_usd}` : 'Not disclosed')],
                  ['Geography', match.geography || match.country || 'Not set'],
                  ['Risk', match.risk_level || 'Awaiting'],
                  ['Evidence', `${evidenceCount}/3 inputs`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md border border-white/10 bg-white/[0.025] p-3">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-gray-600">{label}</div>
                    <div className="mt-1 text-gray-200">{value}</div>
                  </div>
                ))}
              </div>

              {(reasons.length > 0 || leadingSignals.length > 0 || riskFlags.length > 0) && (
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <EvidenceList title="Why matched" items={reasons} />
                  <EvidenceList title="Leading signals" items={leadingSignals} />
                  <EvidenceList title="Risk flags" items={riskFlags} />
                </div>
              )}

              <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row">
                <button
                  type="button"
                  disabled={createOpportunity.isPending || started}
                  className="flex-1 rounded-md bg-[#D4FF00] px-4 py-2.5 font-semibold text-black disabled:cursor-not-allowed disabled:opacity-60"
                  onClick={() => createOpportunity.mutate(match)}
                >
                  {started
                    ? 'Opportunity started'
                    : createOpportunity.isPending &&
                        createOpportunity.variables?.id === match.id
                      ? 'Starting opportunity…'
                      : isTdQualified
                        ? 'Start TD-Qualified Opportunity'
                        : 'Start Investor-Selected Opportunity'}
                </button>
                <button
                  type="button"
                  className="flex-1 rounded-md border border-white/20 px-4 py-2.5 font-semibold text-white hover:border-[#D4FF00]/60 hover:text-[#D4FF00]"
                  onClick={() => setSelectedMatch(match)}
                >
                  Connect · Reveal options
                </button>
              </div>

              <p className="mt-3 text-[11px] leading-5 text-gray-600">
                {isTdQualified
                  ? 'TD Qualified means the complete canonical score is at least 50.'
                  : 'Investor Selected records your judgment; it does not imply TD Qualification.'}{' '}
                Starting an opportunity does not reveal identity, consume a credit, take payment,
                or contact the founder.
              </p>

              {createOpportunity.isError &&
                createOpportunity.variables?.id === match.id && (
                  <p className="mt-2 text-xs text-red-300">
                    {createOpportunity.error instanceof Error
                      ? createOpportunity.error.message
                      : 'Could not start this opportunity.'}
                  </p>
                )}
            </article>
          );
        })}
      </section>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-xl rounded-xl border border-[#D4FF00]/60 bg-black p-6 shadow-[0_0_35px_rgba(212,255,0,0.18)]">
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#D4FF00]">
              Protected identity
            </p>
            <h2 className="mt-2 text-2xl font-semibold">Connect and reveal</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Reveal and payment remain a separate consent boundary. Starting an opportunity
              does not bypass this boundary.
            </p>
            <div className="mt-5 rounded-lg border border-white/10 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Match fit</span>
                <span>{selectedMatch.match_score}/100</span>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-gray-500">Opportunity qualification</span>
                <span>{selectedMatch.opportunity_score ?? 'Awaiting evidence'}</span>
              </div>
            </div>
            <div className="mt-5 grid gap-2">
              <button
                className="rounded-md border border-[#D4FF00]/50 p-3 text-left hover:bg-[#D4FF00] hover:text-black"
                onClick={() => navigate('/payments')}
              >
                <div className="font-semibold">Use a reveal credit or choose access</div>
                <div className="text-xs opacity-70">Continue to the existing payment plane.</div>
              </button>
            </div>
            <button
              type="button"
              className="mt-5 text-sm text-gray-500 hover:text-white"
              onClick={() => setSelectedMatch(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function EvidenceList({ title, items }: { title: string; items: unknown[] }) {
  return (
    <div className="rounded-md border border-white/10 bg-white/[0.02] p-3">
      <div className="text-[9px] uppercase tracking-[0.18em] text-gray-500">{title}</div>
      {items.length > 0 ? (
        <ul className="mt-2 space-y-1.5 text-xs leading-5 text-gray-300">
          {items.slice(0, 3).map((item, index) => (
            <li key={`${title}-${index}`}>• {typeof item === 'string' ? item : JSON.stringify(item)}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-xs text-gray-600">Awaiting evidence</p>
      )}
    </div>
  );
}
