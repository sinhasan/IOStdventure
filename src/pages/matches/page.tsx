import { DueDiligenceWorkroom } from '@/components/DueDiligenceWorkroom';
import { InvestmentDecisionControls } from '@/components/InvestmentDecisionControls';
import { MeetingLifecycleControls } from '@/components/MeetingLifecycleControls';
import { Gate0InvestorDocuments } from '@/components/Gate0InvestorDocuments';
import { Gate0ConversionLaunch } from '@/components/Gate0ConversionLaunch';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getDealFlow,
  updateDealFlowStatus,
  getOpportunityTimeline,
  getChiefOfStaffBrief,
  getDealDeskBrief,
  getOpportunityNotes,
  addOpportunityNote,
  getCurrentUser,
  getMeetingCoordination,
  updateGate0Requirement,
  scheduleOpportunityMeeting,
  sendInvestorInvitation,
} from '@/lib/api';

const stages = [
  { key: 'interested', label: 'Opportunity Started' },
  { key: 'investor_notified', label: 'Outreach Initiated' },
  { key: 'waiting_response', label: 'Awaiting Response' },
  { key: 'accepted', label: 'Meeting Requested' },
  { key: 'meeting_scheduled', label: 'Meeting Scheduled' },
  { key: 'due_diligence', label: 'Due Diligence' },
  { key: 'funded', label: 'Funded' },
];

const workspaceTabs = [
  { key: 'overview', label: 'Overview' },
  { key: 'scores', label: 'Scores & Risk' },
  { key: 'followup', label: 'Follow-up' },
  { key: 'ic', label: 'IC & Notes' },
  { key: 'timeline', label: 'Timeline' },
];

function evidenceScore(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function scoreLabel(value: unknown, suffix = '') {
  const score = evidenceScore(value);
  return score === null ? 'Awaiting' : `${score}${suffix}`;
}


function gate0RequirementLabel(key: string) {
  const labels: Record<string, string> = {
    pitch_deck: 'Pitch Deck',
    business_plan: 'Business Plan',
    revenue_evidence: 'Revenue Evidence',
    three_year_projections: '3-Year Projections',
  };

  return labels[key] || key;
}

function gate0StatusLabel(status: string) {
  if (status === 'verified') return 'Verified';
  if (status === 'provided') return 'Provided';
  return 'Awaiting';
}

function nextStage(current: string) {
  const index = stages.findIndex((s) => s.key === current);
  if (index < 0 || index >= stages.length - 1) return null;
  return stages[index + 1];
}

function healthColor(status: string) {
  if (status === 'delivery_issue') return 'text-red-300 border-red-400/70';
  if (status === 'funded') return 'text-lime-300 border-lime-400/70';
  if (['accepted', 'meeting_scheduled', 'due_diligence'].includes(status)) return 'text-blue-300 border-blue-400/70';
  if (['waiting_response', 'investor_notified'].includes(status)) return 'text-yellow-300 border-yellow-400/70';
  return 'text-orange-300 border-orange-400/70';
}

function getPriority(opportunity: any) {
  const confidence = evidenceScore(opportunity?.opportunity_score);
  const health = evidenceScore(opportunity?.health_score);
  const status = opportunity?.status || 'interested';

  if (status === 'delivery_issue') return 'High';
  if (['payment_pending', 'waiting_response'].includes(status)) return 'High';
  if (confidence !== null && health !== null && confidence >= 75 && health >= 70) return 'High';
  if ((confidence !== null && confidence >= 55) || (health !== null && health >= 50)) return 'Medium';
  return 'Watch';
}

function getWorkspaceAction(opportunity: any) {
  const status = opportunity?.status || 'interested';

  if (status === 'interested') return opportunity?.direction === 'investor_to_startup' ? 'TD Venture to contact the founder and confirm interest in the introduction.' : 'TD Venture to contact the investor through a protected Opportunity invitation.';
  if (status === 'payment_pending') return 'Complete qualification and prepare protected outreach.';
  if (status === 'payment_complete') return 'Initiate protected outreach from Deal Desk.';
  if (status === 'investor_notified') return "Monitor the contacted party's response and prepare follow-up.";
  if (status === 'delivery_issue') return opportunity?.next_best_action || opportunity?.next_action || 'Verify the recipient email or communication route before any further outreach.';
  if (status === 'waiting_response') return 'Follow up with the contacted party if the response window is breached.';
  if (status === 'accepted') return 'Coordinate the first founder-investor meeting.';
  if (status === 'meeting_scheduled') return 'Prepare meeting brief and diligence questions.';
  if (status === 'due_diligence') return 'Collect documents and prepare IC recommendation.';
  if (status === 'funded') return 'Record the final outcome and move to portfolio tracking.';

  return opportunity?.next_best_action || opportunity?.next_action || 'Review opportunity and decide next step.';
}

function getDocumentReadiness(opportunity: any) {
  const readiness = opportunity?.document_readiness || {};

  return [
    {
      label: 'Pitch deck',
      ready: readiness?.pitch_deck?.status === 'ready',
    },
    {
      label: 'Financial model',
      ready: readiness?.financial_model?.status === 'ready',
    },
    {
      label: 'Founder profile',
      ready: readiness?.founder_profile?.status === 'ready',
    },
    {
      label: 'Investor memo',
      ready: readiness?.investor_memo?.status === 'ready',
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
    `Opportunity Qualification: ${scoreLabel(opportunity?.opportunity_score, '%')}`,
    `Match Fit: ${scoreLabel(opportunity?.match_score, '%')}`,
    `Health Score: ${scoreLabel(opportunity?.health_score)}`,
    `Risk: ${opportunity?.investment_risk || 'Awaiting'}`,
    `Founder Trust: ${scoreLabel(opportunity?.founder_trust_score)}`,
    `Investor Trust: ${scoreLabel(opportunity?.investor_trust_score)}`,
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

  if (status === 'delivery_issue') {
    return [
      `Delivery issue for ${code}.`,
      ``,
      `Do not send another follow-up until the recipient email or communication route has been verified.`,
      ``,
      `Next action: ${nextAction}`,
      ``,
      `TD Venture Deal Desk`,
    ].join('\n');
  }

  if (status === 'payment_pending' || status === 'interested') {
    return [
      `Hi,`,
      ``,
      `Quick update on ${code}: ${startup} is currently at the ${opportunity?.stage || 'current'} stage in ${opportunity?.sector || opportunity?.focus_sectors || 'the relevant sector'}.`,
      ``,
      `TD Venture is coordinating the next outreach step. Contact details remain protected until engagement and a TD Venture-coordinated introduction.`,
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
      `The opportunity qualification is ${scoreLabel(opportunity?.opportunity_score, '%')} and is currently awaiting response / next movement.`,
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
  const qualification = scoreLabel(opportunity?.opportunity_score, '%');

  return [
    `Hi ${founder},`,
    '',
    `Quick update on ${code}: ${startup} is now active in the TD Venture opportunity workspace with ${investor}.`,
    '',
    `Current evidence-backed qualification: ${qualification}.`,
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
  const qualification = scoreLabel(opportunity?.opportunity_score, '%');
  const matchScore = scoreLabel(opportunity?.match_score, '%');

  return [
    `Hi ${investor} Team,`,
    '',
    `Sharing a quick TD Venture Deal Desk update for ${code}.`,
    '',
    `Startup: ${startup}`,
    `Sector: ${opportunity?.sector || opportunity?.focus_sectors || 'Not disclosed'}`,
    `Stage: ${opportunity?.stage || 'Not disclosed'}`,
    `Capital ask: ${opportunity?.ask || 'Not disclosed'}`,
    `Match Fit: ${matchScore}`,
    `Opportunity qualification: ${qualification}`,
    `Risk view: ${opportunity?.investment_risk || 'Awaiting evidence'}`,
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
    `Opportunity qualification: ${scoreLabel(opportunity?.opportunity_score, '%')}`,
    `Health score: ${scoreLabel(opportunity?.health_score)}`,
    `Founder trust: ${scoreLabel(opportunity?.founder_trust_score)}`,
    `Investor trust: ${scoreLabel(opportunity?.investor_trust_score)}`,
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
  const qualification = evidenceScore(opportunity?.opportunity_score);
  const matchScore = evidenceScore(opportunity?.match_score);
  const founderTrust = evidenceScore(opportunity?.founder_trust_score);
  const investorTrust = evidenceScore(opportunity?.investor_trust_score);

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
      label: 'Match Fit is strong',
      ready: matchScore !== null && matchScore >= 70,
      detail: matchScore === null ? 'Awaiting Match Fit evidence' : `${matchScore}% Match Fit`,
    },
    {
      label: 'Opportunity qualification calculated',
      ready: qualification !== null && qualification >= 50,
      detail: qualification === null
        ? 'Awaiting Conversion and AI evidence'
        : `${qualification}% qualification · ${opportunity?.investment_risk || 'Awaiting'} risk`,
    },
    {
      label: 'Trust signals acceptable',
      ready:
        founderTrust !== null &&
        investorTrust !== null &&
        founderTrust >= 50 &&
        investorTrust >= 50,
      detail: `Founder ${scoreLabel(founderTrust)} · Investor ${scoreLabel(investorTrust)}`,
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
    `- Opportunity Qualification: ${scoreLabel(opportunity?.opportunity_score, '%')}`,
    `- Match Fit: ${scoreLabel(opportunity?.match_score, '%')}`,
    `- Health Score: ${scoreLabel(opportunity?.health_score)}`,
    `- Risk: ${opportunity?.investment_risk || 'Awaiting'}`,
    `- Founder Trust: ${scoreLabel(opportunity?.founder_trust_score)}`,
    `- Investor Trust: ${scoreLabel(opportunity?.investor_trust_score)}`,
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
      `Opportunity qualification: ${scoreLabel(opportunity?.opportunity_score, '%')}`,
      `Risk: ${opportunity?.investment_risk || 'Awaiting'}`,
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
  const qualification = evidenceScore(opportunity?.opportunity_score);
  const health = evidenceScore(opportunity?.health_score);
  const founderTrust = evidenceScore(opportunity?.founder_trust_score);
  const investorTrust = evidenceScore(opportunity?.investor_trust_score);
  if (
    qualification === null ||
    health === null ||
    founderTrust === null ||
    investorTrust === null
  ) return null;
  const icReadiness = getICReadinessScore(opportunity, notes);
  const notesSignal = Array.isArray(notes) && notes.length > 0 ? 100 : 0;
  const statusSignal = getOpportunityStatusSignal(opportunity?.status || 'interested');

  return clampOperatingScore(
    qualification * 0.24 +
      health * 0.18 +
      founderTrust * 0.14 +
      investorTrust * 0.14 +
      icReadiness * 0.18 +
      notesSignal * 0.06 +
      statusSignal * 0.06
  );
}

function getOpportunityOperatingGrade(score: number | null) {
  if (score === null) return 'Awaiting evidence';
  if (score >= 85) return 'Ready to accelerate';
  if (score >= 70) return 'Healthy opportunity';
  if (score >= 55) return 'Needs movement';
  if (score >= 40) return 'At risk';
  return 'Dormant / weak signal';
}

function getOpportunityOperatingBreakdown(opportunity: any, notes: any[] = []) {
  const qualification = evidenceScore(opportunity?.opportunity_score);
  const health = evidenceScore(opportunity?.health_score);
  const founderTrust = evidenceScore(opportunity?.founder_trust_score);
  const investorTrust = evidenceScore(opportunity?.investor_trust_score);
  const icReadiness = getICReadinessScore(opportunity, notes);
  const notesSignal = Array.isArray(notes) && notes.length > 0 ? 100 : 0;
  const statusSignal = getOpportunityStatusSignal(opportunity?.status || 'interested');

  return [
    {
      label: 'Opportunity Qualification',
      value: qualification,
      weight: '24%',
      ready: qualification !== null && qualification >= 50,
      detail: 'Agreed Match, Conversion and AI evidence qualification.',
    },
    {
      label: 'Health Score',
      value: health,
      weight: '18%',
      ready: health !== null && health >= 70,
      detail: 'Operational health of the current opportunity.',
    },
    {
      label: 'Founder Trust',
      value: founderTrust,
      weight: '14%',
      ready: founderTrust !== null && founderTrust >= 60,
      detail: 'Founder-side profile and credibility signal.',
    },
    {
      label: 'Investor Trust',
      value: investorTrust,
      weight: '14%',
      ready: investorTrust !== null && investorTrust >= 60,
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
    `Operating Score: ${score === null ? 'Awaiting evidence' : `${score}/100`}`,
    `Grade: ${grade}`,
    `Priority: ${getPriority(opportunity)}`,
    `Next Best Action: ${getWorkspaceAction(opportunity)}`,
    '',
    'Score Breakdown:',
    ...breakdown.map((item) => `- ${item.label}: ${scoreLabel(item.value, '/100')} · Weight ${item.weight} · ${item.ready ? 'OK' : 'Needs attention'}`),
    '',
    'Chief-of-Staff Instruction:',
    score === null
      ? '- Await the missing evidence. Do not infer an operating score.'
      : score >= 85
      ? '- Accelerate this opportunity. Prepare meeting / diligence / IC motion.'
      : score >= 70
      ? '- Keep momentum. Close any missing readiness items and monitor next action.'
      : score >= 55
      ? '- Move this manually. Add notes, clarify status and push the next workflow step.'
      : '- Treat as weak or stalled. Review whether this opportunity deserves continued attention.',
  ].join('\n');
}



function getOpportunityRiskRadar(opportunity: any, notes: any[] = []) {
  const risks: any[] = [];
  const qualification = evidenceScore(opportunity?.opportunity_score);
  const health = evidenceScore(opportunity?.health_score);
  const founderTrust = evidenceScore(opportunity?.founder_trust_score);
  const investorTrust = evidenceScore(opportunity?.investor_trust_score);
  const icReadiness = getICReadinessScore(opportunity, notes);
  const status = opportunity?.status || 'interested';
  const docs = getDocumentReadiness(opportunity);

  if (qualification !== null && qualification < 30) {
    risks.push({
      label: 'Low Opportunity Qualification',
      severity: 'High',
      detail: `${qualification}% qualification. This opportunity remains Match Only.`,
      action: 'Review fit before spending more Deal Desk time.',
    });
  } else if (qualification !== null && qualification < 50) {
    risks.push({
      label: 'Developing Opportunity Qualification',
      severity: 'Medium',
      detail: `${qualification}% qualification. The opportunity is developing but has not reached TD Qualification.`,
      action: 'Strengthen evidence and confirm investor mandate fit.',
    });
  }

  if (health !== null && health < 50) {
    risks.push({
      label: 'Weak Opportunity Health',
      severity: 'High',
      detail: `Health score is ${health}. Workflow may be stalled or incomplete.`,
      action: 'Add a note, clarify status and force the next movement.',
    });
  } else if (health !== null && health < 70) {
    risks.push({
      label: 'Opportunity Needs Movement',
      severity: 'Medium',
      detail: `Health score is ${health}. Opportunity is alive but needs operational push.`,
      action: 'Use Follow-up Pack and log the next action.',
    });
  }

  if (founderTrust !== null && founderTrust < 50) {
    risks.push({
      label: 'Founder Trust Gap',
      severity: 'High',
      detail: `Founder trust is ${founderTrust}. The founder-side profile may not be strong enough.`,
      action: 'Request better profile, pitch deck, traction proof and founder background.',
    });
  } else if (founderTrust !== null && founderTrust < 65) {
    risks.push({
      label: 'Founder Trust Can Improve',
      severity: 'Medium',
      detail: `Founder trust is ${founderTrust}. More credibility signals can improve confidence.`,
      action: 'Use Founder Trust Coach before investor push.',
    });
  }

  if (investorTrust !== null && investorTrust < 50) {
    risks.push({
      label: 'Investor Trust Gap',
      severity: 'High',
      detail: `Investor trust is ${investorTrust}. Investor-side quality or fit needs review.`,
      action: 'Check investor mandate, sector fit and engagement quality.',
    });
  } else if (investorTrust !== null && investorTrust < 65) {
    risks.push({
      label: 'Investor Fit Needs Review',
      severity: 'Medium',
      detail: `Investor trust is ${investorTrust}. Fit is acceptable but not strong.`,
      action: 'Confirm sector, stage and cheque-size alignment.',
    });
  }

  if (icReadiness < 60) {
    risks.push({
      label: 'Not IC Ready',
      severity: 'High',
      detail: `IC readiness is ${icReadiness}%. Missing materials or notes may block review.`,
      action: 'Close checklist gaps before IC preparation.',
    });
  } else if (icReadiness < 80) {
    risks.push({
      label: 'IC Readiness Gap',
      severity: 'Medium',
      detail: `IC readiness is ${icReadiness}%. Almost there, but not fully prepared.`,
      action: 'Complete missing checklist items and add Deal Desk notes.',
    });
  }

  if (!Array.isArray(notes) || notes.length === 0) {
    risks.push({
      label: 'No Internal Deal Notes',
      severity: 'Medium',
      detail: 'There is no internal memory for this opportunity yet.',
      action: 'Add one note before changing status or sending follow-up.',
    });
  }

  if (!opportunity?.ask) {
    risks.push({
      label: 'Capital Ask Missing',
      severity: 'Medium',
      detail: 'The funding ask is not available in the opportunity view.',
      action: 'Request or update capital ask before serious investor follow-up.',
    });
  }

  if (status === 'payment_pending') {
    risks.push({
      label: 'Qualification Required',
      severity: 'High',
      detail: 'The workflow is blocked before notification or response.',
      action: 'Complete qualification and prepare protected outreach.',
    });
  }

  if (['interested', 'notified', 'response_received'].includes(status) && health !== null && health < 75) {
    risks.push({
      label: 'Workflow Stall Risk',
      severity: 'Medium',
      detail: `Current status is ${status}. Opportunity may lose momentum without action.`,
      action: getWorkspaceAction(opportunity),
    });
  }

  const missingDocs = docs.filter((d: any) => !d.ready);
  if (missingDocs.length > 0) {
    risks.push({
      label: 'Document Readiness Gap',
      severity: missingDocs.length >= 2 ? 'High' : 'Medium',
      detail: `${missingDocs.length} document readiness item(s) need attention.`,
      action: missingDocs.map((d: any) => d.label).join(', '),
    });
  }

  if (risks.length === 0) {
    risks.push({
      label: 'No Major Risk Detected',
      severity: 'Low',
      detail: 'No evidence-backed risk threshold has been triggered.',
      action: 'Keep gathering evidence and prepare the next workflow step.',
    });
  }

  const severityOrder: any = { High: 0, Medium: 1, Low: 2 };
  return risks.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

function getRiskRadarSummary(risks: any[] = []) {
  const high = risks.filter((r) => r.severity === 'High').length;
  const medium = risks.filter((r) => r.severity === 'Medium').length;

  if (high > 0) return `${high} high-risk item(s) need attention`;
  if (medium > 0) return `${medium} medium-risk item(s) need movement`;
  return 'No major risk detected';
}

function buildRiskRadarNote(opportunity: any, notes: any[] = []) {
  const risks = getOpportunityRiskRadar(opportunity, notes);
  const code = opportunity?.opportunity_code || 'Opportunity';

  return [
    'Workspace 3.1 Risk Radar',
    '',
    `Opportunity: ${code}`,
    `Startup: ${opportunity?.startup_name || 'Protected Startup'}`,
    `Investor: ${opportunity?.firm || 'Protected Investor'}`,
    `Risk Summary: ${getRiskRadarSummary(risks)}`,
    '',
    'Risk Items:',
    ...risks.map((risk) => `- [${risk.severity}] ${risk.label}: ${risk.detail} Action: ${risk.action}`),
    '',
    `Recommended Next Action: ${getWorkspaceAction(opportunity)}`,
  ].join('\n');
}


function getFounderBrief(opportunity: any) {
  const qualification = evidenceScore(opportunity?.opportunity_score);
  const founderTrust = evidenceScore(opportunity?.founder_trust_score);
  const docs = getDocumentReadiness(opportunity);
  const readyDocs = docs.filter((doc) => doc.ready).length;

  let positioning = 'Qualify founder readiness before investor escalation.';
  if (qualification !== null && founderTrust !== null && qualification >= 80 && founderTrust >= 70) {
    positioning = 'Strong founder-side signal. Suitable for investor-facing movement.';
  } else if (qualification !== null && qualification >= 50) {
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
  const investorTrust = evidenceScore(opportunity?.investor_trust_score);
  const matchScore = evidenceScore(opportunity?.match_score);
  const qualification = evidenceScore(opportunity?.opportunity_score);

  let positioning = 'Use a cautious intro and validate investor interest.';
  if (matchScore !== null && matchScore >= 85 && qualification !== null && qualification >= 80) {
    positioning = 'Lead with strategic fit, readiness and clear next step.';
  } else if (matchScore !== null && matchScore >= 70) {
    positioning = 'Position around sector fit and founder preparedness.';
  }

  return {
    firm: opportunity?.firm || 'Protected Investor',
    focus: opportunity?.investor_sector || opportunity?.focus_sectors || 'Not disclosed',
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
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState('overview');
  const [gate0Notes, setGate0Notes] = useState<Record<string, string>>({});
  const [meetingActionError, setMeetingActionError] = useState('');
  const [scheduleForm, setScheduleForm] = useState({
    start: '',
    end: '',
    timezone:
      Intl.DateTimeFormat().resolvedOptions().timeZone === 'Asia/Calcutta'
        ? 'Asia/Kolkata'
        : Intl.DateTimeFormat().resolvedOptions().timeZone
      || 'Asia/Kolkata',
    mode: 'video' as 'video' | 'phone' | 'in_person',
    url: '',
    location: '',
    notes: '',
  });

  const [
    investorInviteMessage,
    setInvestorInviteMessage,
  ] = useState('');

  const { data = [], isLoading, refetch } = useQuery({
    queryKey: ['opportunities'],
    queryFn: getDealFlow,
  });

  const {
    data: selectedTimeline = [],
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useQuery({
    queryKey: ['opportunityTimeline', selected?.id],
    queryFn: () => getOpportunityTimeline(selected.id),
    enabled: Boolean(selected?.id),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
    retry: false,
  });

  const {
    data: meetingCoordination,
    isLoading: isMeetingCoordinationLoading,
    refetch: refetchMeetingCoordination,
  } = useQuery({
    queryKey: ['meetingCoordination', selected?.id],
    queryFn: () => getMeetingCoordination(selected.id),
    enabled: Boolean(selected?.id),
    retry: false,
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

  const followupDueRows = Array.isArray(
    chiefBrief?.followup_due_opportunities
  )
    ? chiefBrief.followup_due_opportunities
    : [];

  const selectedFollowupDue = selected
    ? followupDueRows.find(
        (row: any) =>
          String(row?.opportunity_id) === String(selected.id)
      )
    : null;

  const selectedStartupId = selected?.startup_id
    ? String(selected.startup_id)
    : '';

  const {
    data: conversionBriefResponse,
    isLoading: isConversionBriefLoading,
  } = useQuery({
    queryKey: ['dealDeskBrief', selectedStartupId],
    queryFn: () => getDealDeskBrief(selectedStartupId),
    enabled: Boolean(selectedStartupId),
    retry: false,
  });

  const conversionBrief = conversionBriefResponse?.brief;


  const isAdmin =
    String(currentUser?.role || '').toLowerCase() === 'admin';

  const meetingRecord =
    meetingCoordination?.meeting || null;

  const gate0Rows = Array.isArray(
    meetingCoordination?.gate0
  )
    ? meetingCoordination.gate0
    : [];

  const gate0Summary =
    meetingCoordination?.gate0_summary || {
      total: 0,
      awaiting: 0,
      provided: 0,
      verified: 0,
      ready_to_schedule: false,
    };

  const canSchedule =
    Boolean(
      isAdmin
      && meetingCoordination?.permissions?.can_schedule
    );

  const sendInvestorInvite =
    useMutation({
      mutationFn: (
        opportunityId: string
      ) =>
        sendInvestorInvitation(
          opportunityId
        ),

      onSuccess: async () => {
        setInvestorInviteMessage(
          'Investor invitation sent successfully.'
        );

        await Promise.all([
          refetchTimeline(),
          refetch(),
        ]);
      },

      onError: (error: any) => {
        setInvestorInviteMessage(
          error?.message
          || 'Unable to send investor invitation.'
        );
      },
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


  const updateGate0 = useMutation({
    mutationFn: async ({
      requirementKey,
      status,
    }: {
      requirementKey: string;
      status: 'provided' | 'verified';
    }) => {
      if (!selected?.id) {
        throw new Error('No Opportunity selected.');
      }

      if (status === 'provided') {
        const notes =
          String(
            gate0Notes[requirementKey] || ''
          ).trim();

        if (!notes) {
          throw new Error(
            'Add evidence notes before recording Provided.'
          );
        }

        return updateGate0Requirement(
          String(selected.id),
          requirementKey,
          {
            status,
            evidence_source: 'deal_desk_admin',
            evidence_notes: notes,
          }
        );
      }

      return updateGate0Requirement(
        String(selected.id),
        requirementKey,
        { status }
      );
    },

    onSuccess: async () => {
      setMeetingActionError('');
      await Promise.all([
        refetchMeetingCoordination(),
        refetchTimeline(),
      ]);
    },

    onError: (error: any) => {
      setMeetingActionError(
        error?.message
        || 'Unable to update Gate 0.'
      );
    },
  });

  const scheduleMeeting = useMutation({
    mutationFn: async () => {
      if (!selected?.id) {
        throw new Error('No Opportunity selected.');
      }

      if (!scheduleForm.start || !scheduleForm.end) {
        throw new Error(
          'Meeting start and end time are required.'
        );
      }

      const start = new Date(scheduleForm.start);
      const end = new Date(scheduleForm.end);

      if (
        Number.isNaN(start.getTime())
        || Number.isNaN(end.getTime())
      ) {
        throw new Error(
          'Enter valid meeting start and end times.'
        );
      }

      if (
        scheduleForm.mode === 'video'
        && !scheduleForm.url.trim()
      ) {
        throw new Error(
          'Video meetings require an HTTPS meeting URL.'
        );
      }

      if (
        scheduleForm.mode === 'in_person'
        && !scheduleForm.location.trim()
      ) {
        throw new Error(
          'In-person meetings require a location.'
        );
      }

      return scheduleOpportunityMeeting(
        String(selected.id),
        {
          scheduled_start_at: start.toISOString(),
          scheduled_end_at: end.toISOString(),
          timezone: scheduleForm.timezone,
          meeting_mode: scheduleForm.mode,
          meeting_url:
            scheduleForm.mode === 'video'
              ? scheduleForm.url.trim()
              : null,
          location:
            scheduleForm.mode === 'in_person'
              ? scheduleForm.location.trim()
              : null,
          coordination_notes:
            scheduleForm.notes.trim() || null,
        }
      );
    },

    onSuccess: async (payload: any) => {
      setMeetingActionError('');

      if (payload?.opportunity) {
        setSelected((current: any) =>
          current
            ? {
                ...current,
                ...payload.opportunity,
              }
            : current
        );
      }

      await Promise.all([
        refetchMeetingCoordination(),
        refetchTimeline(),
        refetch(),
      ]);
    },

    onError: (error: any) => {
      setMeetingActionError(
        error?.message
        || 'Unable to schedule the meeting.'
      );
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
      const aQualification = evidenceScore(a?.opportunity_score) ?? -1;
      const bQualification = evidenceScore(b?.opportunity_score) ?? -1;
      return bQualification - aQualification;
    });

    const needsDocuments = sorted.filter((o: any) =>
      getDocumentReadiness(o).some((doc) => !doc.ready)
    );

    const followupDueIds = new Set(
      (chiefBrief?.followup_due_opportunities || []).map(
        (row: any) => String(row?.opportunity_id)
      )
    );

    const needsFollowup = sorted.filter((o: any) =>
      followupDueIds.has(String(o.id))
    );

    const readyForIC = sorted.filter((o: any) => {
      const qualification = evidenceScore(o?.opportunity_score);
      const docsReady = getDocumentReadiness(o).filter((doc) => doc.ready).length;
      const status = o.status || 'interested';

      return (
        qualification !== null &&
        qualification >= 50 &&
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
  }, [opportunities, chiefBrief]);

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/75 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Investment Operating System
        </div>
        <h1 className="text-3xl font-semibold mb-2">Opportunities Workspace</h1>
        <p className="text-sm text-gray-400">
          Manage every active opportunity from start to funding. This is the operating layer above Match Fit and qualification signals.
        </p>
        <div className="mt-4 text-sm text-lime-300">
          Opportunity Started → Outreach Initiated → Awaiting Response → Meeting Requested → Meeting Scheduled → Due Diligence → Funded
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
                            {scoreLabel(o.opportunity_score, '%')}
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
        <div className="rounded-lg border border-dashed border-lime-500/40 bg-black/70 p-8">
          <h2 className="mb-2 text-xl font-semibold">
            No active opportunities yet.
          </h2>

          <p className="max-w-2xl text-sm text-gray-400">
            Review your matching opportunities in Private Marketplace and
            start an engagement. The opportunity will then appear here for
            pipeline, communication and execution.
          </p>

          <a
            href="https://staging.tdventure.vc"
            target="_blank"
            rel="noreferrer"
            className="mt-5 inline-flex rounded-md bg-lime-400 px-4 py-2 text-sm font-bold text-black shadow-[0_0_22px_rgba(163,255,18,0.75)] transition hover:bg-lime-300"
          >
            View Matching Opportunities ↗
          </a>
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
                      <div className="text-xs text-gray-400">Opportunity Qualification</div>
                      <div className="text-xl font-bold text-lime-300">{scoreLabel(o.opportunity_score, '%')}</div>
                      <div className="text-xs text-gray-400 mt-2">Risk</div>
                      <div className="text-sm font-bold text-yellow-300">{o.investment_risk || 'Awaiting'}</div>
                      <div className="text-xs text-gray-400 mt-2">Match Fit</div>
                      <div className="text-sm font-bold text-lime-300">{scoreLabel(o.match_score, '%')}</div>
                      <div className="text-xs text-gray-400 mt-2">Health</div>
                      <div className="text-lg font-bold text-lime-300">{scoreLabel(o.health_score)}</div>
                      <div className="text-xs text-gray-400 mt-2">Trust</div>
                      <div className="text-sm font-bold text-blue-300">F {scoreLabel(o.founder_trust_score)} / I {scoreLabel(o.investor_trust_score)}</div>
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
                    {false && next && (
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
                <p className="mt-1">{chiefBrief?.recommended_first_action || 'Review opportunities and Match Fit signals.'}</p>
              </div>

              <div className="border border-yellow-500/30 rounded-md p-3">
                <div className="text-yellow-300 font-semibold">Outreach Needed</div>
                <p className="mt-1">{chiefBrief?.totals?.outreach_needed ?? 0} opportunities need TD Venture outreach.</p>
              </div>

              <div className="border border-red-500/30 rounded-md p-3">
                <div className="text-red-300 font-semibold">Delivery Issues</div>
                <p className="mt-1">{chiefBrief?.totals?.delivery_issue ?? 0} opportunities need a verified contact route before further outreach.</p>
              </div>

              <div className="border border-blue-500/30 rounded-md p-3">
                <div className="text-blue-300 font-semibold">Awaiting Response</div>
                <p className="mt-1">{chiefBrief?.totals?.waiting_response ?? 0} opportunities are awaiting a response.</p>
              </div>

              <div className="border border-yellow-500/30 rounded-md p-3">
                <div className="text-yellow-300 font-semibold">Follow-up Due</div>
                <p className="mt-1">
                  {chiefBrief?.totals?.followup_due ?? 0} delivered invitations have been unanswered for at least 72 hours.
                </p>

                {followupDueRows.length > 0 && (
                  <div className="mt-2 space-y-1 text-xs text-gray-400">
                    {followupDueRows.slice(0, 3).map((row: any) => (
                      <div
                        key={row.invitation_id}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>{row.opportunity_code || 'Opportunity'}</span>
                        <span>{row.hours_waiting}h</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-lime-500/30 rounded-md p-3">
                <div className="text-lime-300 font-semibold">Confidence</div>
                <p className="mt-1">
                  {typeof chiefBrief?.confidence === "number"
                    ? `${chiefBrief.confidence}% operational confidence based on current workflow signals.`
                    : "Awaiting sufficient workflow evidence."}
                </p>
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
                <div className="text-xs text-gray-400">Opportunity Qualification</div>
                <div className="text-3xl font-bold text-lime-300">{scoreLabel(selected.opportunity_score, '%')}</div>
                <div className="text-xs text-gray-500 mt-1">Risk: {selected.investment_risk || 'Awaiting'}</div>
              </div>
              <div className="border border-lime-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Status</div>
                <div className="text-lg font-semibold text-white">
                  {stages.find((s) => s.key === selected.status)?.label || selected.status || 'Interested'}
                </div>
              </div>
              <div className="border border-lime-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Health</div>
                <div className="text-3xl font-bold text-lime-300">{scoreLabel(selected.health_score)}</div>
              </div>
              <div className="border border-blue-500/40 rounded-lg p-4">
                <div className="text-xs text-gray-400">Trust</div>
                <div className="text-xl font-bold text-blue-300">Founder {scoreLabel(selected.founder_trust_score)}</div>
                <div className="text-xl font-bold text-blue-300">Investor {scoreLabel(selected.investor_trust_score)}</div>
              </div>
            </div>

            <div className="sticky top-[82px] z-10 mb-5 rounded-lg border border-lime-500/40 bg-black/95 p-2 backdrop-blur">
              <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
                {workspaceTabs.map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    className={
                      activeWorkspaceTab === tab.key
                        ? 'rounded-md bg-lime-400 px-3 py-2 text-sm font-semibold text-black transition'
                        : 'rounded-md border border-lime-500/30 px-3 py-2 text-sm text-lime-300 transition hover:bg-lime-500/10 hover:text-white'
                    }
                    onClick={() => setActiveWorkspaceTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className={`${activeWorkspaceTab === 'overview' ? '' : 'hidden'} mb-5 border border-lime-500/40 rounded-lg p-4 bg-black/40`}>
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

            <div className={`${activeWorkspaceTab === 'scores' ? '' : 'hidden'} mb-5 border border-cyan-500/40 rounded-lg p-4 bg-black/40`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="text-xs uppercase tracking-[0.25em] text-cyan-300">Conversion Intelligence</div>
                  <h3 className="mt-1 font-semibold text-cyan-200">Investment Thesis &amp; Risk Matrix</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Central Conversion assessment. Deal Desk consumes this signal; it does not recalculate it.
                  </p>
                </div>

                {conversionBrief && (
                  <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-cyan-500/40 px-3 py-1 text-cyan-200">
                      {conversionBrief.investability || 'Assessment pending'}
                    </span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-gray-300">
                      Risk: {conversionBrief.overall_risk_level || 'Unknown'}
                    </span>
                    <span className="rounded-full border border-white/15 px-3 py-1 text-gray-300">
                      Confidence: {conversionBrief.confidence_level || 'Unknown'}
                    </span>
                  </div>
                )}
              </div>

              {isConversionBriefLoading ? (
                <div className="mt-4 text-sm text-gray-400">Loading current Conversion assessment…</div>
              ) : conversionBrief ? (
                <div className="mt-4 grid gap-4 lg:grid-cols-[220px_1fr]">
                  <div className="rounded-lg border border-cyan-500/25 bg-black/55 p-4">
                    <div className="text-xs text-gray-500">Investability Score</div>
                    <div className="mt-2 text-5xl font-bold text-cyan-200">
                      {conversionBrief.investability_score ?? '—'}
                    </div>
                    <div className="mt-1 text-xs text-gray-500">Out of 100 · Conversion metrics only</div>

                    <div className="mt-5 border-t border-white/10 pt-4">
                      <div className="text-xs text-gray-500">Next Best Action</div>
                      <div className="mt-2 text-sm text-gray-200">
                        {conversionBrief.next_best_action || 'Review the Conversion assessment.'}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {(conversionBrief.risk_matrix || []).map((item: any) => (
                      <div key={item.dimension} className="rounded-lg border border-cyan-500/20 bg-black/55 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="text-sm font-medium text-gray-200">{item.label}</div>
                          <div
                            className={
                              item.risk_level === 'High'
                                ? 'rounded-full border border-red-500/40 px-2 py-1 text-xs text-red-300'
                                : item.risk_level === 'Moderate'
                                ? 'rounded-full border border-yellow-500/40 px-2 py-1 text-xs text-yellow-300'
                                : 'rounded-full border border-lime-500/40 px-2 py-1 text-xs text-lime-300'
                            }
                          >
                            {item.risk_level}
                          </div>
                        </div>
                        <div className="mt-3 text-3xl font-bold text-cyan-100">
                          {item.score ?? '—'}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">Conversion score</div>
                      </div>
                    ))}
                  </div>

                  <div className="lg:col-span-2 rounded-lg border border-cyan-500/20 bg-black/55 p-4">
                    <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">Investment Thesis</div>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-200">
                      {conversionBrief.investment_thesis || 'No investment thesis is available yet.'}
                    </p>

                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                        <div className="text-xs font-semibold text-red-300">Risk Flags</div>
                        <ul className="mt-2 space-y-1 text-xs text-gray-300">
                          {(conversionBrief.risk_flags || []).length > 0
                            ? conversionBrief.risk_flags.map((flag: string) => <li key={flag}>• {flag}</li>)
                            : <li>No material flags recorded.</li>}
                        </ul>
                      </div>

                      <div className="rounded-md border border-yellow-500/20 bg-yellow-500/5 p-3">
                        <div className="text-xs font-semibold text-yellow-300">Missing Evidence</div>
                        <ul className="mt-2 space-y-1 text-xs text-gray-300">
                          {(conversionBrief.missing_evidence || []).length > 0
                            ? conversionBrief.missing_evidence.map((item: any) => (
                              <li key={`${item.item}-${item.priority}`}>
                                • {item.item} ({item.priority})
                              </li>
                            ))
                            : <li>No priority evidence gaps recorded.</li>}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-white/10 bg-black/30 p-4 text-sm text-gray-400">
                  No current Conversion assessment is available for this startup yet.
                </div>
              )}
            </div>

            {(() => {
              const operatingScore = getOpportunityOperatingScore(selected, selectedNotes);
              const operatingGrade = getOpportunityOperatingGrade(operatingScore);
              const operatingBreakdown = getOpportunityOperatingBreakdown(selected, selectedNotes);
              const operatingNote = buildOperatingScoreNote(selected, selectedNotes);

              return (
                <div className={`${activeWorkspaceTab === 'scores' ? '' : 'hidden'} mb-5 border border-orange-500/40 rounded-lg p-4 bg-black/40`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-orange-300">Workspace 3.0</div>
                      <h3 className="mt-1 font-semibold text-orange-300">Opportunity Operating Score</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Calculated only when qualification, health and both trust records are backed by evidence.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={
                          copiedAction === 'operating-score-copy'
                            ? 'rounded-md bg-orange-400 px-3 py-2 text-sm font-semibold text-black transition'
                            : 'rounded-md border border-orange-500/50 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-500/20 hover:text-white active:scale-95'
                        }
                        onClick={() => {
                          navigator.clipboard?.writeText(operatingNote);
                          setCopiedAction('operating-score-copy');
                          window.setTimeout(() => setCopiedAction(null), 1500);
                        }}
                      >
                        {copiedAction === 'operating-score-copy' ? 'Copied ✓' : 'Copy score'}
                      </button>

                      <button
                        type="button"
                        disabled={addNote.isPending}
                        className={
                          copiedAction === 'operating-score-log'
                            ? 'rounded-md bg-orange-400 px-3 py-2 text-sm font-semibold text-black transition'
                            : 'rounded-md border border-orange-500/50 px-3 py-2 text-sm text-orange-300 transition hover:bg-orange-500/20 hover:text-white active:scale-95 disabled:opacity-50'
                        }
                        onClick={() => {
                          addNote.mutate({ id: selected.id, note: operatingNote });
                          setCopiedAction('operating-score-log');
                          window.setTimeout(() => setCopiedAction(null), 1500);
                        }}
                      >
                        {copiedAction === 'operating-score-log' ? 'Logged ✓' : 'Log score'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                    <div className="rounded-lg border border-orange-500/30 bg-black/60 p-4">
                      <div className="text-xs text-gray-500">Operating Score</div>
                      <div
                        className={
                          operatingScore !== null && operatingScore >= 85
                            ? 'mt-2 text-5xl font-bold text-lime-300'
                            : operatingScore !== null && operatingScore >= 70
                            ? 'mt-2 text-5xl font-bold text-emerald-300'
                            : operatingScore !== null && operatingScore >= 55
                            ? 'mt-2 text-5xl font-bold text-yellow-300'
                            : 'mt-2 text-5xl font-bold text-red-300'
                        }
                      >
                        {operatingScore ?? 'Awaiting'}
                      </div>
                      <div className="mt-2 text-sm font-semibold text-orange-200">{operatingGrade}</div>
                      <div className="mt-3 text-xs text-gray-500">
                        Priority: <span className="text-blue-300 font-semibold">{getPriority(selected)}</span>
                      </div>
                      <div className="mt-2 text-xs text-gray-500">
                        Next: <span className="text-gray-300">{getWorkspaceAction(selected)}</span>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {operatingBreakdown.map((item: any) => (
                        <div key={item.label} className="rounded-lg border border-orange-500/20 bg-black/55 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-gray-200">{item.label}</div>
                              <div className="mt-1 text-[11px] text-gray-600">Weight {item.weight}</div>
                            </div>
                            <div className={item.ready ? 'text-lime-300 font-bold' : 'text-yellow-300 font-bold'}>
                              {scoreLabel(item.value)}
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">{item.detail}</div>
                          <div className="mt-2 text-[11px]">
                            {item.ready ? (
                              <span className="text-lime-300">OK</span>
                            ) : (
                              <span className="text-yellow-300">Needs attention</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const riskItems = getOpportunityRiskRadar(selected, selectedNotes);
              const riskSummary = getRiskRadarSummary(riskItems);
              const riskNote = buildRiskRadarNote(selected, selectedNotes);
              const highRiskCount = riskItems.filter((risk: any) => risk.severity === 'High').length;
              const mediumRiskCount = riskItems.filter((risk: any) => risk.severity === 'Medium').length;

              return (
                <div className={`${activeWorkspaceTab === 'scores' ? '' : 'hidden'} mb-5 border border-red-500/40 rounded-lg p-4 bg-black/40`}>
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-red-300">Workspace 3.1</div>
                      <h3 className="mt-1 font-semibold text-red-300">Opportunity Risk Radar</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Detects confidence, trust, notes, readiness, workflow and documentation risks before the opportunity moves forward.
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        className={
                          copiedAction === 'risk-radar-copy'
                            ? 'rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-black transition'
                            : 'rounded-md border border-red-500/50 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20 hover:text-white active:scale-95'
                        }
                        onClick={() => {
                          navigator.clipboard?.writeText(riskNote);
                          setCopiedAction('risk-radar-copy');
                          window.setTimeout(() => setCopiedAction(null), 1500);
                        }}
                      >
                        {copiedAction === 'risk-radar-copy' ? 'Copied ✓' : 'Copy radar'}
                      </button>

                      <button
                        type="button"
                        disabled={addNote.isPending}
                        className={
                          copiedAction === 'risk-radar-log'
                            ? 'rounded-md bg-red-400 px-3 py-2 text-sm font-semibold text-black transition'
                            : 'rounded-md border border-red-500/50 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/20 hover:text-white active:scale-95 disabled:opacity-50'
                        }
                        onClick={() => {
                          addNote.mutate({ id: selected.id, note: riskNote });
                          setCopiedAction('risk-radar-log');
                          window.setTimeout(() => setCopiedAction(null), 1500);
                        }}
                      >
                        {copiedAction === 'risk-radar-log' ? 'Logged ✓' : 'Log radar'}
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
                    <div className="rounded-lg border border-red-500/30 bg-black/60 p-4">
                      <div className="text-xs text-gray-500">Risk Summary</div>
                      <div
                        className={
                          highRiskCount > 0
                            ? 'mt-2 text-3xl font-bold text-red-300'
                            : mediumRiskCount > 0
                            ? 'mt-2 text-3xl font-bold text-yellow-300'
                            : 'mt-2 text-3xl font-bold text-lime-300'
                        }
                      >
                        {highRiskCount > 0 ? 'High Risk' : mediumRiskCount > 0 ? 'Watch' : 'Clear'}
                      </div>
                      <div className="mt-2 text-sm text-gray-300">{riskSummary}</div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      {riskItems.map((risk: any) => (
                        <div key={`${risk.severity}-${risk.label}`} className="rounded-lg border border-red-500/20 bg-black/55 p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-medium text-gray-200">{risk.label}</div>
                              <div className="mt-1 text-xs text-gray-500">{risk.detail}</div>
                            </div>
                            <div
                              className={
                                risk.severity === 'High'
                                  ? 'rounded-full border border-red-500/40 px-2 py-1 text-xs text-red-300'
                                  : risk.severity === 'Medium'
                                  ? 'rounded-full border border-yellow-500/40 px-2 py-1 text-xs text-yellow-300'
                                  : 'rounded-full border border-lime-500/40 px-2 py-1 text-xs text-lime-300'
                              }
                            >
                              {risk.severity}
                            </div>
                          </div>

                          <div className="mt-3 rounded-md border border-white/10 bg-black/50 p-2 text-xs text-gray-400">
                            Action: {risk.action}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()}

            {(() => {
              const founderBrief = getFounderBrief(selected);
              const investorBrief = getInvestorBrief(selected);

              return (
                <div className={`${activeWorkspaceTab === 'overview' ? '' : 'hidden'} mb-5 border border-emerald-500/40 rounded-lg p-4 bg-black/40`}>
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
                          <div className="text-2xl font-bold text-sky-300">{scoreLabel(investorBrief.matchScore, '%')}</div>
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
                          <div className="text-gray-200">{selected.investment_risk || 'Awaiting'}</div>
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

            <div className={`${activeWorkspaceTab === 'ic' ? '' : 'hidden'} mb-5 border border-purple-500/40 rounded-lg p-4 bg-black/40`}>
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
                  <div><span className="text-gray-500">Qualification:</span> <span className="text-lime-300 font-semibold">{scoreLabel(selected.opportunity_score, '%')}</span></div>
                  <div><span className="text-gray-500">Risk:</span> <span className="text-yellow-300 font-semibold">{selected.investment_risk || 'Awaiting'}</span></div>
                  <div><span className="text-gray-500">Health:</span> <span className="text-lime-300 font-semibold">{scoreLabel(selected.health_score)}</span></div>
                  <div><span className="text-gray-500">Priority:</span> <span className="text-blue-300 font-semibold">{getPriority(selected)}</span></div>
                  <div><span className="text-gray-500">Next:</span> {getWorkspaceAction(selected)}</div>
                </div>
              </div>
            </div>

            {(() => {
              const icItems = getICReadinessItems(selected, selectedNotes);
              const icScore = getICReadinessScore(selected, selectedNotes);

              return (
                <div className={`${activeWorkspaceTab === 'ic' ? '' : 'hidden'} mb-5 border border-purple-500/40 rounded-lg p-4 bg-black/40`}>
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

            <div className={`${activeWorkspaceTab === 'ic' ? '' : 'hidden'} mb-5 border border-cyan-500/40 rounded-lg p-4 bg-black/40`}>
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
                <div className={`${activeWorkspaceTab === 'followup' ? '' : 'hidden'} mb-5 border border-yellow-500/40 rounded-lg p-4 bg-black/40`}>
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.25em] text-yellow-300">Workspace 2.9</div>
                      <h3 className="mt-1 font-semibold text-yellow-300">Follow-up Pack</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        Founder message, investor message and internal Deal Desk action generated from the current opportunity state.
                      </p>

                      {selectedFollowupDue && (
                        <div className="mt-3 inline-flex rounded-md border border-yellow-500/40 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
                          Follow-up due now · {selectedFollowupDue.hours_waiting} hours since confirmed delivery
                        </div>
                      )}
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
                              {selected.opportunity_code || 'Opportunity'} · {stages.find((s) => s.key === (selected.status || 'interested'))?.label || selected.status || 'Opportunity Started'}
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

            <div className={`${activeWorkspaceTab === 'ic' ? '' : 'hidden'} mb-5 border border-lime-500/40 rounded-lg p-4 bg-black/40`}>
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

            <div className={`${activeWorkspaceTab === 'ic' ? '' : 'hidden'} mb-5 border border-blue-500/40 rounded-lg p-4 bg-black/40`}>
              <h3 className="font-semibold text-blue-300 mb-3">Founder Trust Coach</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-gray-400">Current Founder Trust</div>
                  <div className="text-3xl font-bold text-blue-300">{scoreLabel(selected.founder_trust_score)}</div>
                </div>

                <div>
                  <div className="text-xs text-gray-400">Trust status</div>
                  <div className="mt-2 text-base font-bold text-gray-400">
                    Awaiting evidence
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
                  <div className="text-gray-300 font-semibold">Email evidence</div>
                  <div className="text-gray-500 text-xs mt-1">Awaiting an evidence-backed trust record.</div>
                </div>

                <div className="border border-lime-500/20 rounded-md p-3">
                  <div className="text-gray-300 font-semibold">Mobile evidence</div>
                  <div className="text-gray-500 text-xs mt-1">Awaiting an evidence-backed trust record.</div>
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

            <div
              className={`${activeWorkspaceTab === 'overview' ? '' : 'hidden'} mb-5 border border-blue-500/40 rounded-lg p-4 bg-black/40`}
            >
              <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-blue-300">
                    Meeting Coordination
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    Gate 0 controls the first founder-investor meeting. Contact details remain protected and TD Venture coordinates the introduction.
                  </p>
                </div>

                <div className="text-xs border border-blue-500/30 rounded-md px-3 py-2 text-blue-200">
                  {meetingRecord
                    ? gate0StatusLabel(
                        meetingRecord.status === 'scheduled'
                          ? 'verified'
                          : meetingRecord.status
                      ) === 'Verified'
                      ? 'Meeting Scheduled'
                      : meetingRecord.status === 'coordinating'
                        ? 'Coordinating'
                        : 'Meeting Requested'
                    : 'No Meeting Request'}
                </div>
              </div>

              <Gate0ConversionLaunch
                opportunityId={selected?.id}
              />

              <Gate0InvestorDocuments
                opportunityId={selected?.id}
              />

              <MeetingLifecycleControls
                opportunityId={selected?.id}
                meeting={meetingRecord}
              />

              <DueDiligenceWorkroom
                opportunityId={selected?.id}
                opportunityStatus={selected?.status}
              />

              <InvestmentDecisionControls
                opportunityId={selected?.id}
                opportunityStatus={selected?.status}
              />

              {isMeetingCoordinationLoading ? (
                <div className="mt-4 text-sm text-gray-500">
                  Loading Meeting Coordination...
                </div>
              ) : (
                <>
                  <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="rounded-md border border-blue-500/20 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        Gate 0
                      </div>
                      <div className="mt-1 text-xl font-bold text-blue-200">
                        {gate0Summary.verified || 0}/4 Verified
                      </div>
                    </div>

                    <div className="rounded-md border border-blue-500/20 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        Scheduling
                      </div>
                      <div className="mt-1 font-semibold">
                        {meetingRecord?.status === 'scheduled'
                          ? 'Scheduled'
                          : gate0Summary.ready_to_schedule
                            ? 'Ready to Schedule'
                            : 'Gate 0 Required'}
                      </div>
                    </div>

                    <div className="rounded-md border border-blue-500/20 p-3">
                      <div className="text-[11px] uppercase tracking-wide text-gray-500">
                        Privacy
                      </div>
                      <div className="mt-1 font-semibold text-lime-300">
                        Protected
                      </div>
                    </div>
                  </div>

                  {meetingRecord?.status === 'scheduled' && (
                    <div className="mt-4 rounded-md border border-lime-500/30 bg-lime-500/5 p-3 text-sm">
                      <div className="font-semibold text-lime-300">
                        First Meeting Scheduled
                      </div>

                      <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2 text-gray-300">
                        <div>
                          <span className="text-gray-500">
                            Start:
                          </span>{' '}
                          {meetingRecord.scheduled_start_at
                            ? new Date(
                                meetingRecord.scheduled_start_at
                              ).toLocaleString()
                            : 'Awaiting'}
                        </div>

                        <div>
                          <span className="text-gray-500">
                            Mode:
                          </span>{' '}
                          {meetingRecord.meeting_mode || 'Awaiting'}
                        </div>

                        <div>
                          <span className="text-gray-500">
                            Timezone:
                          </span>{' '}
                          {meetingRecord.timezone || 'Awaiting'}
                        </div>

                        <div>
                          <span className="text-gray-500">
                            End:
                          </span>{' '}
                          {meetingRecord.scheduled_end_at
                            ? new Date(
                                meetingRecord.scheduled_end_at
                              ).toLocaleString()
                            : 'Awaiting'}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="mt-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
                      Gate 0 Requirements
                    </div>

                    {gate0Rows.length > 0 ? (
                      <div className="space-y-3">
                        {gate0Rows.map((row: any) => {
                          const status =
                            String(row.status || 'awaiting');

                          return (
                            <div
                              key={row.requirement_key}
                              className="rounded-md border border-gray-800 bg-black/30 p-3"
                            >
                              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-gray-200">
                                    {gate0RequirementLabel(
                                      row.requirement_key
                                    )}
                                  </div>

                                  {row.evidence_notes && (
                                    <div className="mt-1 text-xs text-gray-500">
                                      {row.evidence_notes}
                                    </div>
                                  )}
                                </div>

                                <div
                                  className={`text-xs font-semibold rounded-md border px-2 py-1 ${
                                    status === 'verified'
                                      ? 'border-lime-500/40 text-lime-300'
                                      : status === 'provided'
                                        ? 'border-blue-500/40 text-blue-300'
                                        : 'border-yellow-500/40 text-yellow-300'
                                  }`}
                                >
                                  {gate0StatusLabel(status)}
                                </div>
                              </div>

                              {isAdmin
                                && meetingRecord
                                && ['requested', 'coordinating', 'scheduled'].includes(
                                  String(meetingRecord.status)
                                )
                                && status !== 'verified' && (
                                  <div className="mt-3">
                                    {status === 'awaiting' ? (
                                      <>
                                        <textarea
                                          value={
                                            gate0Notes[
                                              row.requirement_key
                                            ] || ''
                                          }
                                          onChange={(event) =>
                                            setGate0Notes(
                                              (current) => ({
                                                ...current,
                                                [row.requirement_key]:
                                                  event.target.value,
                                              })
                                            )
                                          }
                                          placeholder="Evidence notes reviewed by TD Venture..."
                                          className="w-full min-h-[72px] rounded-md border border-blue-500/20 bg-black/60 p-2 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-blue-400"
                                        />

                                        <button
                                          type="button"
                                          disabled={
                                            updateGate0.isPending
                                            || !String(
                                              gate0Notes[
                                                row.requirement_key
                                              ] || ''
                                            ).trim()
                                          }
                                          className="mt-2 rounded-md border border-blue-400/50 px-3 py-1.5 text-xs font-semibold text-blue-200 disabled:opacity-40"
                                          onClick={() =>
                                            updateGate0.mutate({
                                              requirementKey:
                                                row.requirement_key,
                                              status: 'provided',
                                            })
                                          }
                                        >
                                          Record Evidence Provided
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={updateGate0.isPending}
                                        className="rounded-md bg-lime-400 px-3 py-1.5 text-xs font-semibold text-black disabled:opacity-40"
                                        onClick={() =>
                                          updateGate0.mutate({
                                            requirementKey:
                                              row.requirement_key,
                                            status: 'verified',
                                          })
                                        }
                                      >
                                        Verify by TD Venture
                                      </button>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="rounded-md border border-dashed border-blue-500/20 p-3 text-sm text-gray-500">
                        Gate 0 begins when a meeting request is recorded.
                      </div>
                    )}
                  </div>

                  {isAdmin
                    && meetingRecord
                    && ['requested', 'coordinating'].includes(
                      String(meetingRecord.status)
                    ) && (
                      <div className="mt-5 border-t border-gray-800 pt-4">
                        <div className="font-semibold text-blue-300">
                          Schedule First Meeting
                        </div>

                        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <label className="text-xs text-gray-400">
                            Start
                            <input
                              type="datetime-local"
                              value={scheduleForm.start}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    start: event.target.value,
                                  })
                                )
                              }
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            />
                          </label>

                          <label className="text-xs text-gray-400">
                            End
                            <input
                              type="datetime-local"
                              value={scheduleForm.end}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    end: event.target.value,
                                  })
                                )
                              }
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            />
                          </label>

                          <label className="text-xs text-gray-400">
                            Timezone
                            <input
                              type="text"
                              value={scheduleForm.timezone}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    timezone: event.target.value,
                                  })
                                )
                              }
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            />
                          </label>

                          <label className="text-xs text-gray-400">
                            Meeting Mode
                            <select
                              value={scheduleForm.mode}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    mode:
                                      event.target.value as
                                        | 'video'
                                        | 'phone'
                                        | 'in_person',
                                  })
                                )
                              }
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            >
                              <option value="video">
                                Video
                              </option>
                              <option value="phone">
                                Phone
                              </option>
                              <option value="in_person">
                                In Person
                              </option>
                            </select>
                          </label>
                        </div>

                        {scheduleForm.mode === 'video' && (
                          <label className="mt-3 block text-xs text-gray-400">
                            HTTPS Meeting URL
                            <input
                              type="url"
                              value={scheduleForm.url}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    url: event.target.value,
                                  })
                                )
                              }
                              placeholder="https://..."
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            />
                          </label>
                        )}

                        {scheduleForm.mode === 'in_person' && (
                          <label className="mt-3 block text-xs text-gray-400">
                            Meeting Location
                            <input
                              type="text"
                              value={scheduleForm.location}
                              onChange={(event) =>
                                setScheduleForm(
                                  (current) => ({
                                    ...current,
                                    location: event.target.value,
                                  })
                                )
                              }
                              className="mt-1 w-full rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                            />
                          </label>
                        )}

                        <label className="mt-3 block text-xs text-gray-400">
                          Coordination Notes
                          <textarea
                            value={scheduleForm.notes}
                            onChange={(event) =>
                              setScheduleForm(
                                (current) => ({
                                  ...current,
                                  notes: event.target.value,
                                })
                              )
                            }
                            className="mt-1 w-full min-h-[70px] rounded-md border border-blue-500/20 bg-black/60 p-2 text-sm text-white"
                          />
                        </label>

                        <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                          <div className="text-xs text-gray-500">
                            {canSchedule
                              ? 'Gate 0 is verified. TD Venture may schedule the first meeting.'
                              : `Scheduling locked until all 4 Gate 0 requirements are verified (${gate0Summary.verified || 0}/4).`}
                          </div>

                          <button
                            type="button"
                            disabled={
                              !canSchedule
                              || scheduleMeeting.isPending
                              || !scheduleForm.start
                              || !scheduleForm.end
                              || (
                                scheduleForm.mode === 'video'
                                && !scheduleForm.url.trim()
                              )
                              || (
                                scheduleForm.mode === 'in_person'
                                && !scheduleForm.location.trim()
                              )
                            }
                            className="rounded-md bg-blue-400 px-4 py-2 text-sm font-semibold text-black disabled:opacity-40"
                            onClick={() =>
                              scheduleMeeting.mutate()
                            }
                          >
                            {scheduleMeeting.isPending
                              ? 'Scheduling...'
                              : 'Schedule First Meeting'}
                          </button>
                        </div>
                      </div>
                    )}

                  {meetingActionError && (
                    <div className="mt-4 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">
                      {meetingActionError}
                    </div>
                  )}

                  {!isAdmin && meetingRecord && (
                    <div className="mt-4 text-xs text-gray-500">
                      TD Venture manages evidence verification and first-meeting scheduling. Your Opportunity remains protected throughout coordination.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className={`${activeWorkspaceTab === 'overview' ? '' : 'hidden'} border border-lime-500/40 rounded-lg p-4`}>
                <h3 className="font-semibold text-lime-300 mb-3">Opportunity Summary</h3>
                <div className="space-y-2 text-sm">
                  <div><span className="text-gray-500">Startup:</span> {selected.startup_name || 'Protected'}</div>
                  <div><span className="text-gray-500">Investor:</span> {selected.firm || 'Protected'}</div>
                  <div><span className="text-gray-500">Sector:</span> {selected.sector || selected.focus_sectors || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Stage:</span> {selected.stage || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Capital:</span> {selected.ask || 'Not disclosed'}</div>
                  <div><span className="text-gray-500">Next Best Action:</span> {selected.next_best_action || selected.next_action || 'Awaiting next event'}</div>
                </div>

                {isAdmin &&
                  [
                    'interested',
                    'payment_complete',
                    'investor_notified',
                    'waiting_response',
                    'delivery_issue',
                  ].includes(
                    String(
                      selected.status || ''
                    )
                  ) && (
                    <div className="mt-4 border-t border-lime-500/20 pt-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                        TD Venture Outreach
                      </div>

                      <button
                        type="button"
                        disabled={
                          sendInvestorInvite.isPending
                        }
                        onClick={() => {
                          setInvestorInviteMessage('');

                          sendInvestorInvite.mutate(
                            String(selected.id)
                          );
                        }}
                        className="mt-2 rounded-md border border-lime-400/50 bg-lime-400/10 px-4 py-2 text-xs font-semibold text-lime-300 transition hover:bg-lime-400/20 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        {sendInvestorInvite.isPending
                          ? 'Sending…'
                          : selected.status ===
                              'delivery_issue'
                            ? 'Resend Investor Invitation'
                            : 'Send Investor Invitation'}
                      </button>

                      {investorInviteMessage && (
                        <div
                          className={`mt-2 text-xs ${
                            sendInvestorInvite.isError
                              ? 'text-red-300'
                              : 'text-lime-300'
                          }`}
                        >
                          {investorInviteMessage}
                        </div>
                      )}

                      <div className="mt-2 text-[11px] leading-4 text-gray-500">
                        TD Venture controls delivery and
                        preserves founder and investor
                        contact privacy.
                      </div>
                    </div>
                  )}
              </div>

              <div className={`${activeWorkspaceTab === 'timeline' ? '' : 'hidden'} border border-blue-500/40 rounded-lg p-4`}>
                <h3 className="font-semibold text-blue-300 mb-3">Opportunity Journey</h3>

                <div className="space-y-2 text-sm">

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-lime-400"></span>
                    Interested
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["payment_complete","investor_notified","delivery_issue","waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Outreach Ready
                  </div>

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["investor_notified","delivery_issue","waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Outreach Initiated
                  </div>

                  {selected.status === 'delivery_issue' && (
                    <div className="ml-5 rounded-md border border-red-500/40 bg-red-500/10 p-3 text-red-200">
                      <div className="font-semibold">Delivery Issue</div>
                      <div className="mt-1 text-xs">
                        The invitation was not successfully delivered. Verify the contact route before any further outreach.
                      </div>
                    </div>
                  )}

                  <div className="ml-1 h-4 border-l border-gray-700"></div>

                  <div className="flex items-center gap-2">
                    <span className={`h-3 w-3 rounded-full ${
                      ["waiting_response","accepted","meeting_scheduled","due_diligence","funded"].includes(selected.status)
                        ? "bg-lime-400"
                        : "border border-gray-500"
                    }`}></span>
                    Awaiting Response
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

            <div className={`${activeWorkspaceTab === 'timeline' ? '' : 'hidden'} mt-5 border border-lime-500/40 rounded-lg p-4`}>
              <h3 className="font-semibold text-lime-300 mb-2">Chief of Staff Recommendation</h3>
              <p className="text-sm text-gray-300">
                Complete qualification, initiate protected outreach, then monitor the response. Contact details remain protected until a TD Venture-coordinated introduction.
              </p>
            </div>

            <div className={`${activeWorkspaceTab === 'scores' ? '' : 'hidden'} mt-5 border border-blue-500/40 rounded-lg p-4`}>
              <h3 className="font-semibold text-blue-300 mb-3">Match → Opportunity Qualification</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Match Fit × 50%</span>
                  <span className="text-lime-300">{scoreLabel(selected.match_fit, '/100')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Conversion Score × 30%</span>
                  <span className="text-cyan-300">{scoreLabel(selected.conversion_score, '/100')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Diamond Index × 20%</span>
                  <span className="text-blue-300">{scoreLabel(selected.diamond_score, '/100')}</span>
                </div>

                <div className="border-t border-blue-500/30 pt-3 mt-3 flex justify-between">
                  <span className="font-semibold text-white">Qualification · threshold 50</span>
                  <span className="font-bold text-lime-300">{scoreLabel(selected.opportunity_score, '/100')}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-400">Risk</span>
                  <span className="font-semibold text-yellow-300">{selected.investment_risk || 'Awaiting evidence'}</span>
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-3">
                Founder and investor trust remain independent context. They are never defaulted and are not blended into this qualification score.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
