import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { getDealFlow, updateDealFlowStatus, getOpportunityTimeline, getChiefOfStaffBrief, getOpportunityNotes, addOpportunityNote } from '@/lib/api';

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

function buildInvestmentMemo(opportunity: any) {
  const status = opportunity?.status || 'interested';

  return [
    `TD Venture Investment Memo Snapshot`,
    ``,
    `Opportunity: ${opportunity?.opportunity_code || 'Opportunity'}`,
    `Startup: ${opportunity?.startup_name || 'Protected Startup'}`,
    `Investor: ${opportunity?.firm || 'Protected Investor'}`,
    `Sector: ${opportunity?.sector || opportunity?.focus_sectors || 'Not disclosed'}`,
    `Stage: ${opportunity?.stage || 'Not disclosed'}`,
    `Capital Ask: ${opportunity?.ask || 'Not disclosed'}`,
    `Current Status: ${stages.find((s) => s.key === status)?.label || status}`,
    ``,
    `Investment Confidence: ${opportunity?.investment_confidence ?? 0}%`,
    `AI Match: ${opportunity?.match_score || 0}%`,
    `Health Score: ${opportunity?.health_score ?? 0}`,
    `Risk: ${opportunity?.investment_risk || 'Medium'}`,
    `Founder Trust: ${opportunity?.founder_trust_score ?? 50}`,
    `Investor Trust: ${opportunity?.investor_trust_score ?? 50}`,
    ``,
    `Next Best Action: ${getWorkspaceAction(opportunity)}`,
    ``,
    `Prepared from TD Venture Investment Operating System.`,
  ].join('\n');
}


function buildFollowUpMessage(opportunity: any) {
  const status = opportunity?.status || 'interested';
  const startup = opportunity?.startup_name || 'the startup';
  const investor = opportunity?.firm || 'the investor';
  const code = opportunity?.opportunity_code || 'this opportunity';
  const nextAction = getWorkspaceAction(opportunity);

  if (status === 'payment_pending' || status === 'interested') {
    return [
      `Hi,`,
      ``,
      `Quick update on ${code}: ${startup} is currently at the ${opportunity?.stage || 'current'} stage in ${opportunity?.sector || opportunity?.focus_sectors || 'the relevant sector'}.`,
      ``,
      `The next step is to complete the payment / reveal process so that the opportunity can move forward in the TD Venture deal workflow.`,
      ``,
      `Next action: ${nextAction}`,
      ``,
      `Regards,`,
      `TD Venture Deal Desk`,
    ].join('\n');
  }

  if (status === 'investor_notified' || status === 'waiting_response') {
    return [
      `Hi,`,
      ``,
      `Following up on ${code} between ${startup} and ${investor}.`,
      ``,
      `The opportunity has an Investment Confidence of ${opportunity?.investment_confidence ?? 0}% and is currently awaiting response / next movement.`,
      ``,
      `Next action: ${nextAction}`,
      ``,
      `Regards,`,
      `TD Venture Deal Desk`,
    ].join('\n');
  }

  if (status === 'accepted' || status === 'meeting_scheduled') {
    return [
      `Hi,`,
      ``,
      `This is a quick coordination note for ${code}.`,
      ``,
      `${startup} and ${investor} are ready for the next meeting / diligence step. Please confirm availability and any documents required before the call.`,
      ``,
      `Next action: ${nextAction}`,
      ``,
      `Regards,`,
      `TD Venture Deal Desk`,
    ].join('\n');
  }

  if (status === 'due_diligence') {
    return [
      `Hi,`,
      ``,
      `${code} is now in due diligence.`,
      ``,
      `Please share the required documents, including pitch deck, financial model, traction proof, cap table and any investor memo inputs.`,
      ``,
      `Next action: ${nextAction}`,
      ``,
      `Regards,`,
      `TD Venture Deal Desk`,
    ].join('\n');
  }

  return [
    `Hi,`,
    ``,
    `Quick update on ${code}: ${startup} is currently marked as ${stages.find((s) => s.key === status)?.label || status}.`,
    ``,
    `Next action: ${nextAction}`,
    ``,
    `Regards,`,
    `TD Venture Deal Desk`,
  ].join('\n');
}


function buildFounderFollowUpPack(opportunity: any) {
  const code = opportunity?.opportunity_code || 'this opportunity';
  const startup = opportunity?.startup_name || 'the startup';
  const investor = opportunity?.firm || 'the investor';
  const founder = opportunity?.founder_name || 'Founder';
  const nextAction = getWorkspaceAction(opportunity);
  const confidence = opportunity?.investment_confidence ?? 0;

  return [
    `Hi ${founder},`,
    '',
    `Quick update on ${code}: ${startup} is now active in the TD Venture opportunity workspace with ${investor}.`,
    '',
    `Current signal strength: ${confidence}% investment confidence.`,
    `Current stage: ${opportunity?.stage || 'Not disclosed'}.`,
    `Capital ask: ${opportunity?.ask || 'Not disclosed'}.`,
    '',
    `Deal Desk next step: ${nextAction}`,
    '',
    'Please keep your pitch deck, financial model, traction proof, cap table and company profile ready so we can move quickly when the investor side responds.',
    '',
    'Regards,',
    'TD Venture Deal Desk',
  ].join('\n');
}

function buildInvestorFollowUpPack(opportunity: any) {
  const code = opportunity?.opportunity_code || 'this opportunity';
  const startup = opportunity?.startup_name || 'the startup';
  const investor = opportunity?.firm || 'Investor';
  const nextAction = getWorkspaceAction(opportunity);
  const confidence = opportunity?.investment_confidence ?? 0;
  const matchScore = opportunity?.match_score || 0;

  return [
    `Hi ${investor} Team,`,
    '',
    `Sharing a quick TD Venture Deal Desk update for ${code}.`,
    '',
    `Startup: ${startup}`,
    `Sector: ${opportunity?.sector || opportunity?.focus_sectors || 'Not disclosed'}`,
    `Stage: ${opportunity?.stage || 'Not disclosed'}`,
    `Capital ask: ${opportunity?.ask || 'Not disclosed'}`,
    `AI match score: ${matchScore}%`,
    `Investment confidence: ${confidence}%`,
    `Risk view: ${opportunity?.investment_risk || 'Medium'}`,
    '',
    `Suggested next step: ${nextAction}`,
    '',
    'If this remains relevant to your mandate, we can move the opportunity forward through the TD Venture workflow.',
    '',
    'Regards,',
    'TD Venture Deal Desk',
  ].join('\n');
}

function buildInternalDealDeskPack(opportunity: any) {
  const code = opportunity?.opportunity_code || 'this opportunity';
  const startup = opportunity?.startup_name || 'Protected Startup';
  const investor = opportunity?.firm || 'Protected Investor';
  const priority = getPriority(opportunity);
  const nextAction = getWorkspaceAction(opportunity);

  return [
    `Workspace 2.9 Follow-up Pack`,
    '',
    `Opportunity: ${code}`,
    `Startup: ${startup}`,
    `Investor: ${investor}`,
    `Priority: ${priority}`,
    `Status: ${opportunity?.status || 'interested'}`,
    `Investment confidence: ${opportunity?.investment_confidence ?? 0}%`,
    `Health score: ${opportunity?.health_score ?? 0}`,
    `Founder trust: ${opportunity?.founder_trust_score ?? 50}`,
    `Investor trust: ${opportunity?.investor_trust_score ?? 50}`,
    '',
    `Internal next action: ${nextAction}`,
    '',
    'Deal Desk instruction:',
    '- Send founder-side update if founder is waiting.',
    '- Send investor-side update if investor response is pending.',
    '- Add a note after every communication.',
    '- Move status only after the next real workflow event.',
  ].join('\n');
}


function getICReadinessItems(opportunity: any, notes: any[] = []) {
  const confidence = Number(opportunity?.investment_confidence || 0);
  const matchScore = Number(opportunity?.match_score || 0);
  const founderTrust = Number(opportunity?.founder_trust_score ?? 50);
  const investorTrust = Number(opportunity?.investor_trust_score ?? 50);

  return [
    {
      label: 'Startup profile identified',
      ready: Boolean(opportunity?.startup_name),
      detail: opportunity?.startup_name || 'Startup name not available',
    },
    {
      label: 'Sector and stage available',
      ready: Boolean(opportunity?.sector || opportunity?.focus_sectors) && Boolean(opportunity?.stage),
      detail: `${opportunity?.sector || opportunity?.focus_sectors || 'Sector missing'} · ${opportunity?.stage || 'Stage missing'}`,
    },
    {
      label: 'Capital ask visible',
      ready: Boolean(opportunity?.ask),
      detail: opportunity?.ask || 'Capital ask not available',
    },
    {
      label: 'AI match quality acceptable',
      ready: matchScore >= 70,
      detail: `${matchScore || 0}% AI match score`,
    },
    {
      label: 'Investment confidence calculated',
      ready: confidence >= 70,
      detail: `${confidence || 0}% confidence · ${opportunity?.investment_risk || 'Medium'} risk`,
    },
    {
      label: 'Trust signals acceptable',
      ready: founderTrust >= 50 && investorTrust >= 50,
      detail: `Founder ${founderTrust} · Investor ${investorTrust}`,
    },
    {
      label: 'Internal note captured',
      ready: Array.isArray(notes) && notes.length > 0,
      detail: Array.isArray(notes) && notes.length > 0 ? `${notes.length} internal note(s)` : 'No deal desk note yet',
    },
    {
      label: 'Next action clear',
      ready: Boolean(getWorkspaceAction(opportunity)),
      detail: getWorkspaceAction(opportunity),
    },
  ];
}

function getICReadinessScore(opportunity: any, notes: any[] = []) {
  const items = getICReadinessItems(opportunity, notes);
  const ready = items.filter((item) => item.ready).length;
  return Math.round((ready / items.length) * 100);
}

function buildICReviewNote(opportunity: any, notes: any[] = []) {
  const status = opportunity?.status || 'interested';
  const readinessScore = getICReadinessScore(opportunity, notes);
  const readinessItems = getICReadinessItems(opportunity, notes);
  const missingItems = readinessItems.filter((item) => !item.ready).map((item) => item.label);
  const recentNotes = Array.isArray(notes) ? notes.slice(0, 3) : [];

  const recommendation =
    readinessScore >= 80
      ? 'Proceed to IC preparation.'
      : readinessScore >= 60
      ? 'Proceed after closing the missing readiness items.'
      : 'Do not take to IC yet. Strengthen profile, diligence inputs and deal notes first.';

  return [
    `TD Venture IC Review Note`,
    ``,
    `Opportunity: ${opportunity?.opportunity_code || 'Opportunity'}`,
    `Startup: ${opportunity?.startup_name || 'Protected Startup'}`,
    `Investor: ${opportunity?.firm || 'Protected Investor'}`,
    `Sector: ${opportunity?.sector || opportunity?.focus_sectors || 'Not disclosed'}`,
    `Stage: ${opportunity?.stage || 'Not disclosed'}`,
    `Capital Ask: ${opportunity?.ask || 'Not disclosed'}`,
    `Current Stage: ${stages.find((s) => s.key === status)?.label || status}`,
    ``,
    `Investment View`,
    `- Investment Confidence: ${opportunity?.investment_confidence ?? 0}%`,
    `- AI Match Score: ${opportunity?.match_score || 0}%`,
    `- Health Score: ${opportunity?.health_score ?? 0}`,
    `- Risk: ${opportunity?.investment_risk || 'Medium'}`,
    `- Founder Trust: ${opportunity?.founder_trust_score ?? 50}`,
    `- Investor Trust: ${opportunity?.investor_trust_score ?? 50}`,
    ``,
    `IC Readiness`,
    `- Readiness Score: ${readinessScore}%`,
    `- Missing Items: ${missingItems.length ? missingItems.join(', ') : 'None'}`,
    ``,
    `Deal Desk Notes`,
    ...(recentNotes.length
      ? recentNotes.map((n: any) => `- ${String(n.note || '').replace(/\s+/g, ' ').trim()}`)
      : ['- No internal notes captured yet.']),
    ``,
    `Recommended Next Action`,
    `- ${getWorkspaceAction(opportunity)}`,
    ``,
    `IC Recommendation`,
    `- ${recommendation}`,
    ``,
    `Prepared from TD Venture Investment Operating System.`,
  ].join('\n');
}

function buildDecisionActionNote(opportunity: any, action: string, notes: any[] = []) {
  const code = opportunity?.opportunity_code || 'this opportunity';
  const startup = opportunity?.startup_name || 'the startup';
  const investor = opportunity?.firm || 'the investor';
  const readiness = getICReadinessScore(opportunity, notes);
  const nextAction = getWorkspaceAction(opportunity);

  if (action === 'followup_founder') {
    return [
      `Decision Action Logged: Follow up with founder`,
      ``,
      `Opportunity: ${code}`,
      `Startup: ${startup}`,
      `Investor: ${investor}`,
      ``,
      `Deal Desk should follow up with the founder on the current opportunity status and confirm next required movement.`,
      `Suggested next action: ${nextAction}`,
      ``,
      `Logged from TD Venture IOS Quick Actions.`,
    ].join('\n');
  }

  if (action === 'request_documents') {
    return [
      `Decision Action Logged: Request missing documents`,
      ``,
      `Opportunity: ${code}`,
      `Startup: ${startup}`,
      `Investor: ${investor}`,
      ``,
      `Deal Desk should request missing diligence materials from the founder.`,
      `Suggested documents: pitch deck, financial model, traction proof, cap table, company profile and investor memo inputs.`,
      `Suggested next action: ${nextAction}`,
      ``,
      `Logged from TD Venture IOS Quick Actions.`,
    ].join('\n');
  }

  if (action === 'prepare_ic') {
    return [
      `Decision Action Logged: Prepare IC review note`,
      ``,
      `Opportunity: ${code}`,
      `Startup: ${startup}`,
      `Investor: ${investor}`,
      ``,
      `Deal Desk should prepare this opportunity for IC review.`,
      `Current IC readiness: ${readiness}%`,
      `Investment confidence: ${opportunity?.investment_confidence ?? 0}%`,
      `Risk: ${opportunity?.investment_risk || 'Medium'}`,
      `Suggested next action: ${nextAction}`,
      ``,
      `Logged from TD Venture IOS Quick Actions.`,
    ].join('\n');
  }

  return `Decision Action Logged for ${code}: ${nextAction}`;
}


function clampOperatingScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(Number(value) || 0)));
}

function getOpportunityStatusSignal(status: string) {
  const normalized = status || 'interested';

  if (normalized === 'funded') return 100;
  if (normalized === 'due_diligence') return 86;
  if (normalized === 'meeting_scheduled') return 78;
  if (normalized === 'accepted') return 72;
  if (normalized === 'response_received') return 68;
  if (normalized === 'notified') return 62;
  if (normalized === 'payment_complete') return 58;
  if (normalized === 'interested') return 52;
  if (normalized === 'payment_pending') return 45;
  if (normalized === 'rejected') return 20;

  return 55;
}

function getOpportunityOperatingScore(opportunity: any, notes: any[] = []) {
  const confidence = Number(opportunity?.investment_confidence || 0);
  const health = Number(opportunity?.health_score || 0);
  const founderTrust = Number(opportunity?.founder_trust_score ?? 50);
  const investorTrust = Number(opportunity?.investor_trust_score ?? 50);
  const icReadiness = getICReadinessScore(opportunity, notes);
  const notesSignal = Array.isArray(notes) && notes.length > 0 ? 100 : 35;
  const statusSignal = getOpportunityStatusSignal(opportunity?.status || 'interested');

  return clampOperatingScore(
    confidence * 0.24 +
      health * 0.18 +
      founderTrust * 0.14 +
      investorTrust * 0.14 +
      icReadiness * 0.18 +
      notesSignal * 0.06 +
      statusSignal * 0.06
  );
}

function getOpportunityOperatingGrade(score: number) {
  if (score >= 85) return 'Ready to accelerate';
  if (score >= 70) return 'Healthy opportunity';
  if (score >= 55) return 'Needs movement';
  if (score >= 40) return 'At risk';
  return 'Dormant / weak signal';
}

function getOpportunityOperatingBreakdown(opportunity: any, notes: any[] = []) {
  const confidence = Number(opportunity?.investment_confidence || 0);
  const health = Number(opportunity?.health_score || 0);
  const founderTrust = Number(opportunity?.founder_trust_score ?? 50);
  const investorTrust = Number(opportunity?.investor_trust_score ?? 50);
  const icReadiness = getICReadinessScore(opportunity, notes);
  const notesSignal = Array.isArray(notes) && notes.length > 0 ? 100 : 35;
  const statusSignal = getOpportunityStatusSignal(opportunity?.status || 'interested');

  return [
    {
      label: 'Investment Confidence',
      value: confidence,
      weight: '24%',
      ready: confidence >= 70,
      detail: 'AI confidence from match, trust and deal signals.',
    },
    {
      label: 'Health Score',
      value: health,
      weight: '18%',
      ready: health >= 70,
      detail: 'Operational health of the current opportunity.',
    },
    {
      label: 'Founder Trust',
      value: founderTrust,
      weight: '14%',
      ready: founderTrust >= 60,
      detail: 'Founder-side profile and credibility signal.',
    },
    {
      label: 'Investor Trust',
      value: investorTrust,
      weight: '14%',
      ready: investorTrust >= 60,
      detail: 'Investor-side quality and fit signal.',
    },
    {
      label: 'IC Readiness',
      value: icReadiness,
      weight: '18%',
      ready: icReadiness >= 70,
      detail: 'Readiness to move into investment review.',
    },
    {
      label: 'Deal Notes',
      value: notesSignal,
      weight: '6%',
      ready: notesSignal >= 80,
      detail: Array.isArray(notes) && notes.length > 0 ? `${notes.length} internal note(s) present.` : 'No internal deal notes yet.',
    },
    {
      label: 'Workflow Status',
      value: statusSignal,
      weight: '6%',
      ready: statusSignal >= 60,
      detail: `Current status: ${opportunity?.status || 'interested'}.`,
    },
  ];
}

function buildOperatingScoreNote(opportunity: any, notes: any[] = []) {
  const score = getOpportunityOperatingScore(opportunity, notes);
  const grade = getOpportunityOperatingGrade(score);
  const breakdown = getOpportunityOperatingBreakdown(opportunity, notes);
  const code = opportunity?.opportunity_code || 'Opportunity';

  return [
    'Workspace 3.0 Operating Score',
    '',
    `Opportunity: ${code}`,
    `Startup: ${opportunity?.startup_name || 'Protected Startup'}`,
    `Investor: ${opportunity?.firm || 'Protected Investor'}`,
    `Operating Score: ${score}/100`,
    `Grade: ${grade}`,
    `Priority: ${getPriority(opportunity)}`,
    `Next Best Action: ${getWorkspaceAction(opportunity)}`,
    '',
    'Score Breakdown:',
    ...breakdown.map((item) => `- ${item.label}: ${item.value}/100 · Weight ${item.weight} · ${item.ready ? 'OK' : 'Needs attention'}`),
    '',
    'Chief-of-Staff Instruction:',
    score >= 85
      ? '- Accelerate this opportunity. Prepare meeting / diligence / IC motion.'
      : score >= 70
      ? '- Keep momentum. Close any missing readiness items and monitor next action.'
      : score >= 55
      ? '- Move this manually. Add notes, clarify status and push the next workflow step.'
      : '- Treat as weak or stalled. Review whether this opportunity deserves continued attention.',
  ].join('\n');
}


function getFounderBrief(opportunity: any) {
  const confidence = Number(opportunity?.investment_confidence || 0);
  const founderTrust = Number(opportunity?.founder_trust_score ?? 50);
  const docs = getDocumentReadiness(opportunity);
  const readyDocs = docs.filter((doc) => doc.ready).length;

  let positioning = 'Qualify founder readiness before investor escalation.';
  if (confidence >= 80 && founderTrust >= 70) {
    positioning = 'Strong founder-side signal. Suitable for investor-facing movement.';
  } else if (confidence >= 65) {
    positioning = 'Promising founder-side profile. Strengthen documents before IC.';
  }

  return {
    startup: opportunity?.startup_name || 'Protected Startup',
    sector: opportunity?.sector || opportunity?.focus_sectors || 'Not disclosed',
    stage: opportunity?.stage || 'Not disclosed',
    ask: opportunity?.ask || 'Not disclosed',
    trust: founderTrust,
    docsReady: `${readyDocs}/${docs.length}`,
    positioning,
  };
}

function getInvestorBrief(opportunity: any) {
  const investorTrust = Number(opportunity?.investor_trust_score ?? 50);
  const matchScore = Number(opportunity?.match_score || 0);
  const confidence = Number(opportunity?.investment_confidence || 0);

  let positioning = 'Use a cautious intro and validate investor interest.';
  if (matchScore >= 85 && confidence >= 80) {
    positioning = 'Lead with strategic fit, readiness and clear next step.';
  } else if (matchScore >= 70) {
    positioning = 'Position around sector fit and founder preparedness.';
  }

  return {
    firm: opportunity?.firm || 'Protected Investor',
    focus: opportunity?.focus_sectors || opportunity?.sector || 'Not disclosed',
    city: opportunity?.investor_city || 'Location not disclosed',
    trust: investorTrust,
    matchScore,
    positioning,
  };
}

export default function OpportunitiesPage() {
  const [selected, setSelected] = useState<any | null>(null);
  const [noteText, setNoteText] = useState('');
  const [copiedAction, setCopiedAction] = useState<string | null>(null);

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['opportunities'],
    queryFn: getDealFlow,
  });

  const { data: selectedTimeline = [], isLoading: isTimelineLoading } = useQuery({
    queryKey: ['opportunityTimeline', selected?.id],
    queryFn: () => getOpportunityTimeline(selected.id),
    enabled: Boolean(selected?.id),
  });

  const {
    data: selectedNotes = [],
    isLoading: isNotesLoading,
    refetch: refetchNotes,
  } = useQuery({
    queryKey: ['opportunityNotes', selected?.id],
    queryFn: () => getOpportunityNotes(selected.id),
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

  const addNote = useMutation({
    mutationFn: ({ id, note }: { id: string; note: string }) => addOpportunityNote(id, note),
    onSuccess: () => {
      setNoteText('');
      refetchNotes();
    },
  });

  const opportunities = Array.isArray(data) ? data : [];

  const stats = useMemo(() => {
    return stages.map((stage) => ({
      ...stage,
      count: opportunities.filter((o: any) => (o.status || 'interested') === stage.key).length,
    }));
  }, [opportunities]);

  const actionQueue = useMemo(() => {
    const sorted = [...opportunities].sort((a: any, b: any) => {
      const aConfidence = Number(a?.investment_confidence || 0);
      const bConfidence = Number(b?.investment_confidence || 0);
      const aHealth = Number(a?.health_score || 0);
      const bHealth = Number(b?.health_score || 0);
      return bConfidence + bHealth - (aConfidence + aHealth);
    });

    const needsDocuments = sorted.filter((o: any) =>
      getDocumentReadiness(o).some((doc) => !doc.ready)
    );

    const needsFollowup = sorted.filter((o: any) =>
      ['interested', 'payment_pending', 'payment_complete', 'investor_notified', 'waiting_response'].includes(o.status || 'interested')
    );

    const readyForIC = sorted.filter((o: any) => {
      const confidence = Number(o?.investment_confidence || 0);
      const docsReady = getDocumentReadiness(o).filter((doc) => doc.ready).length;
      const status = o.status || 'interested';

      return (
        confidence >= 75 &&
        docsReady >= 3 &&
        ['accepted', 'meeting_scheduled', 'due_diligence', 'funded', 'interested'].includes(status)
      );
    });

    const highPriority = sorted.filter((o: any) => getPriority(o) === 'High');

    return {
      readyForIC: readyForIC.slice(0, 4),
      needsDocuments: needsDocuments.slice(0, 4),
      needsFollowup: needsFollowup.slice(0, 4),
      highPriority: highPriority.slice(0, 4),
    };
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

      {opportunities.length > 0 && (
        <div className="mb-6 rounded-xl border border-cyan-500/40 bg-black/75 p-5 shadow-[0_0_30px_rgba(34,211,238,0.08)]">
          <div className="mb-4 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="text-xs uppercase tracking-[0.35em] text-cyan-300">
                Workspace 2.7
              </div>
              <h2 className="mt-1 text-xl font-semibold">Deal Desk Action Queue</h2>
              <p className="mt-1 text-sm text-gray-500">
                Prioritised operating queue for IC readiness, documents, follow-ups and high-priority opportunities.
              </p>
            </div>
            <div className="text-xs text-gray-500">
              Click any item to open its workspace.
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              {
                title: 'Ready for IC',
                count: actionQueue.readyForIC.length,
                items: actionQueue.readyForIC,
                border: 'border-purple-500/40',
                text: 'text-purple-300',
                empty: 'No IC-ready deals yet',
              },
              {
                title: 'Needs Documents',
                count: actionQueue.needsDocuments.length,
                items: actionQueue.needsDocuments,
                border: 'border-yellow-500/40',
                text: 'text-yellow-300',
                empty: 'No document gaps',
              },
              {
                title: 'Needs Follow-up',
                count: actionQueue.needsFollowup.length,
                items: actionQueue.needsFollowup,
                border: 'border-lime-500/40',
                text: 'text-lime-300',
                empty: 'No follow-ups due',
              },
              {
                title: 'High Priority',
                count: actionQueue.highPriority.length,
                items: actionQueue.highPriority,
                border: 'border-blue-500/40',
                text: 'text-blue-300',
                empty: 'No high-priority deals',
              },
            ].map((bucket: any) => (
              <div key={bucket.title} className={`rounded-lg border ${bucket.border} bg-black/50 p-4`}>
                <div className="mb-3 flex items-center justify-between">
                  <div className={`text-sm font-semibold ${bucket.text}`}>{bucket.title}</div>
                  <div className={`rounded-full border ${bucket.border} px-2 py-0.5 text-xs ${bucket.text}`}>
                    {bucket.count}
                  </div>
                </div>

                <div className="space-y-2">
                  {bucket.items.length > 0 ? (
                    bucket.items.map((o: any) => (
                      <button
                        key={`${bucket.title}-${o.id}`}
                        type="button"
                        onClick={() => setSelected(o)}
                        className="w-full rounded-md border border-white/10 bg-white/[0.03] p-3 text-left transition hover:border-lime-500/40 hover:bg-lime-500/10 active:scale-[0.99]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium text-white">
                              {o.startup_name || 'Protected Startup'}
                            </div>
                            <div className="mt-1 text-xs text-gray-500">
                              {o.opportunity_code || 'Opportunity'} · {o.stage || 'Stage N/A'}
                            </div>
                          </div>
                          <div className={`text-xs font-semibold ${bucket.text}`}>
                            {o.investment_confidence ?? 0}%
                          </div>
                        </div>
                        <div className="mt-2 line-clamp-2 text-xs text-gray-500">
                          {getWorkspaceAction(o)}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-md border border-dashed border-white/10 p-3 text-xs text-gray-600">
                      {bucket.empty}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 bg-black/85 p-4 overflow-y-auto">
          <div className="mx-auto my-4 w-full max-w-5xl border border-lime-500/70 bg-black rounded-xl p-6 shadow-[0_0_35px_rgba(163,255,18,0.25)]">
            <div className="sticky top-0 z-20 -mx-6 -mt-6 mb-5 flex justify-between items-start border-b border-lime-500/30 bg-black/95 px-6 py-4 backdrop-blur">
              <div>
                <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
                  Opportunity Workspace
                </div>
                <h2 className="text-2xl font-semibold">
                  {selected.opportunity_code || 'Opportunity'}
                </h2>
              </div>
              <button
                className="rounded-md border border-lime-500/50 bg-black px-4 py-2 text-sm font-semibold text-lime-300 hover:bg-lime-400 hover:text-black transition"
                onClick={() => setSelected(null)}
              >
                ← Back to Matches
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
                    <button
                      type="button"
                      disabled={addNote.isPending}
                      className={
                        copiedAction === 'action-founder'
                          ? 'rounded-md bg-lime-400 px-3 py-2 text-left font-semibold text-black transition'
                          : 'rounded-md border border-lime-500/50 px-3 py-2 text-left text-lime-300 transition hover:bg-lime-500/20 hover:text-white active:scale-[0.99] disabled:opacity-50'
                      }
                      onClick={() => {
                        addNote.mutate(
                          {
                            id: selected.id,
                            note: buildDecisionActionNote(selected, 'followup_founder', selectedNotes),
                          },
                          {
                            onSuccess: () => {
                              setCopiedAction('action-founder');
                              window.setTimeout(() => setCopiedAction(null), 1500);
                            },
                          }
                        );
                      }}
                    >
                      {copiedAction === 'action-founder' ? 'Action logged ✓' : 'Follow up with founder'}
                    </button>

                    <button
                      type="button"
                      disabled={addNote.isPending}
                      className={
                        copiedAction === 'action-docs'
                          ? 'rounded-md bg-yellow-400 px-3 py-2 text-left font-semibold text-black transition'
                          : 'rounded-md border border-yellow-500/50 px-3 py-2 text-left text-yellow-300 transition hover:bg-yellow-500/20 hover:text-white active:scale-[0.99] disabled:opacity-50'
                      }
                      onClick={() => {
                        addNote.mutate(
                          {
                            id: selected.id,
                            note: buildDecisionActionNote(selected, 'request_documents', selectedNotes),
                          },
                          {
                            onSuccess: () => {
                              setCopiedAction('action-docs');
                              window.setTimeout(() => setCopiedAction(null), 1500);
                            },
                          }
                        );
                      }}
                    >
                      {copiedAction === 'action-docs' ? 'Action logged ✓' : 'Request missing documents'}
                    </button>

                    <button
                      type="button"
                      disabled={addNote.isPending}
                      className={
                        copiedAction === 'action-ic'
                          ? 'rounded-md bg-blue-400 px-3 py-2 text-left font-semibold text-black transition'
                          : 'rounded-md border border-blue-500/50 px-3 py-2 text-left text-blue-300 transition hover:bg-blue-500/20 hover:text-white active:scale-[0.99] disabled:opacity-50'
                      }
                      onClick={() => {
                        addNote.mutate(
                          {
                            id: selected.id,
                            note: buildDecisionActionNote(selected, 'prepare_ic', selectedNotes),
                          },
                          {
                            onSuccess: () => {
                              setCopiedAction('action-ic');
                              window.setTimeout(() => setCopiedAction(null), 1500);
                            },
                          }
                        );
                      }}
                    >
                      {copiedAction === 'action-ic' ? 'Action logged ✓' : 'Prepare IC review note'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {(() => {
              const founderBrief = getFounderBrief(selected);
              const investorBrief = getInvestorBrief(selected);

              return (
                <div className="mb-5 border border-emerald-500/40 rounded-lg p-4 bg-black/40">
                  <div className="mb-4">
                    <h3 className="font-semibold text-emerald-300">Founder / Investor Brief Cards</h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Two-sided operating view before follow-up, IC preparation or investor communication.
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg border border-emerald-500/30 bg-black/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.25em] text-emerald-300">Founder Brief</div>
                          <div className="mt-1 text-lg font-semibold text-white">{founderBrief.startup}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-emerald-300">{founderBrief.trust}</div>
                          <div className="text-xs text-gray-500">Trust</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Sector</div>
                          <div className="text-gray-200">{founderBrief.sector}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Stage</div>
                          <div className="text-gray-200">{founderBrief.stage}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Capital Ask</div>
                          <div className="text-gray-200">{founderBrief.ask}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Docs Ready</div>
                          <div className="text-gray-200">{founderBrief.docsReady}</div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs text-gray-400">
                        {founderBrief.positioning}
                      </div>
                    </div>

                    <div className="rounded-lg border border-sky-500/30 bg-black/50 p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="text-xs uppercase tracking-[0.25em] text-sky-300">Investor Brief</div>
                          <div className="mt-1 text-lg font-semibold text-white">{investorBrief.firm}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-sky-300">{investorBrief.matchScore}%</div>
                          <div className="text-xs text-gray-500">Match</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <div className="text-xs text-gray-500">Focus</div>
                          <div className="text-gray-200">{investorBrief.focus}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Location</div>
                          <div className="text-gray-200">{investorBrief.city}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Investor Trust</div>
                          <div className="text-gray-200">{investorBrief.trust}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500">Risk</div>
                          <div className="text-gray-200">{selected.investment_risk || 'Medium'}</div>
                        </div>
                      </div>

                      <div className="mt-4 rounded-md border border-sky-500/20 bg-sky-500/5 p-3 text-xs text-gray-400">
                        {investorBrief.positioning}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            <div className="mb-5 border border-purple-500/40 rounded-lg p-4 bg-black/40">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-purple-300">Investment Memo Snapshot</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    One-click summary for IC discussion, investor follow-up, or founder update.
                  </p>
                </div>
                <button
                  type="button"
                  className={
                    copiedAction === 'memo'
                      ? 'rounded-md bg-purple-400 px-3 py-2 text-sm font-semibold text-black transition'
                      : 'rounded-md border border-purple-500/50 px-3 py-2 text-sm text-purple-300 transition hover:bg-purple-500/20 hover:text-white active:scale-95'
                  }
                  onClick={() => {
                    navigator.clipboard?.writeText(buildInvestmentMemo(selected));
                    setCopiedAction('memo');
                    window.setTimeout(() => setCopiedAction(null), 1500);
                  }}
                >
                  {copiedAction === 'memo' ? 'Copied ✓' : 'Copy memo'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div><span className="text-gray-500">Startup:</span> {selected.startup_name || 'Protected Startup'}</div>
                  <div><span className="text-gray-500">Investor:</span> {selected.firm || 'Protected Investor'}</div>
                  <div><span className="text-gray-500">Sector:</span> {selected.sector || selected.focus_sectors || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Stage:</span> {selected.stage || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Capital Ask:</span> {selected.ask || 'Not disclosed'}</div>
                </div>

                <div className="space-y-2">
                  <div><span className="text-gray-500">Confidence:</span> <span className="text-lime-300 font-semibold">{selected.investment_confidence ?? 0}%</span></div>
                  <div><span className="text-gray-500">Risk:</span> <span className="text-yellow-300 font-semibold">{selected.investment_risk || 'Medium'}</span></div>
                  <div><span className="text-gray-500">Health:</span> <span className="text-lime-300 font-semibold">{selected.health_score ?? 0}</span></div>
                  <div><span className="text-gray-500">Priority:</span> <span className="text-blue-300 font-semibold">{getPriority(selected)}</span></div>
                  <div><span className="text-gray-500">Next:</span> {getWorkspaceAction(selected)}</div>
                </div>
              </div>
            </div>

            {(() => {
              const icItems = getICReadinessItems(selected, selectedNotes);
              const icScore = getICReadinessScore(selected, selectedNotes);

              return (
                <div className="mb-5 border border-purple-500/40 rounded-lg p-4 bg-black/40">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <h3 className="font-semibold text-purple-300">IC Readiness Checklist</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Deal desk readiness view before taking this opportunity to investment review.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-purple-300">{icScore}%</div>
                      <div className="text-xs text-gray-500">IC readiness</div>
                    </div>
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {icItems.map((item: any) => (
                      <div
                        key={item.label}
                        className="rounded-md border border-purple-500/20 bg-black/50 p-3"
                      >
                        <div className="flex items-start gap-2">
                          <div className={item.ready ? 'text-lime-300' : 'text-yellow-300'}>
                            {item.ready ? '✓' : '!'}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-200">{item.label}</div>
                            <div className="text-xs text-gray-500 mt-1">{item.detail}</div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-md border border-purple-500/20 bg-purple-500/5 p-3 text-xs text-gray-400">
                    {icScore >= 80
                      ? 'Recommendation: Ready for IC preparation.'
                      : icScore >= 60
                      ? 'Recommendation: Almost ready. Close the missing items before IC.'
                      : 'Recommendation: Not ready for IC. Strengthen profile, notes and diligence inputs first.'}
                  </div>
                </div>
              );
            })()}

            <div className="mb-5 border border-cyan-500/40 rounded-lg p-4 bg-black/40">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                <div>
                  <h3 className="font-semibold text-cyan-300">IC Review Note Generator</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Copy a structured IC note using confidence, readiness, trust signals and internal notes.
                  </p>
                </div>
                <button
                  type="button"
                  className={
                    copiedAction === 'ic'
                      ? 'rounded-md bg-cyan-400 px-3 py-2 text-sm font-semibold text-black transition'
                      : 'rounded-md border border-cyan-500/50 px-3 py-2 text-sm text-cyan-300 transition hover:bg-cyan-500/20 hover:text-white active:scale-95'
                  }
                  onClick={() => {
                    navigator.clipboard?.writeText(buildICReviewNote(selected, selectedNotes));
                    setCopiedAction('ic');
                    window.setTimeout(() => setCopiedAction(null), 1500);
                  }}
                >
                  {copiedAction === 'ic' ? 'Copied ✓' : 'Copy IC note'}
                </button>
              </div>

              <div className="rounded-md border border-cyan-500/20 bg-black/50 p-3 text-sm text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto">
                {buildICReviewNote(selected, selectedNotes)}
              </div>
            </div>

            {(() => {
              const founderFollowUp = buildFounderFollowUpPack(selected);
              const investorFollowUp = buildInvestorFollowUpPack(selected);
              const internalPack = buildInternalDealDeskPack(selected);

              const packs = [
                {
                  key: 'founder-pack',
                  title: 'Founder Follow-up',
                  tone: 'text-emerald-300',
                  border: 'border-emerald-500/30',
                  body: founderFollowUp,
                },
                {
                  key: 'investor-pack',
                  title: 'Investor Follow-up',
                  tone: 'text-sky-300',
                  border: 'border-sky-500/30',
                  body: investorFollowUp,
                },
                {
                  key: 'internal-pack',
                  title: 'Internal Deal Desk Action',
                  tone: 'text-yellow-300',
                  border: 'border-yellow-500/30',
                  body: internalPack,
                },
              ];

              return (
                <div className="mb-5 border border-yellow-500/40 rounded-lg p-4 bg-black/40">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-yellow-300">Workspace 2.9</div>
                      <h3 className="mt-1 font-semibold text-yellow-300">Follow-up Pack</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Founder message, investor message and internal Deal Desk action generated from the current opportunity state.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={addNote.isPending}
                      className={
                        copiedAction === 'log-followup-pack'
                          ? 'rounded-md bg-yellow-400 px-3 py-2 text-sm font-semibold text-black transition'
                          : 'rounded-md border border-yellow-500/50 px-3 py-2 text-sm text-yellow-300 transition hover:bg-yellow-500/20 hover:text-white active:scale-95 disabled:opacity-50'
                      }
                      onClick={() => {
                        addNote.mutate({
                          id: selected.id,
                          note: [founderFollowUp, investorFollowUp, internalPack].join('\n\n---\n\n'),
                        });
                        setCopiedAction('log-followup-pack');
                        window.setTimeout(() => setCopiedAction(null), 1500);
                      }}
                    >
                      {copiedAction === 'log-followup-pack' ? 'Logged ✓' : 'Log pack to notes'}
                    </button>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-3">
                    {packs.map((pack) => (
                      <div key={pack.key} className={`rounded-lg border ${pack.border} bg-black/55 p-4`}>
                        <div className="mb-3 flex items-start justify-between gap-3">
                          <div>
                            <div className={`text-sm font-semibold ${pack.tone}`}>{pack.title}</div>
                            <div className="mt-1 text-[11px] text-gray-600">
                              {selected.opportunity_code || 'Opportunity'} · {selected.status || 'interested'}
                            </div>
                          </div>

                          <button
                            type="button"
                            className={
                              copiedAction === pack.key
                                ? 'rounded-md bg-yellow-400 px-2 py-1 text-xs font-semibold text-black transition'
                                : 'rounded-md border border-yellow-500/40 px-2 py-1 text-xs text-yellow-300 transition hover:bg-yellow-500/20 hover:text-white active:scale-95'
                            }
                            onClick={() => {
                              navigator.clipboard?.writeText(pack.body);
                              setCopiedAction(pack.key);
                              window.setTimeout(() => setCopiedAction(null), 1500);
                            }}
                          >
                            {copiedAction === pack.key ? 'Copied ✓' : 'Copy'}
                          </button>
                        </div>

                        <div className="rounded-md border border-white/10 bg-black/60 p-3 text-xs text-gray-300 whitespace-pre-wrap max-h-72 overflow-y-auto">
                          {pack.body}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3 text-xs text-gray-400">
                    Use this pack before moving status. It gives the founder-side message, investor-side message and internal Deal Desk instruction in one place.
                  </div>
                </div>
              );
            })()}

            <div className="mb-5 border border-lime-500/40 rounded-lg p-4 bg-black/40">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3 mb-4">
                <div>
                  <h3 className="font-semibold text-lime-300">Internal Deal Notes</h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Private deal desk memory for follow-ups, judgement calls and IC preparation.
                  </p>
                </div>
                <div className="text-xs text-gray-500">
                  {Array.isArray(selectedNotes) ? selectedNotes.length : 0} notes
                </div>
              </div>

              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add an internal note for this opportunity..."
                className="w-full min-h-[90px] rounded-md border border-lime-500/30 bg-black/60 p-3 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-lime-400"
              />

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={!noteText.trim() || addNote.isPending}
                  className="rounded-md bg-lime-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50"
                  onClick={() => addNote.mutate({ id: selected.id, note: noteText.trim() })}
                >
                  {addNote.isPending ? 'Saving...' : 'Add Note'}
                </button>
              </div>

              <div className="mt-4 space-y-3 max-h-64 overflow-y-auto pr-2">
                {isNotesLoading ? (
                  <p className="text-sm text-gray-500">Loading notes...</p>
                ) : Array.isArray(selectedNotes) && selectedNotes.length > 0 ? (
                  selectedNotes.map((n: any) => (
                    <div key={n.id} className="rounded-md border border-lime-500/20 bg-black/50 p-3 text-sm">
                      <div className="whitespace-pre-wrap text-gray-200">{n.note}</div>
                      <div className="mt-2 text-[11px] text-gray-600">
                        {n.created_by_email || 'Deal Desk'} · {n.created_at ? new Date(n.created_at).toLocaleString() : ''}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-md border border-dashed border-lime-500/20 p-3 text-sm text-gray-500">
                    No internal notes yet. Add the first deal desk note.
                  </div>
                )}
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
