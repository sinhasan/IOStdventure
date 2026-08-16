

// Base API URL – uses the same `/api` proxy as staging
const API_BASE = '/api';

// Helper to get headers with auth token
const getAuthHeaders = () => {
  const token = localStorage.getItem('tdventure_token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// ============================================================
// Users
// ============================================================

export const getCurrentUser = async () => {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export type ProfilePlaneStartupProfile = {
  id: string;
  email: string;
  is_active: boolean;
  startup_name?: string | null;
  sector?: string | null;
  stage?: string | null;
  ask?: string | null;
  pitch_summary?: string | null;
  company_email?: string | null;
  firm?: string | null;
  full_name?: string | null;
  geography?: string | null;
  city?: string | null;
  country?: string | null;
  ticket_min_usd?: number | string | null;
  ticket_max_usd?: number | string | null;
};

export type ProfilePlaneResolution = {
  state:
    | 'linked'
    | 'claim_available'
    | 'application_required'
    | 'verification_required'
    | 'ambiguous';
  profile_type?: 'startup' | 'investor' | 'admin' | null;
  profile_id?: string | null;
  profile?: ProfilePlaneStartupProfile | null;
  reason?: string | null;
};

export type ProfilePlaneCurrentResponse = {
  ok: boolean;
  resolution: ProfilePlaneResolution;
};

export const getCurrentProfilePlane = async () => {
  const res = await fetch(`${API_BASE}/profile-plane/current`, {
    headers: getAuthHeaders(),
  });

  if (!res.ok) throw new Error(await res.text());

  return res.json() as Promise<ProfilePlaneCurrentResponse>;
};

export const updateUser = async (data: { full_name?: string; role?: string }) => {
  const res = await fetch(`${API_BASE}/user/update`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Startups
// ============================================================

export const listStartups = async (filters?: any) => {
  // For simplicity, we just call GET /startups
  const res = await fetch(`${API_BASE}/startups`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMyStartup = async () => {
  const res = await fetch(`${API_BASE}/startups/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createStartup = async (data: any) => {
  const res = await fetch(`${API_BASE}/apply/startup`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// updateStartup uses the same endpoint – it upserts by email
export const updateStartup = createStartup;

export const deleteStartup = async (id: string) => {
  const res = await fetch(`${API_BASE}/startups/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMyMatchCount = async (type?: 'startup' | 'investor') => {
  const res = await fetch(`${API_BASE}/matches/count`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export type MatchSummaryCounts = {
  total: number;
  gold: number;
  silver: number;
  bronze: number;
  coal: number;
  sector_matches: number;
  stage_matches: number;
  geography_matches: number;
  ticket_matches: number;
};

export type StartupMatchSummary = {
  startup: {
    id: string;
    startup_name?: string | null;
    sector?: string | null;
    stage?: string | null;
    geography?: string | null;
    ask_usd?: number | string | null;
  };
  matches: MatchSummaryCounts;
  sector_matches: Pick<
    MatchSummaryCounts,
    'total' | 'gold' | 'silver' | 'bronze' | 'coal'
  >;
};

export const getMyMatchSummary = async () => {
  const res = await fetch(`${API_BASE}/matches/summary`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<StartupMatchSummary>;
};

// ============================================================
// Investors
// ============================================================

export const listInvestors = async (filters?: any) => {
  const res = await fetch(`${API_BASE}/investors`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMyInvestor = async () => {
  const res = await fetch(`${API_BASE}/investors/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createInvestor = async (data: any) => {
  const res = await fetch(`${API_BASE}/apply/investor`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateInvestor = createInvestor;

export const deleteInvestor = async (id: string) => {
  const res = await fetch(`${API_BASE}/investors/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Matches (Connections)
// ============================================================

export const getMatches = async () => {
  const res = await fetch(`${API_BASE}/matches`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createMatch = async (data: { target_id: string; target_type: string }) => {
  const res = await fetch(`${API_BASE}/matches`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateMatchStatus = async (matchId: string, status: string) => {
  const res = await fetch(`${API_BASE}/matches/${matchId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteMatch = async (matchId: string) => {
  const res = await fetch(`${API_BASE}/matches/${matchId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getMatchScoreBreakdown = async (matchId: string) => {
  const res = await fetch(`${API_BASE}/matches/${matchId}/score`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const autoMatch = async () => {
  const res = await fetch(`${API_BASE}/ai-match`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};


export const getDashboardStats = async () => {
  const res = await fetch(`${API_BASE}/dashboard`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Stats
// ============================================================

export const getMyStats = async () => {
  const res = await fetch(`${API_BASE}/stats/me`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getOverviewStats = async () => {
  const res = await fetch(`${API_BASE}/admin/stats`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Partners (Scout)
// ============================================================

export const getMyPartnerProfile = async () => {
  const res = await fetch(`${API_BASE}/partners/me`, { // We'll need to add this endpoint later
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const submitPartnerApplication = async (data: any) => {
  const res = await fetch(`${API_BASE}/partners`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Workspace access + hosted Payment Plane
// ============================================================

const TDVENTURE_PAYMENT_API_BASE = 'https://staging.tdventure.vc/api';
const TDVENTURE_PAYMENT_PAGE = 'https://staging.tdventure.vc/payment.html';
const DEAL_DESK_WORKSPACE_URL = 'https://crm.tdventure.vc/';

export type WorkspaceAccessResponse = {
  access: 'free_pass' | 'paid' | 'paywall';
  entries_used?: number;
  entries_remaining?: number;
  paid_until?: string;
  pricing_url?: string;
};

type PaymentIntentCreateResponse = {
  ok: boolean;
  intent_token: string;
  checkout_url: string;
};

function createWorkspacePaymentIdempotencyKey(prefix: string): string {
  const randomPart =
    typeof window !== 'undefined' &&
    window.crypto &&
    typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  return `${prefix}-${randomPart}`;
}

async function readWorkspaceApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const raw = await response.text();
  if (!raw.trim()) return fallback;

  try {
    const parsed = JSON.parse(raw) as {
      detail?: string;
      message?: string;
    };
    return parsed.detail || parsed.message || fallback;
  } catch {
    return raw.trim() || fallback;
  }
}

function validateHostedPaymentUrl(checkoutUrl: string): string {
  let expected: URL;
  let actual: URL;

  try {
    expected = new URL(TDVENTURE_PAYMENT_PAGE);
    actual = new URL(checkoutUrl);
  } catch {
    throw new Error('The secure checkout URL is invalid.');
  }

  if (
    actual.protocol !== 'https:' ||
    actual.origin !== expected.origin ||
    actual.pathname !== expected.pathname
  ) {
    throw new Error(
      'The secure checkout URL did not match the approved TD Venture Payment Plane.'
    );
  }

  return actual.toString();
}

export async function claimDealDeskWorkspaceEntry(): Promise<WorkspaceAccessResponse> {
  const res = await fetch(`${API_BASE}/crm/access-check`, {
    method: 'GET',
    headers: getAuthHeaders(),
  });

  if (!res.ok) {
    throw new Error(
      await readWorkspaceApiError(
        res,
        'Deal Desk access could not be checked.'
      )
    );
  }

  return res.json() as Promise<WorkspaceAccessResponse>;
}

export async function startDealDeskCheckout(
  subjectId: string
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('Secure checkout is available only in the browser.');
  }

  const normalizedSubjectId = String(subjectId || '').trim();
  if (!normalizedSubjectId) {
    throw new Error('Your TD Venture account could not be identified for checkout.');
  }

  const token = localStorage.getItem('tdventure_token');
  if (!token) {
    throw new Error('Your TD Venture session was not found. Please sign in again.');
  }

  const res = await fetch(`${TDVENTURE_PAYMENT_API_BASE}/payment-plane/intents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      plan_code: 'crm_deal_desk_7999',
      subject_id: normalizedSubjectId,
      idempotency_key: createWorkspacePaymentIdempotencyKey('deal-desk'),
      return_url: DEAL_DESK_WORKSPACE_URL,
    }),
  });

  if (!res.ok) {
    throw new Error(
      await readWorkspaceApiError(
        res,
        'Deal Desk checkout could not be started.'
      )
    );
  }

  const paymentIntent = await res.json() as PaymentIntentCreateResponse;
  const checkoutUrl = validateHostedPaymentUrl(
    String(paymentIntent.checkout_url || '').trim()
  );

  window.location.assign(checkoutUrl);
}

// ============================================================
// Admin (if needed)
// ============================================================

export const adminListUsers = async () => {
  const res = await fetch(`${API_BASE}/admin/users`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ... add other admin endpoints as needed


// Stub for setUserRole (to be implemented)
export const setUserRole = async (data: { targetEmail: string; role: string }) => {
  // This should call an admin endpoint
  throw new Error('setUserRole not implemented');
};

export async function login(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new Error('Login failed');
  const data = await res.json();
  if (data.token) localStorage.setItem('tdventure_token', data.token);
  return data;
}

export const recalculateMatches = async () => {
  const res = await fetch(`${API_BASE}/matches/recalculate`, {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};


export const listInvestorMatches = async (filters?: { tier?: string }) => {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/discover/investors/matches${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getInvestorMatchInventory = async (filters?: {
  tier?: string;
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
  params.set('limit', String(filters?.limit ?? 24));
  params.set('offset', String(filters?.offset ?? 0));

  const res = await fetch(`${API_BASE}/matches/investors?${params.toString()}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const listStartupMatches = async (filters?: { tier?: string }) => {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
  params.set('limit', '2000');
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/discover/startups/matches${qs ? `?${qs}` : ''}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const createDealFlow = async (data: any) => {
  const res = await fetch(`${API_BASE}/deal-flow`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDealFlow = async () => {
  const res = await fetch(`${API_BASE}/deal-flow`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getQualifiedOpportunities = async (filters?: {
  view?: 'qualified' | 'all' | 'awaiting' | 'developing';
  limit?: number;
  offset?: number;
}) => {
  const params = new URLSearchParams();
  params.set('view', filters?.view ?? 'all');
  params.set('limit', String(filters?.limit ?? 24));
  params.set('offset', String(filters?.offset ?? 0));

  const res = await fetch(
    `${API_BASE}/opportunities/qualified?${params.toString()}`,
    {
      headers: getAuthHeaders(),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const updateDealFlowStatus = async (dealId: string, status: string) => {
  const res = await fetch(`${API_BASE}/deal-flow/${dealId}/status`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const startOpportunity = async (data: any) => {
  const res = await fetch(`${API_BASE}/opportunities/start-v2`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const message = await readWorkspaceApiError(
      res,
      'Unable to start this Opportunity.'
    );

    const opportunityLimitReached =
      res.status === 403 &&
      message.includes(
        'free Deal Desk trial allows up to 10 concurrent active Opportunities'
      );

    if (
      opportunityLimitReached &&
      typeof window !== 'undefined'
    ) {
      window.dispatchEvent(
        new CustomEvent('tdv:dealdesk-opportunity-limit', {
          detail: { message },
        })
      );
    }

    throw new Error(message);
  }
  const payload = await res.json();

  if (typeof window !== 'undefined' && payload?.opportunity?.id) {
    window.sessionStorage.setItem(
      'tdv_open_opportunity_id',
      String(payload.opportunity.id),
    );
    window.sessionStorage.setItem(
      'tdv_open_opportunity_code',
      String(payload.opportunity.opportunity_code || ''),
    );
  }

  return payload;
};

export const getOpportunityTimeline = async (opportunityId: string) => {
  const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/timeline`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};


export const getMeetingCoordination = async (
  opportunityId: string
) => {
  const res = await fetch(
    `${API_BASE}/opportunities/${opportunityId}/meeting-coordination`,
    {
      headers: getAuthHeaders(),
    }
  );

  if (!res.ok) {
    throw new Error(
      await readWorkspaceApiError(
        res,
        'Unable to load Meeting Coordination.'
      )
    );
  }

  return res.json();
};


export const updateGate0Requirement = async (
  opportunityId: string,
  requirementKey: string,
  data: {
    status: 'provided' | 'verified';
    evidence_source?: string;
    evidence_reference?: string;
    evidence_notes?: string;
  }
) => {
  const res = await fetch(
    `${API_BASE}/opportunities/${opportunityId}/gate0/${requirementKey}`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error(
      await readWorkspaceApiError(
        res,
        'Unable to update Gate 0 readiness.'
      )
    );
  }

  return res.json();
};


export const scheduleOpportunityMeeting = async (
  opportunityId: string,
  data: {
    scheduled_start_at: string;
    scheduled_end_at: string;
    timezone: string;
    meeting_mode: 'video' | 'phone' | 'in_person';
    meeting_url?: string | null;
    location?: string | null;
    coordination_notes?: string | null;
  }
) => {
  const res = await fetch(
    `${API_BASE}/opportunities/${opportunityId}/meeting-coordination/schedule`,
    {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(data),
    }
  );

  if (!res.ok) {
    throw new Error(
      await readWorkspaceApiError(
        res,
        'Unable to schedule the first meeting.'
      )
    );
  }

  return res.json();
};

export const getChiefOfStaffBrief = async () => {
  const res = await fetch(`${API_BASE}/chief-of-staff/brief`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};


export const getDealDeskBrief = async (startupId: string) => {
  const res = await fetch(
    `${API_BASE}/deal-desk/brief/${encodeURIComponent(startupId)}`,
    {
      headers: getAuthHeaders(),
    },
  );
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// ============================================================
// Opportunity Notes
// ============================================================

export const getOpportunityNotes = async (opportunityId: string) => {
  const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/notes`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const addOpportunityNote = async (opportunityId: string, note: string) => {
  const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/notes`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ note }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const sendInvestorInvitation = async (
  opportunityId: string
) => {
  const token =
    localStorage.getItem('tdventure_token');

  if (!token) {
    throw new Error(
      'Authentication required.'
    );
  }

  const response = await fetch(
    `/api/admin/opportunities/${encodeURIComponent(
      opportunityId
    )}/send-investor-invitation`,
    {
      method: 'POST',
      headers: {
        Authorization:
          `Bearer ${token}`,
      },
    }
  );

  let data: any = {};

  try {
    data = await response.json();
  } catch {
    data = {};
  }

  if (!response.ok) {
    throw new Error(
      data?.detail
      || data?.message
      || `Unable to send investor invitation (HTTP ${response.status}).`
    );
  }

  return data;
};
