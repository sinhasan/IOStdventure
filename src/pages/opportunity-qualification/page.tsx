import { Link } from 'react-router-dom';

const factors = [
  {
    weight: '50%',
    title: 'Match Fit',
    detail: 'Sector, stage, geography and USD ticket-size alignment.',
    accent: 'border-cyan-300/45 text-cyan-200',
  },
  {
    weight: '30%',
    title: 'Conversion Score',
    detail: 'Deck evidence, traction, narrative, readiness, investor fit and risk.',
    accent: 'border-[#D4FF00]/45 text-[#D4FF00]',
  },
  {
    weight: '20%',
    title: 'Independent Diamond Index',
    detail: 'A separate assessment. AI Evidence is never silently substituted for Diamond.',
    accent: 'border-white/25 text-white',
  },
];

const bands = [
  { range: '70–100', label: 'High-conviction opportunity', treatment: 'Prioritise in Deal Desk', color: 'text-[#D4FF00]' },
  { range: '50–69', label: 'TD Qualified opportunity', treatment: 'Recommend execution', color: 'text-cyan-200' },
  { range: '30–49', label: 'Developing opportunity', treatment: 'Show gaps and preparation actions', color: 'text-yellow-300' },
  { range: 'Below 30', label: 'Match only', treatment: 'Visible, but not system-promoted', color: 'text-gray-400' },
];

export default function OpportunityQualificationPage() {
  return (
    <div className="mx-auto max-w-[1500px] pb-16">
      <section className="overflow-hidden rounded-xl border border-[#D4FF00]/45 bg-black/80">
        <div className="border-b border-[#D4FF00]/20 px-5 py-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[#D4FF00]">
            Match → Conversion → Opportunity
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-white">
            Match to Opportunity Qualification
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-gray-400">
            The model ranks opportunity potential using canonical investor fit, evidence-backed
            Conversion intelligence and the independent Diamond Index. It informs investor
            judgment; it does not replace it.
          </p>
        </div>

        <div className="grid gap-3 p-4 md:grid-cols-3">
          {factors.map((factor) => (
            <article key={factor.title} className={`rounded-lg border bg-white/[0.025] p-4 ${factor.accent}`}>
              <div className="font-mono text-3xl font-black tabular-nums">{factor.weight}</div>
              <h2 className="mt-2 text-base font-semibold text-white">{factor.title}</h2>
              <p className="mt-1 text-xs leading-5 text-gray-400">{factor.detail}</p>
            </article>
          ))}
        </div>

        <div className="mx-4 mb-4 rounded-lg border border-white/10 bg-white/[0.025] px-4 py-4 text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Opportunity Score
          </p>
          <p className="mt-2 text-lg font-semibold text-white">
            0.50 × Match Fit <span className="text-gray-600">+</span> 0.30 × Conversion Score{' '}
            <span className="text-gray-600">+</span> 0.20 × Diamond Index
          </p>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-cyan-300/35 bg-cyan-300/[0.035] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-cyan-200">
          Investor review lane
        </p>
        <div className="mt-2 grid gap-4 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-semibold text-white">Recommended review floor: 50/100</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              Investors may move the review threshold from 0 to 100, filter by evidence state,
              and focus on a Top 40 queue. This changes personal prioritisation only. TD’s
              qualification benchmark remains set at 50.
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {[
              ['50', 'Default investor review'],
              ['66', 'Fixed TD benchmark'],
              ['40', 'Maximum focused queue'],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-white/10 bg-black/50 p-4">
                <div className="text-2xl font-black tabular-nums text-white">{value}</div>
                <div className="mt-1 text-xs text-gray-500">{label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-4 rounded-md border border-white/10 bg-black/40 p-3 text-xs leading-5 text-gray-500">
          When one canonical component is still missing, the review score reweights only the
          available inputs for sorting. It remains clearly marked Investor Review and never
          becomes TD Qualified until Match Fit, Conversion, and independent Diamond are present.
        </p>
      </section>

      <section className="mt-3 grid gap-3 lg:grid-cols-[1.35fr_0.65fr]">
        <div className="rounded-xl border border-white/10 bg-black/75 p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-gray-500">
            Qualification bands
          </p>
          <div className="mt-3 divide-y divide-white/10">
            {bands.map((band) => (
              <div key={band.range} className="grid gap-2 py-3 sm:grid-cols-[110px_1fr_1fr] sm:items-center">
                <div className={`text-lg font-black tabular-nums ${band.color}`}>{band.range}</div>
                <div className="text-sm font-semibold text-white">{band.label}</div>
                <div className="text-xs text-gray-500">{band.treatment}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-yellow-300/35 bg-yellow-300/[0.035] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-yellow-300">
            Signal confidence
          </p>
          <h2 className="mt-2 text-lg font-semibold text-white">Reliability, not artificial uplift</h2>
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <div className="flex justify-between text-gray-400"><span>Weak</span><span>33 / 100</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full w-1/3 rounded-full bg-red-400" /></div>
            </div>
            <div>
              <div className="flex justify-between text-yellow-200"><span>Medium</span><span>66 / 100</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full w-2/3 rounded-full bg-yellow-300" /></div>
            </div>
            <div>
              <div className="flex justify-between text-white"><span>Strong</span><span>100 / 100</span></div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10"><div className="h-full w-full rounded-full bg-white" /></div>
            </div>
          </div>
          <p className="mt-4 text-xs leading-5 text-gray-500">
            Confidence communicates how much verified evidence supports the analysis. It does not
            add points to the Opportunity Score.
          </p>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-[#D4FF00]/50 bg-[#D4FF00]/[0.035] p-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[#D4FF00]">
          Investor judgment remains sovereign
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-white">Fundraising is not a closed formula.</h2>
        <p className="mt-2 max-w-5xl text-sm leading-6 text-gray-300">
          An investor may start an opportunity from any real match, regardless of its tier or
          qualification band. Relationships, timing, strategic interest and personal conviction
          may not yet exist in the data. TD Venture guides the decision; it does not dictate it.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            to="/discover/startups"
            className="rounded-md bg-[#D4FF00] px-4 py-2.5 text-sm font-semibold text-black transition hover:brightness-95"
          >
            Review startup matches →
          </Link>
          <Link
            to="/opportunities"
            className="rounded-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-[#D4FF00]/60 hover:text-[#D4FF00]"
          >
            Open execution workspace →
          </Link>
        </div>
      </section>
    </div>
  );
}
