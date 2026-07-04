

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
// Payments (Cashfree – reuse existing logic)
// ============================================================

// For payments, we can use the existing cashfree functions from `tdventure`
// We'll import them from a shared location if needed, or keep them separate.

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

export const listStartupMatches = async (filters?: { tier?: string }) => {
  const params = new URLSearchParams();
  if (filters?.tier) params.set('tier', filters.tier);
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
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getOpportunityTimeline = async (opportunityId: string) => {
  const res = await fetch(`${API_BASE}/opportunities/${opportunityId}/timeline`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getChiefOfStaffBrief = async () => {
  const res = await fetch(`${API_BASE}/chief-of-staff/brief`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
};
