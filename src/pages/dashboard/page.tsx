import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Cell, Pie, PieChart, ResponsiveContainer } from 'recharts';
import TerminalHeader from "../../components/dealdesk/TerminalHeader";
import ScoreRing from '@/components/ScoreRing';
import {
  getCurrentProfilePlane,
  getDealDeskBrief,
  getDealFlow,
  getMyMatchSummary,
  getQualifiedOpportunities,
  startOpportunity,
  type StartupMatchSummary,
} from '@/lib/api';

type BrainSignal = {
  key: string;
  label: string;
  definition: string;
  score: number | null;
  state: 'available' | 'awaiting';
  assessment_source: 'founder' | 'openai';
};

const FALLBACK_FOUNDER_SIGNALS: BrainSignal[] = [
  {
    key: 'thesis_differentiation',
    label: 'Thesis & differentiation',
    definition: 'Problem · solution · timing · wedge · differentiation',
    score: null,
    state: 'awaiting',
    assessment_source: 'founder',
  },
  {
    key: 'market_moat',
    label: 'Market & moat',
    definition: 'TAM · durability · team · distribution · regulation',
    score: null,
    state: 'awaiting',
    assessment_source: 'founder',
  },
  {
    key: 'operating_evidence',
    label: 'Operating evidence',
    definition: 'Revenue · projections · traction · margin · model',
    score: null,
    state: 'awaiting',
    assessment_source: 'founder',
  },
  {
    key: 'capital_readiness',
    label: 'Capital readiness',
    definition: 'Ownership · scale · funding · exit · instrument',
    score: null,
    state: 'awaiting',
    assessment_source: 'founder',
  },
];

function NeuralField({ brief }: { brief?: any }) {
  const signalColours = [
    '#d4ff00',
    '#67e8f9',
    '#fcd34d',
    '#f0abfc',
    '#f8fafc',
  ];

  const openSignalDetail = () => {
    document
      .getElementById(
        brief?.brain_signals?.detail_anchor ||
          'deal-desk-signal-detail',
      )
      ?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
  };

  let signals: Array<{
    key: string;
    label: string;
    definition: string;
    score: number | null;
    available: boolean;
    colour: string;
  }>;

  if (brief?.brain_signals) {
    const suppliedFounderSignals = Array.isArray(
      brief?.brain_signals?.founder_sections,
    )
      ? brief.brain_signals.founder_sections
      : [];

    const founderSignals = FALLBACK_FOUNDER_SIGNALS.map(
      (fallback, index) => {
        const supplied = suppliedFounderSignals.find(
          (item: any) => item?.key === fallback.key,
        );

        const score =
          typeof supplied?.score === 'number'
            ? Math.max(0, Math.min(100, supplied.score))
            : null;

        return {
          key: fallback.key,
          label: supplied?.label || fallback.label,
          definition:
            supplied?.definition || fallback.definition,
          score,
          available: score !== null,
          colour: signalColours[index],
        };
      },
    );

    const suppliedAi =
      brief?.brain_signals?.ai_intelligence;

    const aiScore =
      typeof suppliedAi?.score === 'number'
        ? Math.max(0, Math.min(100, suppliedAi.score))
        : null;

    signals = [
      ...founderSignals,
      {
        key: 'ai_intelligence',
        label: suppliedAi?.label || 'AI Intelligence',
        definition:
          suppliedAi?.definition ||
          'Independent OpenAI evidence assessment',
        score: aiScore,
        available: aiScore !== null,
        colour: signalColours[4],
      },
    ];
  } else {
    const investabilityNumber =
      Number(brief?.investability_score);

    const investabilityScore =
      Number.isFinite(investabilityNumber)
        ? Math.max(
            0,
            Math.min(100, investabilityNumber),
          )
        : null;

    const leadingSignals =
      Array.isArray(brief?.leading_signals)
        ? brief.leading_signals
        : [];

    const risk =
      String(brief?.overall_risk_level || '').trim();

    const confidence =
      String(brief?.confidence_level || '').trim();

    const nextAction =
      String(brief?.next_best_action || '').trim();

    signals = [
      {
        key: 'investability',
        label: 'Investability',
        definition: 'Current investability assessment',
        score: investabilityScore,
        available: investabilityScore !== null,
        colour: signalColours[0],
      },
      {
        key: 'risk',
        label: 'Risk',
        definition: risk || 'Overall risk assessment',
        score: null,
        available: Boolean(risk),
        colour: signalColours[1],
      },
      {
        key: 'confidence',
        label: 'Confidence',
        definition:
          confidence || 'Assessment confidence',
        score: null,
        available: Boolean(confidence),
        colour: signalColours[2],
      },
      {
        key: 'signals',
        label: 'Leading Signals',
        definition:
          leadingSignals.length > 0
            ? `${leadingSignals.length} signals identified`
            : 'Leading evidence signals',
        score: null,
        available: leadingSignals.length > 0,
        colour: signalColours[3],
      },
      {
        key: 'next_action',
        label: 'Next Action',
        definition:
          nextAction || 'Recommended next action',
        score: null,
        available: Boolean(nextAction),
        colour: signalColours[4],
      },
    ];
  }

  const liveCount = signals.filter(
    (signal) => signal.available,
  ).length;

  const chartData = signals.map((signal) => ({
    key: signal.key,
    name: signal.label,
    value: 1,
    fill: signal.available
      ? signal.colour
      : '#1f2937',
  }));

  return (
    <section className="w-full rounded-lg border border-white/10 bg-black/60 p-3">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2">
        <div>
          <p className="font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400">
            Signal Coverage
          </p>
          <p className="mt-0.5 text-[9px] text-gray-600">
            Independent decision signals currently available.
          </p>
        </div>

        <Link
          to="/opportunities"
          className="shrink-0 rounded-md border border-primary/40 px-2 py-1 text-[10px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
        >
          Open
        </Link>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-[220px_1fr] md:items-center">
        <button
          type="button"
          onClick={openSignalDetail}
          className="relative mx-auto block h-[210px] w-[210px] border-0 bg-transparent p-0"
          aria-label="Open detailed Deal Desk signal assessment"
        >
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={64}
                outerRadius={88}
                paddingAngle={3}
                startAngle={90}
                endAngle={-270}
                stroke="#020403"
                strokeWidth={2}
                isAnimationActive
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.key}
                    fill={entry.fill}
                  />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-3xl font-black text-white">
              {liveCount}/5
            </span>
            <span className="mt-1 font-mono text-[8px] font-bold uppercase tracking-[0.22em] text-gray-500">
              Signals Live
            </span>
          </div>
        </button>

        <div className="space-y-1.5">
          {signals.map((signal) => (
            <button
              key={signal.key}
              type="button"
              onClick={openSignalDetail}
              className="grid w-full grid-cols-[8px_1fr_auto] items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.015] px-2.5 py-2 text-left transition hover:border-white/15 hover:bg-white/[0.03]"
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  backgroundColor: signal.available
                    ? signal.colour
                    : '#374151',
                  boxShadow: signal.available
                    ? `0 0 8px ${signal.colour}55`
                    : 'none',
                }}
              />

              <span className="min-w-0">
                <span className="block truncate text-[10px] font-semibold text-gray-200">
                  {signal.label}
                </span>
                <span className="mt-0.5 block truncate text-[8px] text-gray-600">
                  {signal.definition}
                </span>
              </span>

              <span
                className={
                  signal.available
                    ? 'font-mono text-[10px] font-bold text-white'
                    : 'font-mono text-[8px] uppercase text-gray-600'
                }
              >
                {signal.score !== null
                  ? `${Math.round(signal.score)}/100`
                  : signal.available
                    ? 'LIVE'
                    : 'AWAITING'}
              </span>
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={openSignalDetail}
        className="mx-auto mt-2 block border-0 bg-transparent font-mono text-[8px] uppercase tracking-[0.18em] text-gray-600 transition hover:text-primary"
      >
        View detailed signal assessment →
      </button>
    </section>
  );
}

function SignalScoreBreakdown({ brief }: { brief?: any }) {
  const providedFounderSignals = Array.isArray(brief?.brain_signals?.founder_sections)
    ? brief.brain_signals.founder_sections
    : [];

  const rows = [
    { key: 'thesis_differentiation', label: 'Thesis & Differentiation', tone: 'bg-lime-300 shadow-[0_0_8px_rgba(212,255,0,.6)]' },
    { key: 'market_moat', label: 'Market & Moat', tone: 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.5)]' },
    { key: 'operating_evidence', label: 'Operating Evidence', tone: 'bg-amber-300 shadow-[0_0_8px_rgba(252,211,77,.5)]' },
    { key: 'capital_readiness', label: 'Capital Readiness', tone: 'bg-fuchsia-300 shadow-[0_0_8px_rgba(240,171,252,.5)]' },
  ].map((row) => {
    const provided = providedFounderSignals.find((item: any) => item?.key === row.key);
    const score = typeof provided?.score === 'number' ? Math.max(0, Math.min(100, provided.score)) : null;
    return { ...row, score };
  });

  const providedAi = brief?.brain_signals?.ai_intelligence;
  const aiScore = typeof providedAi?.score === 'number' ? Math.max(0, Math.min(100, providedAi.score)) : null;
  rows.push({
    key: 'ai_intelligence',
    label: 'AI Intelligence',
    tone: 'bg-white shadow-[0_0_8px_rgba(255,255,255,.6)]',
    score: aiScore,
  });

  return (
    <section className="w-full rounded-lg border border-white/10 bg-black/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
          Signal score breakdown
        </p>
        <p className="text-[9px] text-gray-600">All five in one view</p>
      </div>
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={row.key}>
            <div className="mb-1 flex items-center justify-between text-[11px]">
              <span className="text-gray-400">{row.label}</span>
              <span className="font-semibold tabular-nums text-white">
                {row.score === null ? '—' : `${row.score}/100`}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full transition-[width] duration-700 ${row.score === null ? 'bg-slate-700' : row.tone}`}
                style={{ width: `${row.score ?? 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function OpportunityScoreDonut({ totalOpportunities }: { totalOpportunities: number }) {
  const segments = [
    {
      key: 'match_fit',
      label: 'Match Fit',
      detail: 'Sector, stage, geography and USD ticket-size alignment.',
      pct: 50,
      color: '#22d3ee',
    },
    {
      key: 'conversion_score',
      label: 'Conversion Score',
      detail: 'OpenAI evidence assessment used as the independent Conversion component.',
      pct: 30,
      color: '#d4ff00',
    },
    {
      key: 'diamond_index',
      label: 'Independent Diamond Index',
      detail: 'The total of the 20 APPLY-question ratings, stored separately from Conversion.',
      pct: 20,
      color: '#e2e8f0',
    },
  ];

  const r = 70;
  const circumference = 2 * Math.PI * r;
  let cumulative = 0;
  const arcs = segments.map((seg) => {
    const segLen = (seg.pct / 100) * circumference;
    const offset = -cumulative;
    cumulative += segLen;
    return { ...seg, segLen, offset };
  });

  return (
    <section className="w-full rounded-lg border border-white/10 bg-black/60 p-3">
      <div className="mb-2 flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
        <div>
          <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-gray-400">
            Opportunity score formula
          </p>
          <p className="mt-0.5 text-[9px] text-gray-600">
            How Match to Opportunity Qualification is derived
          </p>
        </div>
        <Link
          to="/qualification"
          className="shrink-0 rounded border border-lime-400/70 px-2 py-1 text-[10px] font-semibold text-lime-300 transition hover:bg-lime-400 hover:text-black"
        >
          Details
        </Link>
      </div>

      <div className="flex flex-col items-center gap-4">
        <div className="relative h-80 w-80 shrink-0">
          <svg viewBox="0 0 200 200" className="h-full w-full">
            <circle cx="100" cy="100" r={r} fill="none" stroke="#1f2937" strokeWidth="22" />
            {arcs.map((arc) => (
              <circle
                key={arc.key}
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={arc.color}
                strokeWidth="22"
                strokeDasharray={`${arc.segLen} ${circumference - arc.segLen}`}
                strokeDashoffset={arc.offset}
                transform="rotate(-90 100 100)"
              />
            ))}
            <text x="100" y="90" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700" letterSpacing="1">
              OPPORTUNITY
            </text>
          </svg>

          <Link
            to="/opportunities"
            className="absolute left-1/2 top-[54%] -translate-x-1/2 -translate-y-1/2 rounded px-2 py-1 text-[11px] font-bold uppercase tracking-[1px] text-lime-300 underline decoration-lime-300/50 underline-offset-2 transition hover:text-lime-200 hover:decoration-lime-200"
          >
            SCORE →
          </Link>

          <div
            className="absolute left-1/2 top-[70%] flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-lime-400/60 bg-black text-lime-300 shadow-lg ring-2 ring-black/40"
            title="Opportunity Score weighting: 50% Match Fit, 30% Conversion, 20% Diamond"
          >
            <span className="text-sm font-extrabold leading-none">50·30·20</span>
            <span className="mt-1 text-[8px] font-mono uppercase tracking-wide text-gray-500">
              formula
            </span>
          </div>
        </div>

        <div className="w-full max-w-sm space-y-2.5">
          {segments.map((seg) => (
            <div key={seg.key} className="flex items-start gap-2">
              <span
                className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: seg.color }}
              />
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-white">{seg.pct}%</span>
                  <span className="text-[11px] font-semibold text-gray-300">{seg.label}</span>
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-gray-600">{seg.detail}</p>
              </div>
            </div>
          ))}
        </div>

        <Link
          to="/opportunities"
          className="text-[9px] font-mono uppercase tracking-wide text-gray-500 transition hover:text-lime-300"
        >
          Active Deal Desk opportunities: {totalOpportunities} →
        </Link>
      </div>
    </section>
  );
}
function ActivityLog({ brief, startup }: { brief?: any; startup?: any }) {
  const entries: {
    label: string;
    detail: string;
    progress?: number;
    progressClass?: string;
  }[] = [];

  const hasInvestability =
    brief?.investability_score !== null &&
    brief?.investability_score !== undefined &&
    String(brief?.investability_score).trim() !== '';

  if (hasInvestability) {
    const investability = Math.max(0, Math.min(100, Number(brief.investability_score) || 0));
    entries.push({
      label: 'Investability score',
      detail: `${investability} / 100`,
      progress: investability,
      progressClass: 'bg-[#D4FF00] shadow-[0_0_10px_rgba(212,255,0,0.75)]',
    });
  }

  if (brief?.confidence_level) {
    const confidence = String(brief.confidence_level).trim().toLowerCase();
    const confidenceScore =
      confidence === 'strong' || confidence === 'high'
        ? 100
        : confidence === 'medium' || confidence === 'moderate'
          ? 66
          : 33;
    const confidenceLabel =
      confidenceScore === 100 ? 'Strong' : confidenceScore === 66 ? 'Medium' : 'Weak';
    entries.push({
      label: 'Signal confidence',
      detail: `${confidenceLabel} · ${confidenceScore} / 100`,
      progress: confidenceScore,
      progressClass:
        confidenceScore === 100
          ? 'bg-white shadow-[0_0_10px_rgba(255,255,255,0.7)]'
          : confidenceScore === 66
            ? 'bg-yellow-300 shadow-[0_0_10px_rgba(253,224,71,0.6)]'
            : 'bg-red-400 shadow-[0_0_10px_rgba(248,113,113,0.5)]',
    });
  }

  if (Array.isArray(brief?.leading_signals) && brief.leading_signals.length) {
    brief.leading_signals.slice(0, 3).forEach((signal: any, index: number) => {
      const text = typeof signal === 'string'
        ? signal
        : String(
            signal?.label || signal?.title || signal?.signal || signal?.text || ''
          ).trim();
      if (text) {
        entries.push({ label: `Leading signal ${index + 1}`, detail: text });
      }
    });
  }

  if (brief?.next_best_action) {
    entries.push({ label: 'Next best action', detail: String(brief.next_best_action) });
  }

  if (Array.isArray(brief?.missing_evidence) && brief.missing_evidence.length) {
    const n = brief.missing_evidence.length;
    entries.push({
      label: 'Missing evidence',
      detail: `${n} item${n === 1 ? '' : 's'} outstanding`,
    });
  }

  if (!entries.length) {
    return null;
  }

  return (
    <section className="rounded-lg border border-white/10 bg-black/70 p-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-400">
          Activity log
        </h2>
        {startup && (
          <a
            href="https://staging.tdventure.vc/signup/startup"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded border border-[#D4FF00]/50 px-2.5 py-1 text-[10px] font-semibold text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-black"
          >
            View founder profile →
          </a>
        )}
      </div>
      <div className="mt-1.5 flex flex-col">
        {entries.map((entry, index) => (
          <div
            key={`${entry.label}-${index}`}
            className={`flex gap-2 py-1.5 ${
              index < entries.length - 1 ? 'border-b border-dashed border-white/10' : ''
            }`}
          >
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-lime-400" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-white">{entry.label}</div>
              <div className="mt-0.5 text-[10px] text-gray-500">{entry.detail}</div>
              {entry.progress !== undefined && (
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ${entry.progressClass || 'bg-[#D4FF00]'}`}
                    style={{ width: `${entry.progress}%` }}
                    aria-label={`${entry.label}: ${entry.progress} out of 100`}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MatchMetric({
  label,
  value,
  accent = 'text-white',
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="min-w-0 border-l border-white/15 px-3 first:border-l-0">
      <div className="truncate text-[9px] font-mono uppercase tracking-[0.18em] text-gray-500">
        {label}
      </div>
      <div className={`mt-1 text-lg font-black tabular-nums ${accent}`}>
        {Number(value || 0).toLocaleString('en-IN')}
      </div>
    </div>
  );
}

function MatchIntelligence({
  summary,
  isLoading,
  isError,
  startup,
}: {
  summary?: StartupMatchSummary;
  isLoading: boolean;
  isError: boolean;
  startup?: any;
}) {
  const matches = summary?.matches;
  const sector = summary?.startup?.sector || startup?.sector || 'Startup sector';
  const sectorMatches = summary?.sector_matches;

  return (
    <section className="col-span-12 overflow-hidden rounded-lg border border-[#D4FF00]/45 bg-black/75 shadow-[0_0_28px_rgba(212,255,0,0.045)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#D4FF00]/20 px-3 py-2">
        <div>
          <div className="text-[9px] font-mono font-bold uppercase tracking-[0.24em] text-[#D4FF00]">
            Investor match intelligence
          </div>
          <div className="mt-0.5 text-xs text-gray-400">
            Real stored matches for this startup profile.
          </div>
        </div>
        <Link
          to="/matches"
          className="rounded border border-[#D4FF00]/60 px-3 py-1.5 text-[10px] font-bold text-[#D4FF00] transition hover:bg-[#D4FF00] hover:text-black"
        >
          View matches
        </Link>
      </div>

      {isLoading && (
        <div className="px-3 py-4 text-xs text-gray-400">
          Loading investor-match inventory…
        </div>
      )}

      {isError && (
        <div className="border-l-2 border-red-400 px-3 py-3 text-xs text-red-200">
          Match intelligence is temporarily unavailable. Existing Conversion signals remain unchanged.
        </div>
      )}

      {!isLoading && !isError && matches && (
        <>
          <div className="grid grid-cols-2 gap-y-3 px-2 py-3 sm:grid-cols-5">
            <MatchMetric label="Total investor matches" value={matches.total} accent="text-[#D4FF00]" />
            <MatchMetric label="Sector aligned" value={matches.sector_matches} />
            <MatchMetric label="Stage aligned" value={matches.stage_matches} />
            <MatchMetric label="Ask aligned" value={matches.ticket_matches} />
            <MatchMetric label="Geography aligned" value={matches.geography_matches} />
          </div>

          <div className="grid grid-cols-2 border-t border-white/10 bg-white/[0.018] px-2 py-3 sm:grid-cols-5">
            <MatchMetric
              label={`${sector} aligned`}
              value={sectorMatches?.total || 0}
              accent="text-cyan-200"
            />
            <MatchMetric label="Gold" value={matches.gold} accent="text-amber-300" />
            <MatchMetric label="Silver" value={matches.silver} accent="text-slate-200" />
            <MatchMetric label="Bronze" value={matches.bronze} accent="text-orange-300" />
            <MatchMetric label="Coal" value={matches.coal} accent="text-red-300" />
          </div>
        </>
      )}
    </section>
  );
}

function FounderGuidanceRibbon() {
  const guidance =
    'Low Conversion ratings may reflect incomplete founder evidence. Revisit your Apply profile and complete it thoroughly—a partially completed record can weaken your results. Strengthen your deck and provide the preparatory material requested in the Conversion workspace.';

  return (
    <section className="col-span-12 overflow-hidden rounded border border-[#D4FF00]/35 bg-[#D4FF00]/[0.045] py-2">
      <div className="tdv-guidance-roll flex w-max items-center gap-14 whitespace-nowrap px-4 font-mono text-[10px] font-semibold text-[#D4FF00]">
        <span>{guidance}</span>
        <span aria-hidden="true">{guidance}</span>
      </div>
      <style>{`
        @keyframes tdv-guidance-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .tdv-guidance-roll {
          animation: tdv-guidance-scroll 42s linear infinite;
        }
        .tdv-guidance-roll:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .tdv-guidance-roll {
            animation: none;
            white-space: normal;
          }
        }
      `}</style>
    </section>
  );
}

function ConnectionEngine({
  brief,
  matchSummary,
  opportunityInventory,
}: {
  brief?: any;
  matchSummary?: StartupMatchSummary;
  opportunityInventory?: any;
}) {
  const signalCount = Array.isArray(brief?.leading_signals)
    ? brief.leading_signals.length
    : 0;
  const investorMatchCount = Number(matchSummary?.matches?.total || 0);

  const signalStrength =
    typeof brief?.investability_score === 'number'
      ? `${brief.investability_score} / 100`
      : 'Awaiting Conversion signal';

  return (
    <section className="rounded-lg border border-lime-400/70 bg-black/75 p-2.5">
      <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">
        Connection engine
      </p>
      <h2 className="mt-1 text-lg font-semibold text-white">
        Evidence becomes execution.
      </h2>

      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <div className="border-l-2 border-white/80 pl-2.5">
          <p className="text-xs font-semibold text-white">Investor matches</p>
          <p className="mt-0.5 text-[11px] leading-4 text-gray-400">
            {investorMatchCount.toLocaleString('en-IN')} stored match{investorMatchCount === 1 ? '' : 'es'}.
          </p>
        </div>

        <div className="border-l-2 border-lime-400 pl-2.5">
          <p className="text-xs font-semibold text-white">
            Qualified opportunities
          </p>
          <p className="mt-0.5 text-[11px] leading-4 text-gray-400">
            {Number(
              opportunityInventory?.summary?.qualified_total || 0,
            ).toLocaleString('en-IN')}{' '}
            at ≥50 ·{' '}
            {Number(
              opportunityInventory?.summary?.active_opportunities || 0,
            ).toLocaleString('en-IN')}{' '}
            active.
          </p>
        </div>

        <div className="border-l-2 border-red-400 pl-2.5">
          <p className="text-xs font-semibold text-white">Conversion intelligence</p>
          <p className="mt-0.5 text-sm font-semibold text-white">
            {signalStrength} · {signalCount} leading signal{signalCount === 1 ? '' : 's'}
          </p>
        </div>
      </div>
    </section>
  );
}

function VerificationAssessmentPanel({ verification }: { verification?: any }) {
  const verified =
    verification?.status === 'profile_verified' &&
    verification?.frozen === true;

  if (!verified) {
    return (
      <section className="rounded-lg border border-red-500/50 bg-red-950/10 p-2.5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-300">
          Profile Not Verified
        </p>
        <p className="mt-1 text-xs leading-4 text-gray-500">
          Execution remains available. No TD Ventures verification assessment
          has been frozen for this profile.
        </p>
      </section>
    );
  }

  const dimensions = Array.isArray(verification.dimension_comparison)
    ? verification.dimension_comparison
    : [];

  return (
    <section className="rounded-lg border border-lime-400/55 bg-lime-400/[0.035] p-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">
          ★ Verified Profile by TD Ventures
        </p>
        <p className="text-[9px] uppercase tracking-wider text-gray-600">
          Frozen · independent views
        </p>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <div className="rounded-md border border-white/10 bg-black/55 p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-gray-500">
            Founder assessment
          </div>
          <div className="mt-1 text-xl font-semibold text-gray-200">
            {verification.founder_claim_score ?? '—'}/100
          </div>
        </div>
        <div className="rounded-md border border-lime-400/35 bg-black/55 p-2.5">
          <div className="text-[9px] uppercase tracking-wider text-gray-500">
            TD Ventures assessment
          </div>
          <div className="mt-1 text-xl font-semibold text-lime-300">
            {verification.td_verified_score ?? '—'}/100
          </div>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-4 text-gray-500">
        Neither assessment replaces the other. Investors retain their own
        judgment.
      </p>

      {dimensions.length > 0 && (
        <details className="mt-2 rounded-md border border-white/10 bg-black/45">
          <summary className="cursor-pointer px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-gray-300">
            Compare all 20 verified dimensions
          </summary>
          <div className="max-h-64 overflow-y-auto border-t border-white/10">
            <div className="sticky top-0 grid grid-cols-[1fr_64px_64px] gap-2 bg-black px-3 py-2 text-[9px] uppercase tracking-wider text-gray-600">
              <span>Dimension</span>
              <span className="text-center">Founder</span>
              <span className="text-center">TD</span>
            </div>
            {dimensions.map((item: any) => (
              <div
                key={item.key}
                className="grid grid-cols-[1fr_64px_64px] gap-2 border-t border-white/10 px-3 py-2 text-[11px]"
              >
                <span className="text-gray-300">{item.label || item.key}</span>
                <span className="text-center text-gray-500">
                  {item.founder_rating ?? '—'}/5
                </span>
                <span className="text-center font-semibold text-lime-300">
                  {item.td_verified_rating ?? '—'}/5
                </span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function formatUsdRange(investor: any) {
  const minimum = Number(investor?.ticket_min_usd);
  const maximum = Number(investor?.ticket_max_usd);
  if (!Number.isFinite(minimum) && !Number.isFinite(maximum)) return 'Not set';
  const format = (value: number) =>
    `USD ${value.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
  if (Number.isFinite(minimum) && Number.isFinite(maximum)) {
    return `${format(minimum)}–${format(maximum)}`;
  }
  return Number.isFinite(minimum) ? `From ${format(minimum)}` : `Up to ${format(maximum)}`;
}

function PipelineBar({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: string;
}) {
  const width = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-[11px]">
        <span className="text-gray-400">{label}</span>
        <span className="font-semibold tabular-nums text-white">{value.toLocaleString('en-IN')}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function InvestorDashboard({
  investor,
  inventory,
  isLoading,
  isError,
}: {
  investor: any;
  inventory: any;
  isLoading: boolean;
  isError: boolean;
}) {
  const queryClient = useQueryClient();
  const summary = inventory?.summary || {};
  const verifiedItems = Array.isArray(inventory?.verified_items)
    ? inventory.verified_items
    : [];
  const topSectors = Array.isArray(summary.top_sectors) ? summary.top_sectors : [];
  const total = Number(summary.matches_total || 0);
  const verified = Number(summary.verified_matches || 0);
  const evidence = Number(summary.evidence_available || 0);
  const evidenceUnverified = Number(summary.evidence_backed_unverified || 0);
  const matchLed = Math.max(0, total - evidence);
  const active = Number(summary.active_opportunities || 0);

  const createOpportunity = useMutation({
    mutationFn: (match: any) =>
      startOpportunity({
        match_id: match.id,
        startup_id: match.startup_id,
        investor_id: match.investor_id,
        direction: 'investor_to_startup',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['qualifiedOpportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dealFlow'] });
    },
  });

  return (
    <div className="mt-2 grid grid-cols-12 gap-2">
      <div className="col-span-12 flex items-end justify-between gap-4 border-b border-white/10 pb-2">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-lime-300">
            Investor mandate → verified evidence → investor judgment
          </p>
          <h1 className="mt-0.5 text-xl font-semibold text-white sm:text-2xl">Investor Deal Desk</h1>
          <p className="mt-1 text-xs text-gray-500">
            Verified profiles graduate here. The wider non-verified queue remains in Discover Startups.
          </p>
        </div>
        <Link
          to="/discover/startups"
          className="hidden rounded-md border border-lime-400/50 px-3 py-2 text-xs font-semibold text-lime-300 transition hover:bg-lime-400 hover:text-black sm:block"
        >
          Review startup matches →
        </Link>
      </div>

      <section className="col-span-12 rounded-lg border border-lime-400/50 bg-black/75 p-4">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.22em] text-lime-300">
              TD Verified profile pipeline
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold text-white">
              {verified === 0 ? 'No TD Verified profiles yet' : `${verified.toLocaleString('en-IN')} matching verified profile${verified === 1 ? '' : 's'}`}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-5 text-gray-400">
              Verified profiles that match your mandate appear below for opportunity creation. Verification is optional, records a frozen TD Admin assessment, and is not investment due diligence or an endorsement.
            </p>
          </div>
          <div className="grid min-w-[280px] grid-cols-2 gap-2">
            <div className="rounded-md border border-lime-400/25 bg-lime-400/[0.04] p-3">
              <div className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Verified matches</div>
              <div className="mt-1 text-2xl font-black text-lime-300">{verified.toLocaleString('en-IN')}</div>
            </div>
            <div className="rounded-md border border-cyan-400/25 bg-cyan-400/[0.04] p-3">
              <div className="text-[9px] uppercase tracking-[0.18em] text-gray-500">Active execution</div>
              <div className="mt-1 text-2xl font-black text-cyan-300">{active.toLocaleString('en-IN')}</div>
            </div>
          </div>
        </div>
      </section>

      <section className="col-span-12 rounded-lg border border-cyan-400/35 bg-black/75 p-4 xl:col-span-8">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200">
              Matching verified profiles
            </p>
            <h2 className="mt-1 text-lg font-semibold text-white">Graduation lane</h2>
          </div>
          <span className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] text-gray-500">
            Verified only
          </span>
        </div>

        {isLoading && <p className="mt-4 text-sm text-gray-500">Loading verified pipeline…</p>}
        {isError && (
          <p className="mt-4 rounded-md border border-red-400/30 bg-red-950/20 p-3 text-sm text-red-200">
            Verified pipeline intelligence is temporarily unavailable.
          </p>
        )}
        {!isLoading && !isError && verifiedItems.length === 0 && (
          <div className="mt-4 rounded-lg border border-dashed border-white/15 bg-white/[0.02] p-6">
            <h3 className="text-lg font-semibold text-white">No matching verified profiles</h3>
            <p className="mt-2 max-w-2xl text-sm leading-5 text-gray-500">
              This is a graduation state, not an empty marketplace. You currently have {total.toLocaleString('en-IN')} matched startups; {evidence.toLocaleString('en-IN')} already have enough independent evidence for review while optional verification develops.
            </p>
            <Link to="/discover/startups" className="mt-4 inline-flex rounded-md bg-lime-400 px-4 py-2 text-sm font-semibold text-black">
              Review evidence-backed matches →
            </Link>
          </div>
        )}

        {verifiedItems.length > 0 && (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {verifiedItems.map((match: any) => {
              const activeOpportunity = Boolean(match.active_opportunity_id);
              const pending = createOpportunity.isPending && createOpportunity.variables?.id === match.id;
              return (
                <article key={match.id} className="rounded-lg border border-lime-400/30 bg-lime-400/[0.025] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[9px] uppercase tracking-[0.2em] text-lime-300">★ TD Verified</div>
                      <h3 className="mt-1 text-base font-semibold text-white">
                        {match.startup_sector || 'Sector not disclosed'} · {match.startup_stage || 'Stage pending'}
                      </h3>
                      <p className="mt-1 text-xs text-gray-600">Founder identity protected until reveal</p>
                    </div>
                    <div className="text-right">
                      <div className="text-[9px] uppercase tracking-wider text-gray-600">Review</div>
                      <div className="text-lg font-black text-white">{match.review_score ?? '—'}/100</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                    <div><span className="block text-[9px] text-gray-600">Match</span><span className="text-gray-200">{match.match_score ?? '—'}/100</span></div>
                    <div><span className="block text-[9px] text-gray-600">TD score</span><span className="text-lime-300">{match.profile_verification?.td_verified_score ?? '—'}/100</span></div>
                    <div><span className="block text-[9px] text-gray-600">Risk</span><span className="text-gray-200">{match.risk_level || 'Awaiting'}</span></div>
                  </div>
                  {activeOpportunity ? (
                    <Link to="/opportunities" className="mt-4 inline-flex w-full justify-center rounded-md border border-cyan-300/40 px-3 py-2 text-xs font-semibold text-cyan-200">
                      Open active opportunity →
                    </Link>
                  ) : (
                    <button
                      type="button"
                      disabled={pending || createOpportunity.isPending}
                      onClick={() => createOpportunity.mutate(match)}
                      className="mt-4 w-full rounded-md bg-lime-400 px-3 py-2 text-xs font-semibold text-black disabled:opacity-50"
                    >
                      {pending ? 'Creating opportunity…' : 'Create verified opportunity'}
                    </button>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="col-span-12 rounded-lg border border-white/10 bg-black/75 p-4 xl:col-span-4">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">Your investor mandate</p>
        <h2 className="mt-1 text-lg font-semibold text-white">{investor.firm || investor.full_name || 'Investor profile'}</h2>
        <div className="mt-3 space-y-2 text-xs">
          {[
            ['Sector', investor.sector || 'Not set'],
            ['Stage', investor.stage || 'Not set'],
            ['Geography', investor.geography || 'Not set'],
            ['Ticket', formatUsdRange(investor)],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-4 border-b border-white/10 pb-2">
              <span className="text-gray-600">{label}</span><span className="text-right text-gray-200">{value}</span>
            </div>
          ))}
        </div>
        <Link to="/discover/startups" className="mt-4 inline-flex text-xs font-semibold text-cyan-200 hover:text-lime-300">
          Test mandate against all matches →
        </Link>
      </section>

      <section className="col-span-12 rounded-lg border border-white/10 bg-black/75 p-4 lg:col-span-7">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200">Pipeline intelligence</p>
            <h2 className="mt-1 text-lg font-semibold text-white">Evidence maturity</h2>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="text-[9px] uppercase tracking-wider text-gray-600">Evidence review avg.</div>
            <ScoreRing value={summary.average_evidence_review_score} />
          </div>
        </div>
        <div className="mt-4 space-y-3">
          <PipelineBar label="TD Verified" value={verified} total={total} tone="bg-lime-300 shadow-[0_0_8px_rgba(212,255,0,.7)]" />
          <PipelineBar label="Evidence-backed · verification developing" value={evidenceUnverified} total={total} tone="bg-cyan-300" />
          <PipelineBar label="Match-led · evidence awaited" value={matchLed} total={total} tone="bg-gray-600" />
        </div>
        <p className="mt-4 text-[11px] leading-5 text-gray-600">
          Non-verified profiles are counted here for context but are not repeated as Dashboard cards. They graduate into the verified lane only after optional TD Verification is frozen.
        </p>
      </section>

      <section className="col-span-12 rounded-lg border border-white/10 bg-black/75 p-4 lg:col-span-5">
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">Match concentration</p>
        <h2 className="mt-1 text-lg font-semibold text-white">Top sectors in your network</h2>
        <div className="mt-4 space-y-2.5">
          {topSectors.map((item: any) => (
            <div key={item.sector}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-300">{item.sector}</span>
                <span className="tabular-nums text-gray-500">{Number(item.matches || 0).toLocaleString('en-IN')}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-lime-300/80"
                  style={{ width: `${total > 0 ? Math.min(100, (Number(item.matches || 0) / total) * 100) : 0}%` }}
                />
              </div>
            </div>
          ))}
          {!topSectors.length && <p className="text-sm text-gray-600">Sector distribution is awaiting matched profiles.</p>}
        </div>
      </section>

      <section className="col-span-12 flex flex-col justify-between gap-4 rounded-lg border border-yellow-400/25 bg-yellow-400/[0.025] p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-yellow-200">Recommended next action</p>
          <p className="mt-1 text-sm font-semibold text-white">
            {verified > 0
              ? 'Review the verified graduation lane and create opportunities where your judgment supports action.'
              : evidence > 0
                ? `Review the ${evidence.toLocaleString('en-IN')} evidence-backed match${evidence === 1 ? '' : 'es'} while verified profiles develop.`
                : 'Review the Top 40 queue and adjust your investor review threshold to build an evidence-led shortlist.'}
          </p>
        </div>
        <Link to="/discover/startups" className="shrink-0 rounded-md border border-yellow-300/40 px-4 py-2 text-xs font-semibold text-yellow-100 hover:bg-yellow-300 hover:text-black">
          Open review queue →
        </Link>
      </section>
    </div>
  );
}

export default function DashboardPage() {
  const hasToken = Boolean(localStorage.getItem('tdventure_token'));

  const profilePlaneQuery = useQuery({
    queryKey: ['profilePlane'],
    queryFn: getCurrentProfilePlane,
    enabled: hasToken,
    staleTime: 5 * 60 * 1000,
  });

  const profileResolution = profilePlaneQuery.data?.resolution;

  const linkedStartup: any =
    profileResolution?.state === 'linked' &&
    profileResolution.profile_type === 'startup'
      ? profileResolution.profile
      : null;

  const linkedInvestor: any =
    profileResolution?.state === 'linked' &&
    profileResolution.profile_type === 'investor'
      ? profileResolution.profile
      : null;

  const briefQuery = useQuery({
    queryKey: ['dealDeskBrief', linkedStartup?.id],
    queryFn: () => getDealDeskBrief(String(linkedStartup?.id)),
    enabled: Boolean(linkedStartup?.id),
    retry: false,
    staleTime: 60 * 1000,
  });

  const matchSummaryQuery = useQuery({
    queryKey: ['startupMatchSummary', linkedStartup?.id],
    queryFn: getMyMatchSummary,
    enabled: Boolean(linkedStartup?.id),
    retry: false,
    staleTime: 60 * 1000,
  });

  const qualifiedOpportunityQuery = useQuery({
    queryKey: ['qualifiedOpportunities', 'dashboard'],
    queryFn: () =>
      getQualifiedOpportunities({
        view: 'all',
        limit: 1,
        offset: 0,
      }),
    enabled: Boolean(linkedStartup?.id || linkedInvestor?.id),
    retry: false,
    staleTime: 60 * 1000,
  });

  const dealFlowQuery = useQuery({
    queryKey: ['dealFlow', 'dashboardTotal'],
    queryFn: getDealFlow,
    enabled: Boolean(linkedStartup?.id || linkedInvestor?.id),
    retry: false,
    staleTime: 60 * 1000,
  });

  const brief = briefQuery.data?.brief;
  const matchSummary = matchSummaryQuery.data;
  const opportunityInventory = qualifiedOpportunityQuery.data;
  const nextAction =
    brief?.next_best_action ||
    'Complete a Conversion Review to create the first evidence-backed action.';

  if (!hasToken) {
    return (
      <div className="p-4">
        <h1 className="mb-2 text-2xl font-semibold text-white">TD Venture Deal Desk</h1>
        <p className="mb-4 text-lime-300">Fundraising execution workspace</p>
        <div className="max-w-2xl rounded-lg border border-lime-500/60 bg-black/70 p-4">
          <h2 className="mb-2 text-lg font-semibold">Please login to start</h2>
          <p className="mb-3 text-sm text-gray-400">
            Manage your evidence, investor engagement and execution decisions in one workspace.
          </p>
          <Link to="/login" className="inline-block rounded-md bg-lime-400 px-5 py-2 font-semibold text-black">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1800px] px-1 pb-16" data-layout="TDV_DENSE_GRID_V2">
      <TerminalHeader />

      {!linkedStartup && !linkedInvestor && (
        <div className="my-2">
          <p className="text-[11px] font-mono uppercase tracking-[0.28em] text-lime-300">
            Founder truth → AI interpretation → CRM action
          </p>
          <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">TD Venture Deal Desk</h1>
          <p className="mt-1 text-sm text-gray-400">Your calm operating terminal for fundraising execution.</p>
        </div>
      )}

      {profilePlaneQuery.isLoading && (
        <p className="mt-2 text-sm text-gray-400">Loading your Deal Desk...</p>
      )}

      {profilePlaneQuery.isError && (
        <div className="mt-2 rounded-lg border border-red-400/50 bg-black/70 p-3 text-sm text-red-200">
          We could not load your canonical profile. Please logout and login again.
        </div>
      )}

      {!profilePlaneQuery.isLoading && !profilePlaneQuery.isError && !linkedStartup && !linkedInvestor && (
        <section className="mt-2 rounded-lg border border-lime-500/50 bg-black/70 p-4">
          <h2 className="text-lg font-semibold text-white">Application profile required</h2>
          <p className="mt-1.5 max-w-2xl text-sm text-gray-400">
            Complete and link your startup or investor application to activate the correct Deal Desk workspace.
          </p>
        </section>
      )}

      {linkedInvestor && (
        <InvestorDashboard
          investor={linkedInvestor}
          inventory={opportunityInventory}
          isLoading={qualifiedOpportunityQuery.isLoading}
          isError={qualifiedOpportunityQuery.isError}
        />
      )}

      {linkedStartup && (
        <div className="mt-2 grid grid-cols-12 gap-2">
          <div className="col-span-12 flex items-center justify-between border-b border-white/10 pb-2">
            <div className="min-w-0">
              <p className="text-[10px] font-mono uppercase tracking-[0.24em] text-lime-300">
                Founder truth → AI interpretation → CRM action
              </p>
              <h1 className="mt-0.5 text-xl font-semibold text-white">TD Venture Deal Desk</h1>
            </div>
            <p className="hidden shrink-0 text-xs text-gray-500 sm:block">
              Qualified opportunities and communications.
            </p>
          </div>

          <MatchIntelligence
            summary={matchSummary}
            isLoading={matchSummaryQuery.isLoading}
            isError={matchSummaryQuery.isError}
            startup={linkedStartup}
          />

          <div
            id="deal-desk-signal-detail"
            className="col-span-12 scroll-mt-4 space-y-2 lg:col-span-7"
          >
            <section className="rounded-lg border border-cyan-300/50 bg-black/70 px-3 py-2">
              <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-200">
                Canonical startup context
              </div>
              <div className="mt-1 text-lg font-semibold text-white">
                {linkedStartup.startup_name || 'Startup profile'}
              </div>
              <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-sm">
                <div><span className="block text-[10px] text-gray-500">Sector</span><span className="text-gray-200">{linkedStartup.sector || 'Not set'}</span></div>
                <div><span className="block text-[10px] text-gray-500">Stage</span><span className="text-gray-200">{linkedStartup.stage || 'Not set'}</span></div>
                <div><span className="block text-[10px] text-gray-500">Raise</span><span className="text-gray-200">{linkedStartup.ask || 'Not set'}</span></div>
              </div>
            </section>

            {brief && (
              <VerificationAssessmentPanel
                verification={brief.profile_verification}
              />
            )}

            <ConnectionEngine
              brief={brief}
              matchSummary={matchSummary}
              opportunityInventory={opportunityInventory}
            />

            {brief && (
              <section className="rounded-lg border border-lime-500/40 bg-black/70 p-2.5">
                <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">Next best action</div>
                <p className="mt-1.5 text-base font-semibold leading-5 text-white">{nextAction}</p>
                {brief.deal_desk_recommendation && (
                  <p className="mt-1.5 text-xs leading-4 text-gray-400">{brief.deal_desk_recommendation}</p>
                )}
              </section>
            )}

            {brief && (
              <section className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-black/70 p-2.5">
                  <h2 className="text-sm font-semibold text-white">Evidence to strengthen</h2>
                  <div className="mt-1.5 space-y-1.5">
                    {(brief.missing_evidence || []).slice(0, 4).map((item: any, index: number) => (
                      <div key={`${item.item || 'evidence'}-${index}`} className="border-l border-red-400/70 pl-2 text-xs">
                        <div className="text-gray-200">{item.item || 'Evidence item'}</div>
                        <div className="text-[10px] text-gray-500">{item.priority || 'Unprioritised'} priority</div>
                      </div>
                    ))}
                    {!brief.missing_evidence?.length && <p className="text-xs text-gray-500">None recorded.</p>}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-black/70 p-2.5">
                  <h2 className="text-sm font-semibold text-white">Scores</h2>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5 text-center">
                    <div><div className="text-[10px] text-gray-500">Investability</div><div className="text-sm font-semibold text-white">{brief.investability_score ?? '—'}</div></div>
                    <div><div className="text-[10px] text-gray-500">Confidence</div><div className="text-sm font-semibold text-white">{brief.confidence_level || '—'}</div></div>
                    <div><div className="text-[10px] text-gray-500">Risk</div><div className="text-sm font-semibold text-white">{brief.overall_risk_level || '—'}</div></div>
                  </div>
                </div>
              </section>
            )}

            {!briefQuery.isLoading && !brief && (
              <section className="rounded-lg border border-lime-500/40 bg-black/70 p-2.5">
                <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-lime-300">Conversion signal</p>
                <h2 className="mt-1 text-base font-semibold text-white">No evidence-backed signal yet</h2>
                <p className="mt-1 text-xs text-gray-400">Run Conversion Review to create a current signal for Deal Desk.</p>
              </section>
            )}

            <ActivityLog brief={brief} startup={linkedStartup} />
          </div>

          <div className="col-span-12 flex flex-col gap-2 lg:col-span-5">
            <div className="w-full rounded-lg border border-white/10 bg-black/60 p-2">
              <NeuralField brief={brief} />
            </div>
            <SignalScoreBreakdown brief={brief} />
            <OpportunityScoreDonut totalOpportunities={dealFlowQuery.data?.length ?? 0} />
          </div>

          <FounderGuidanceRibbon />
        </div>
      )}
    </div>
  );
}
