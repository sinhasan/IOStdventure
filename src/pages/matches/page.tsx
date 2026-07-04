import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getDealFlow, updateDealFlowStatus, getOpportunityTimeline, getChiefOfStaffBrief } from '@/lib/api';

const stages = [
  { key: 'interested', label: 'Interested' },
  { key: 'payment_pending', label: 'Payment Pending' },
  { key: 'payment_complete', label: 'Payment Complete' },
  { key: 'investor_notified', label: 'Investor Notified' },
  { key: 'waiting_response', label: 'Waiting Response' },
  { key: 'accepted', label: 'Accepted' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { key: 'due_diligence', label: 'Due Diligence' },
  { key: 'funded', label: 'Funded' },
];

function nextStage(current: string) {
  const index = stages.findIndex((s) => s.key === current);
  if (index < 0 || index >= stages.length - 1) return null;
  return stages[index + 1];
}

function healthColor(status: string) {
  if (status === 'funded') return 'text-lime-300 border-lime-400/70';
  if (['accepted', 'meeting_scheduled', 'due_diligence'].includes(status)) return 'text-blue-300 border-blue-400/70';
  if (['waiting_response', 'investor_notified'].includes(status)) return 'text-yellow-300 border-yellow-400/70';
  return 'text-orange-300 border-orange-400/70';
}

function getPriority(opportunity: any) {
  const confidence = Number(opportunity?.investment_confidence ?? 0);
  const health = Number(opportunity?.health_score ?? 0);
  const status = opportunity?.status || 'interested';

  if (['payment_pending', 'waiting_response'].includes(status)) return 'High';
  if (confidence >= 75 && health >= 70) return 'High';
  if (confidence >= 55 || health >= 50) return 'Medium';
  return 'Watch';
}

function getWorkspaceAction(opportunity: any) {
  const status = opportunity?.status || 'interested';

  if (status === 'interested') return 'Qualify the match and confirm founder readiness.';
  if (status === 'payment_pending') return 'Complete payment or reveal before investor notification.';
  if (status === 'payment_complete') return 'Queue investor notification from Deal Desk.';
  if (status === 'investor_notified') return 'Monitor investor response and prepare follow-up.';
  if (status === 'waiting_response') return 'Follow up with investor and escalate if SLA is breached.';
  if (status === 'accepted') return 'Schedule founder-investor meeting.';
  if (status === 'meeting_scheduled') return 'Prepare meeting brief and diligence questions.';
  if (status === 'due_diligence') return 'Collect documents and prepare IC recommendation.';
  if (status === 'funded') return 'Capture outcome, terms and founder testimonial.';

  return opportunity?.next_best_action || opportunity?.next_action || 'Review opportunity and decide next step.';
}

function getDocumentReadiness(opportunity: any) {
  const founderTrust = Number(opportunity?.founder_trust_score ?? 50);
  const confidence = Number(opportunity?.investment_confidence ?? 0);
  const status = opportunity?.status || 'interested';

  return [
    {
      label: 'Pitch deck',
      ready: founderTrust >= 60 || confidence >= 60 || ['due_diligence', 'funded'].includes(status),
    },
    {
      label: 'Financial model',
      ready: confidence >= 70 || ['due_diligence', 'funded'].includes(status),
    },
    {
      label: 'Founder profile',
      ready: Boolean(opportunity?.startup_name || opportunity?.founder_name),
    },
    {
      label: 'Investor memo',
      ready: ['accepted', 'meeting_scheduled', 'due_diligence', 'funded'].includes(status),
    },
  ];
}

export default function OpportunitiesPage() {
  const [selected, setSelected] = useState<any | null>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['opportunities'],
    queryFn: getDealFlow,
  });

  const { data: selectedTimeline = [], isLoading: isTimelineLoading } = useQuery({
    queryKey: ['opportunityTimeline', selected?.id],
    queryFn: () => getOpportunityTimeline(selected.id),
    enabled: Boolean(selected?.id),
  });

  const { data: chiefBrief } = useQuery({
    queryKey: ['chiefOfStaffBrief'],
    queryFn: getChiefOfStaffBrief,
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateDealFlowStatus(id, status),
    onSuccess: () => refetch(),
  });

  const opportunities = Array.isArray(data) ? data : [];

  const stats = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      count: opportunities.filter((o: any) => (o.status || 'interested') === stage.key).length,
    }));
  }, [opportunities]);

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/75 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Investment Operating System
        </div>
        <h1 className="text-3xl font-semibold mb-2">Opportunities Workspace</h1>
        <p className="text-sm text-gray-400">
          Manage every active opportunity from interest to funding. This is the operating layer above AI matches.
        </p>
        <div className="mt-4 text-sm text-lime-300">
          AI Match → Opportunity → Payment → Notification → Response → Meeting → Due Diligence → Funded
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-6">
        <div className="border border-lime-500/60 bg-black/75 rounded-lg p-4">
          <div className="text-xs text-gray-400">Total Opportunities</div>
          <div className="text-3xl font-bold text-white mt-1">{opportunities.length}</div>
        </div>

        {stats.slice(0, 5).map((s) => (
          <div key={s.key} className="border border-lime-500/40 bg-black/70 rounded-lg p-4">
            <div className="text-xs text-gray-400">{s.label}</div>
            <div className="text-2xl font-bold text-lime-300 mt-1">{s.count}</div>
          </div>
        ))}
      </div>

      {isLoading ? (
        <p className="text-lime-300">Loading Opportunities...</p>
      ) : opportunities.length === 0 ? (
        <div className="border border-dashed border-lime-500/40 bg-black/70 rounded-lg p-8">
          <h2 className="text-xl font-semibold mb-2">No opportunities yet.</h2>
          <p className="text-sm text-gray-400">
            Start from Discover, choose a high-quality AI match, and click Start Opportunity.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
            {opportunities.map((o: any) => {
              const status = o.status || 'interested';
              const next = nextStage(status);

              return (
                <div
                  key={o.id}
                  className={`border ${healthColor(status)} bg-black/75 rounded-xl p-5 hover:shadow-[0_0_25px_rgba(163,255,18,0.12)] transition cursor-pointer`}
                  onClick={() => setSelected(o)}
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-lime-300">
                        {o.opportunity_code || 'Opportunity'}
                      </div>
                      <h2 className="text-lg font-semibold mt-1">
                        {o.startup_name || 'Protected Startup'}
                      </h2>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Investment Confidence</div>
                      <div className="text-xl font-bold text-lime-300">{o.investment_confidence ?? 0}%</div>
                      <div className="text-xs text-gray-400 mt-2">Risk</div>
                      <div className="text-sm font-bold text-yellow-300">{o.investment_risk || 'Medium'}</div>
                      <div className="text-xs text-gray-400 mt-2">AI Match</div>
                      <div className="text-sm font-bold text-lime-300">{o.match_score || 0}%</div>
                      <div className="text-xs text-gray-400 mt-2">Health</div>
                      <div className="text-lg font-bold text-lime-300">{o.health_score ?? 0}</div>
                      <div className="text-xs text-gray-400 mt-2">Trust</div>
                      <div className="text-sm font-bold text-blue-300">F {o.founder_trust_score ?? 50} / I {o.investor_trust_score ?? 50}</div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div><span className="text-gray-500">Status:</span> {stages.find((s) => s.key === status)?.label || status}</div>
                    <div><span className="text-gray-500">Sector:</span> {o.sector || o.focus_sectors || 'Not disclosed'}</div>
                    <div><span className="text-gray-500">Stage:</span> {o.stage || 'Not disclosed'}</div>
                    <div><span className="text-gray-500">Ask:</span> {o.ask || 'Not disclosed'}</div>
                    <div><span className="text-gray-500">Owner:</span> {o.owner_name || 'TD Venture Deal Desk'}</div>
                    <div><span className="text-gray-500">Next Best Action:</span> {o.next_best_action || o.next_action || 'Awaiting next event'}</div>
                  </div>

                  <div className="mt-4 border-t border-lime-500/30 pt-3 flex gap-2">
                    {next && (
                      <button
                        type="button"
                        className="rounded-md bg-lime-400 text-black px-3 py-2 text-sm font-semibold disabled:opacity-60"
                        disabled={updateStatus.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatus.mutate({ id: o.id, status: next.key });
                        }}
                      >
                        Move to {next.label}
                      </button>
                    )}

                    <button
                      type="button"
                      className="rounded-md border border-lime-500/60 text-lime-300 px-3 py-2 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelected(o);
                      }}
                    >
                      Open Workspace
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <aside className="border border-lime-500/60 bg-black/75 rounded-xl p-5 h-fit">
            <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-3">
              Chief of Staff
            </div>
            <h2 className="text-xl font-semibold mb-3">Today’s Opportunity Brief</h2>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="border border-lime-500/30 rounded-md p-3">
                <div className="text-xs text-gray-400">Needs Attention</div>
                <div className="text-2xl font-bold text-yellow-300">{chiefBrief?.totals?.attention ?? 0}</div>
              </div>
              <div className="border border-lime-500/30 rounded-md p-3">
                <div className="text-xs text-gray-400">CEO Time</div>
                <div className="text-2xl font-bold text-lime-300">{chiefBrief?.estimated_ceo_minutes ?? 0}m</div>
              </div>
            </div>

            <div className="space-y-3 text-sm text-gray-300">
              <div className="border border-lime-500/30 rounded-md p-3">
                <div className="text-lime-300 font-semibold">Recommended First Action</div>
                <p className="mt-1">{chiefBrief?.recommended_first_action || 'Review opportunities and AI matches.'}</p>
              </div>

              <div className="border border-yellow-500/30 rounded-md p-3">
                <div className="text-yellow-300 font-semibold">Payment Pending</div>
                <p className="mt-1">{chiefBrief?.totals?.payment_pending ?? 0} opportunities are waiting for payment / reveal.</p>
              </div>

              <div className="border border-blue-500/30 rounded-md p-3">
                <div className="text-blue-300 font-semibold">Waiting Response</div>
                <p className="mt-1">{chiefBrief?.totals?.waiting_response ?? 0} opportunities are waiting for investor response.</p>
              </div>

              <div className="border border-lime-500/30 rounded-md p-3">
                <div className="text-lime-300 font-semibold">Confidence</div>
                <p className="mt-1">{chiefBrief?.confidence ?? 0}% operational confidence based on current workflow signals.</p>
              </div>
            </div>
          </aside>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-3xl border border-lime-500/70 bg-black rounded-xl p-6 shadow-[0_0_35px_rgba(163,255,18,0.25)]">
            <div className="flex justify-between items-start mb-5">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
                  Opportunity Workspace
                </div>
                <h2 className="text-2xl font-semibold">
                  {selected.opportunity_code || 'Opportunity'}
                </h2>
              </div>
              <button className="text-gray-400 hover:text-white" onClick={() => setSelected(null)}>
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="border border-lime-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Investment Confidence</div>
                <div className="text-3xl font-bold text-lime-300">{selected.investment_confidence ?? 0}%</div>
                <div className="text-xs text-gray-500 mt-1">Risk: {selected.investment_risk || 'Medium'}</div>
              </div>
              <div className="border border-lime-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Status</div>
                <div className="text-lg font-semibold text-white">
                  {stages.find((s) => s.key === selected.status)?.label || selected.status || 'Interested'}
                </div>
              </div>
              <div className="border border-lime-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Health</div>
                <div className="text-3xl font-bold text-lime-300">{selected.health_score ?? 0}</div>
              </div>
              <div className="border border-blue-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Trust</div>
                <div className="text-xl font-bold text-blue-300">Founder {selected.founder_trust_score ?? 50}</div>
                <div className="text-xl font-bold text-blue-300">Investor {selected.investor_trust_score ?? 50}</div>
              </div>
            </div>

            <div className="mb-5 border border-lime-500/40 rounded-lg p-4 bg-black/40">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-lime-300">Deal Command Center</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Workspace 2.0 turns every opportunity into an actionable investment desk item.
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded-full border border-lime-500/40 px-3 py-1 text-lime-300">
                    Priority: {getPriority(selected)}
                  </span>
                  <span className="rounded-full border border-blue-500/40 px-3 py-1 text-blue-300">
                    Owner: {selected.owner_name || 'Deal Desk'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border border-lime-500/30 rounded-md p-3 md:col-span-2">
                  <div className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Next Best Action
                  </div>
                  <div className="mt-2 text-sm text-white">
                    {getWorkspaceAction(selected)}
                  </div>
                </div>

                <div className="border border-yellow-500/30 rounded-md p-3">
                  <div className="text-xs uppercase tracking-[0.25em] text-gray-500">
                    Current Stage
                  </div>
                  <div className="mt-2 text-sm font-semibold text-yellow-300">
                    {stages.find((s) => s.key === selected.status)?.label || selected.status || 'Interested'}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border border-blue-500/30 rounded-md p-3">
                  <div className="text-sm font-semibold text-blue-300 mb-3">Document Readiness</div>
                  <div className="space-y-2 text-sm">
                    {getDocumentReadiness(selected).map((doc) => (
                      <div key={doc.label} className="flex items-center justify-between">
                        <span className="text-gray-300">{doc.label}</span>
                        <span className={doc.ready ? 'text-lime-300' : 'text-yellow-300'}>
                          {doc.ready ? 'Ready' : 'Needed'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border border-lime-500/30 rounded-md p-3">
                  <div className="text-sm font-semibold text-lime-300 mb-3">Quick Actions</div>
                  <div className="grid grid-cols-1 gap-2 text-sm">
                    <button type="button" className="rounded-md border border-lime-500/50 px-3 py-2 text-left text-lime-300">
                      Follow up with founder
                    </button>
                    <button type="button" className="rounded-md border border-yellow-500/50 px-3 py-2 text-left text-yellow-300">
                      Request missing documents
                    </button>
                    <button type="button" className="rounded-md border border-blue-500/50 px-3 py-2 text-left text-blue-300">
                      Prepare IC review note
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mb-5 border border-blue-500/40 rounded-lg p-4 bg-black/40">
              <h3 className="font-semibold text-blue-300 mb-3">Founder Trust Coach</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Current Founder Trust</div>
                  <div className="text-3xl font-bold text-blue-300">{selected.founder_trust_score ?? 50}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Potential Trust</div>
                  <div className="text-3xl font-bold text-lime-300">
                    {Math.min(100, Number(selected.founder_trust_score ?? 50) + 20)}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Recommended Next Step</div>
                  <div className="text-lime-300 font-semibold mt-1">
                    Upload pitch deck and financial model
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="border border-lime-500/20 rounded-md p-3">
                  <div className="text-lime-300 font-semibold">✓ Email verified</div>
                  <div className="text-gray-500 text-xs mt-1">Founder has provided a valid email.</div>
                </div>

                <div className="border border-lime-500/20 rounded-md p-3">
                  <div className="text-lime-300 font-semibold">✓ Mobile available</div>
                  <div className="text-gray-500 text-xs mt-1">Phone number improves follow-up reliability.</div>
                </div>

                <div className="border border-yellow-500/20 rounded-md p-3">
                  <div className="text-yellow-300 font-semibold">□ Pitch deck missing</div>
                  <div className="text-gray-500 text-xs mt-1">Uploading a deck can improve trust and readiness.</div>
                </div>

                <div className="border border-yellow-500/20 rounded-md p-3">
                  <div className="text-yellow-300 font-semibold">□ Financial model missing</div>
                  <div className="text-gray-500 text-xs mt-1">Financials help investors evaluate seriousness.</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="border border-lime-500/40 rounded-lg p-4">
                <h3 className="font-semibold text-lime-300 mb-3">Opportunity Summary</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Startup:</span> {selected.startup_name || 'Protected'}</div>
                  <div><span className="text-gray-500">Investor:</span> {selected.firm || 'Protected'}</div>
                  <div><span className="text-gray-500">Sector:</span> {selected.sector || selected.focus_sectors || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Stage:</span> {selected.stage || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Capital:</span> {selected.ask || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Next Best Action:</span> {selected.next_best_action || selected.next_action || 'Awaiting next event'}</div>
                </div>
              </div>

              <div className="border border-blue-500/40 rounded-lg p-4">
                <h3 className="font-semibold text-blue-300 mb-3">Opportunity Journey</h3>

                <div className="space-y-2 text-sm">

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-lime-400"></span>
                    Interested
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["payment_complete","investor_notified","waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Payment Complete
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["investor_notified","waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Investor Notified
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Waiting Response
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Meeting
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Due Diligence
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      selected.status==="funded"
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Funded
                  </div>

                </div>
              </div>

              <div className="border border-lime-500/40 rounded-lg p-4">
                <h3 className="font-semibold text-lime-300 mb-3">Timeline</h3>

                {isTimelineLoading ? (
                  <p className="text-sm text-gray-400">Loading timeline...</p>
                ) : Array.isArray(selectedTimeline) && selectedTimeline.length > 0 ? (
                  <div className="space-y-4 text-sm max-h-72 overflow-y-auto pr-2">
                    {selectedTimeline.map((t: any, index: number) => (
                      <div key={t.id || index} className="flex gap-3">
                        <span className="h-3 w-3 rounded-full bg-lime-400 mt-1 shrink-0"></span>
                        <div>
                          <div className="font-semibold">{t.title || t.event_type}</div>
                          <div className="text-gray-500">{t.description || 'Timeline event recorded.'}</div>
                          <div className="text-[11px] text-gray-600 mt-1">
                            {t.created_at ? new Date(t.created_at).toLocaleString() : ''}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3 text-sm">
                    <div className="flex gap-3">
                      <span className="h-3 w-3 rounded-full border border-yellow-400 mt-1"></span>
                      <div>
                        <div className="font-semibold">No timeline events yet</div>
                        <div className="text-gray-500">New opportunities will automatically create timeline history.</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 border border-lime-500/40 rounded-lg p-4">
              <h3 className="font-semibold text-lime-300 mb-2">Chief of Staff Recommendation</h3>
              <p className="text-sm text-gray-300">
                Complete payment/reveal, queue investor notification, then monitor response SLA. Escalate if no response is received within the defined window.
              </p>
            </div>

            <div className="mt-5 border border-blue-500/40 rounded-lg p-4">
              <h3 className="font-semibold text-blue-300 mb-3">Why this Investment Confidence?</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">AI Match × 30%</span>
                  <span className="text-lime-300">{selected.match_score || 0} → {Math.round((Number(selected.match_score || 0) * 0.30) * 10) / 10}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Founder Trust × 25%</span>
                  <span className="text-blue-300">{selected.founder_trust_score ?? 50} → {Math.round((Number(selected.founder_trust_score ?? 50) * 0.25) * 10) / 10}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Investor Trust × 25%</span>
                  <span className="text-blue-300">{selected.investor_trust_score ?? 50} → {Math.round((Number(selected.investor_trust_score ?? 50) * 0.25) * 10) / 10}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Opportunity Health × 20%</span>
                  <span className="text-lime-300">{selected.health_score ?? 0} → {Math.round((Number(selected.health_score ?? 0) * 0.20) * 10) / 10}</span>
                </div>

                <div className="border-t border-blue-500/30 pt-3 mt-3 flex justify-between">
                  <span className="font-semibold text-white">Final Confidence</span>
                  <span className="font-bold text-lime-300">{selected.investment_confidence ?? 0}%</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Risk</span>
                  <span className="font-semibold text-yellow-300">{selected.investment_risk || 'Medium'}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Investment Confidence combines AI Match, Trust and Opportunity Health. This is an explainable score, not a black box.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
