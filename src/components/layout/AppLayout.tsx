import { useEffect, useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { Outlet, Link, useLocation, useNavigate, Navigate } from "react-router-dom";
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  claimDealDeskWorkspaceEntry,
  getCurrentProfilePlane,
  startDealDeskCheckout,
  type WorkspaceAccessResponse,
} from '@/lib/api';
import {
  verifyDealDeskAccess
} from '@/lib/dealDeskAccess';

const BASE_NAV_ITEMS = [
  { to: "/", label: "Dashboard" },
  { to: "/matches", label: "Matches" },
  { to: "/opportunities", label: "Opportunities" },
  { to: "/qualification", label: "Qualification" },
];

function GridBackdrop() {
  // Static, subtle grid texture — replaces the old scrolling ticker wallpaper
  // (BloombergBackground) which was fighting the dense layout for attention.
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 bg-[#020403]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}
    />
  );
}

export default function AppLayout() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const hasToken = Boolean(
    localStorage.getItem(
      "tdventure_token"
    )
  );

  const [accessState, setAccessState] =
    useState<
      'checking' |
      'allowed' |
      'denied'
    >(
      hasToken
        ? 'checking'
        : 'denied'
    );

  const [workspaceAccessState, setWorkspaceAccessState] =
    useState<'idle' | 'checking' | 'allowed' | 'paywall' | 'error'>('idle');
  const [workspaceAccessDetail, setWorkspaceAccessDetail] =
    useState<WorkspaceAccessResponse | null>(null);
  const [workspaceAccessError, setWorkspaceAccessError] = useState('');
  const [checkoutStarting, setCheckoutStarting] = useState(false);
const [opportunityLimitPrompt, setOpportunityLimitPrompt] =
  useState(false);

  const location = useLocation();

useEffect(() => {
  const showOpportunityLimitPrompt = () => {
    setOpportunityLimitPrompt(true);
  };

  window.addEventListener(
    'tdv:dealdesk-opportunity-limit',
    showOpportunityLimitPrompt
  );

  return () => {
    window.removeEventListener(
      'tdv:dealdesk-opportunity-limit',
      showOpportunityLimitPrompt
    );
  };
}, []);

  const profilePlaneQuery = useQuery({
    queryKey: ['profilePlane'],
    queryFn: getCurrentProfilePlane,
    enabled: Boolean(user) && accessState === 'allowed',
    staleTime: 5 * 60 * 1000,
  });

  const linkedStartupName =
    profilePlaneQuery.data?.resolution?.state === 'linked' &&
    profilePlaneQuery.data?.resolution?.profile_type === 'startup'
      ? String(
          profilePlaneQuery.data.resolution.profile?.startup_name || ''
        ).trim()
      : '';

  const linkedInvestorName =
    profilePlaneQuery.data?.resolution?.state === 'linked' &&
    profilePlaneQuery.data?.resolution?.profile_type === 'investor'
      ? String(
          (profilePlaneQuery.data.resolution.profile as any)?.firm ||
          (profilePlaneQuery.data.resolution.profile as any)?.full_name ||
          ''
        ).trim()
      : '';

  const profileType =
    profilePlaneQuery.data?.resolution?.state === 'linked'
      ? profilePlaneQuery.data.resolution.profile_type
      : null;

  const navItems = [
    BASE_NAV_ITEMS[0],
    profileType === 'investor'
      ? { to: '/discover/startups', label: 'Discover Startups' }
      : { to: '/discover/investors', label: 'Discover Investors' },
    ...BASE_NAV_ITEMS.slice(1),
  ];

  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(
      () => setLoadingTimedOut(true),
      1500
    );

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const token = localStorage.getItem(
      'tdventure_token'
    );

    if (!token) {
      setAccessState('denied');
      return;
    }

    setAccessState('checking');

    void verifyDealDeskAccess(token)
      .then(() => {
        if (!cancelled) {
          setAccessState('allowed');
        }
      })
      .catch(() => {
        localStorage.removeItem(
          'tdventure_token'
        );

        if (!cancelled) {
          setAccessState('denied');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [hasToken]);

  useEffect(() => {
    if (accessState !== 'allowed' || !user) {
      setWorkspaceAccessState('idle');
      return;
    }

    let cancelled = false;

    const canonicalUserId = String(
      (user as any).canonical_user_id ||
      (user as any).id ||
      ''
    ).trim();
    const identityKey = canonicalUserId || String(user.email || '').trim().toLowerCase();
    const sessionKey = `tdv:crm:workspace-entry:${identityKey}`;

    try {
      const cached = sessionStorage.getItem(sessionKey);
      if (cached) {
        const parsed = JSON.parse(cached) as WorkspaceAccessResponse;
        const paidCacheIsCurrent =
          parsed.access === 'paid' &&
          (!parsed.paid_until || new Date(parsed.paid_until).getTime() > Date.now());

        if (parsed.access === 'free_pass' || paidCacheIsCurrent) {
          setWorkspaceAccessDetail(parsed);
          setWorkspaceAccessError('');
          setWorkspaceAccessState('allowed');
          return;
        }
      }
    } catch {
      // A blocked or malformed session cache should never block Deal Desk.
    }

    setWorkspaceAccessState('checking');
    setWorkspaceAccessError('');

    void claimDealDeskWorkspaceEntry()
      .then((access) => {
        if (cancelled) return;

        setWorkspaceAccessDetail(access);

        if (access.access === 'paywall') {
          setWorkspaceAccessState('paywall');
          return;
        }

        if (access.access === 'free_pass' || access.access === 'paid') {
          try {
            sessionStorage.setItem(sessionKey, JSON.stringify(access));
          } catch {
            // Access remains valid even if sessionStorage is unavailable.
          }
          setWorkspaceAccessState('allowed');
          return;
        }

        setWorkspaceAccessError('Deal Desk returned an unknown access state.');
        setWorkspaceAccessState('error');
      })
      .catch((error) => {
        if (cancelled) return;
        setWorkspaceAccessError(
          error instanceof Error
            ? error.message
            : 'Deal Desk access could not be checked.'
        );
        setWorkspaceAccessState('error');
      });

    return () => {
      cancelled = true;
    };
  }, [accessState, user?.id, user?.email]);

  const canonicalCheckoutUserId = String(
    (user as any)?.canonical_user_id ||
    (user as any)?.id ||
    ''
  ).trim();

  const startCheckout = async () => {
    if (checkoutStarting) return;
    setCheckoutStarting(true);
    setWorkspaceAccessError('');

    try {
      await startDealDeskCheckout(canonicalCheckoutUserId);
    } catch (error) {
      setWorkspaceAccessError(
        error instanceof Error
          ? error.message
          : 'Deal Desk checkout could not be started.'
      );
      setCheckoutStarting(false);
    }
  };

  const logout = () => {
    const identityKey = canonicalCheckoutUserId || String(user?.email || '').trim().toLowerCase();
    if (identityKey) {
      try {
        sessionStorage.removeItem(`tdv:crm:workspace-entry:${identityKey}`);
      } catch {
        // Ignore browser storage restrictions during logout.
      }
    }
    localStorage.removeItem('tdventure_token');
    navigate('/login', { replace: true });
  };

  if (
    !hasToken ||
    accessState === 'denied'
  ) {
    return <Navigate to="/login" replace />;
  }

  if (
    isLoading ||
    accessState === 'checking'
  ) {
    return (
      <div className="min-h-screen bg-black text-lime-300 flex items-center justify-center">
        Loading Deal Desk...
      </div>
    );
  }

  if (isError || !user) {
    return <Navigate to="/login" replace />;
  }

  const isAdmin =
    String(user?.role || '').toLowerCase() === 'admin';

  if (
    !isAdmin &&
    (
      workspaceAccessState === 'idle'
      || workspaceAccessState === 'checking'
    )
  ) {
    return (
      <div className="min-h-screen bg-black text-lime-300 flex items-center justify-center">
        Checking Deal Desk access...
      </div>
    );
  }

  if (
    !isAdmin &&
    workspaceAccessState === 'error'
  ) {
    return (
      <div className="min-h-screen bg-black px-6 text-white flex items-center justify-center">
        <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-zinc-950 p-7 text-center">
          <div className="text-xs font-bold uppercase tracking-[0.25em] text-red-300">
            Deal Desk access check
          </div>
          <h1 className="mt-3 text-2xl font-black">We could not verify workspace access</h1>
          <p className="mt-3 text-sm text-zinc-400">
            {workspaceAccessError || 'Please reload and try again.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-lime-300 px-5 py-2.5 text-sm font-black text-black"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (
    !isAdmin &&
    workspaceAccessState === 'paywall'
  ) {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-black px-6 text-white">
        <GridBackdrop />
        <div className="relative z-10 w-full max-w-2xl rounded-3xl border border-lime-400/45 bg-black/95 p-8 shadow-2xl">
          <div className="text-xs font-black uppercase tracking-[0.28em] text-lime-300">
            TD Venture Deal Desk
          </div>
          <h1 className="mt-3 text-3xl font-black">Your 3 free Deal Desk entries are complete.</h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-400">
            Activate Deal Desk for 6 months of unlimited usage, with 100 Private Marketplace reveal credits included.
          </p>

          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-sm font-bold text-zinc-300">Deal Desk Pass</div>
                <div className="mt-1 text-4xl font-black text-lime-300">₹7,999 <span className="text-base text-zinc-400">+ GST</span></div>
              </div>
              <div className="text-right text-sm text-zinc-300">
                <div className="font-bold text-white">6 months</div>
                <div>Unlimited Deal Desk usage · 100 Private Marketplace reveal credits</div>
              </div>
            </div>
          </div>

          {workspaceAccessError && (
            <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {workspaceAccessError}
            </div>
          )}

          <button
            type="button"
            onClick={() => void startCheckout()}
            disabled={checkoutStarting}
            className="mt-6 w-full rounded-xl bg-lime-300 px-5 py-3.5 text-sm font-black text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
          >
            {checkoutStarting ? 'Opening secure checkout…' : 'Activate Deal Desk'}
          </button>

          <div className="mt-5 flex flex-wrap justify-center gap-4 text-xs font-semibold">
            <a href="https://staging.tdventure.vc/app" className="text-zinc-400 hover:text-white">Private Marketplace</a>
            <a href="https://conversion.tdventure.vc/" className="text-zinc-400 hover:text-white">Conversion</a>
          </div>
        </div>
      </div>
    );
  }

  const workspaceAccessLabel =
    isAdmin
      ? 'TD Venture Admin'
      : workspaceAccessDetail?.access === 'paid'
      ? `Deal Desk Active${workspaceAccessDetail.paid_until ? ` · until ${new Date(workspaceAccessDetail.paid_until).toLocaleDateString()}` : ''}`
      : workspaceAccessDetail?.access === 'free_pass'
        ? `Free access · ${workspaceAccessDetail.entries_remaining ?? 0} entries remaining`
        : '';

  return (
    <div className="tdv-dealdesk-shell relative flex min-h-screen bg-background text-foreground">
      <GridBackdrop />

      {!isAdmin && opportunityLimitPrompt && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-lime-400/40 bg-[#080b08] p-6 shadow-2xl sm:p-8">
            <div className="text-xs font-bold uppercase tracking-[0.18em] text-lime-300">
              Deal Desk free trial
            </div>

            <h2 className="mt-3 text-2xl font-bold text-white">
              You have reached 10 active Opportunities
            </h2>

            <p className="mt-3 text-sm leading-6 text-gray-300">
              Your current Deal Desk session stays open. You can continue
              reviewing and managing your existing Opportunities, or activate
              Deal Desk to open more.
            </p>

            <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.04] p-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white">
                    Deal Desk Pass
                  </div>
                  <div className="mt-1 text-xs text-gray-400">
                    6 months
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-lime-300">
                    ₹7,999 + GST
                  </div>
                </div>
              </div>

              <div className="mt-4 space-y-2 text-sm text-gray-300">
                <div>Unlimited Deal Desk usage</div>
                <div>Unlimited Opportunity management</div>
                <div>100 Private Marketplace reveal credits included</div>
              </div>
            </div>

            {workspaceAccessError && (
              <div className="mt-4 rounded-lg border border-red-400/30 bg-red-950/30 p-3 text-sm text-red-200">
                {workspaceAccessError}
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() => void startCheckout()}
                disabled={checkoutStarting}
                className="flex-1 rounded-xl bg-lime-300 px-5 py-3 text-sm font-black text-black transition hover:bg-lime-200 disabled:cursor-wait disabled:opacity-60"
              >
                {checkoutStarting
                  ? 'Opening secure checkout…'
                  : 'Activate Deal Desk'}
              </button>

              <button
                type="button"
                onClick={() => setOpportunityLimitPrompt(false)}
                disabled={checkoutStarting}
                className="rounded-xl border border-white/15 px-5 py-3 text-sm font-bold text-gray-300 transition hover:border-white/30 hover:text-white disabled:opacity-60"
              >
                Not now
              </button>
            </div>

            <p className="mt-4 text-xs leading-5 text-gray-500">
              Closing this message does not end your current free Deal Desk
              session.
            </p>
          </div>
        </div>
      )}

      {/* LEFT NAV */}
      <aside className="relative z-20 hidden w-60 shrink-0 flex-col border-r border-border bg-card/40 p-3 sm:flex">
        <Link
          to="/"
          className="mb-3 block border-b border-border px-2 pb-4 pt-1 text-base font-bold leading-tight text-foreground"
        >
          TDV Deal Desk
          <span className="mt-0.5 block font-mono text-[9px] font-medium tracking-widest text-gray-500">
            EXECUTE · DEAL DESK
          </span>
        </Link>

        <nav className="flex flex-col gap-0.5 text-sm">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-primary/30 bg-primary/10 text-foreground"
                    : "border-transparent text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-border px-2 pt-3 font-mono text-[9.5px] text-muted-foreground">
          <div
            className="truncate text-gray-400"
            title={linkedStartupName || user.email || user.full_name}
          >
            {linkedStartupName || linkedInvestorName || user.full_name || user.email}
          </div>
          {workspaceAccessLabel && (
            <div className="mt-2 rounded-md border border-primary/25 bg-primary/10 px-2 py-1.5 text-[9px] font-bold text-primary">
              {workspaceAccessLabel}
            </div>
          )}
          <button
            type="button"
            onClick={logout}
            className="mt-2 w-full rounded-md border border-border bg-secondary/50 px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            Logout
          </button>
        </div>
      </aside>

      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <nav className="flex items-center gap-3 text-xs sm:hidden">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={
                  location.pathname === item.to
                    ? "font-semibold text-primary"
                    : "font-medium text-muted-foreground"
                }
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <a
              href="https://conversion.tdventure.vc/"
              target="_blank"
              rel="noreferrer"
              title="Open Conversion"
              className="inline-flex h-9 items-center justify-center rounded-md border border-border bg-card px-3 text-[11px] font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-secondary hover:text-foreground"
            >
              ← Conversion
            </a>

            <span
              className="hidden h-9 items-center rounded-md border border-border bg-card px-3 font-mono text-[10px] font-semibold text-muted-foreground sm:inline-flex"
              title={linkedStartupName || linkedInvestorName || user.email || user.full_name}
            >
              {linkedStartupName || linkedInvestorName || user.full_name || user.email}
            </span>

            <a
              href="https://staging.tdventure.vc/app"
              target="_blank"
              rel="noreferrer"
              title="Open Private Marketplace"
              className="inline-flex h-9 items-center justify-center rounded-md border border-primary/30 bg-primary/10 px-3 text-[11px] font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
            >
              Private Marketplace →
            </a>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 pb-20 sm:p-5">
          <Outlet />
        </main>

        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 px-3 py-1.5 text-[10px] text-muted-foreground backdrop-blur-xl sm:left-[240px]">
          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-center">
            <span className="text-lime-300 font-semibold">TD Venture Capital Group</span>
            <span>Designed in India. Built for Global Capital.</span>
            <span>Operated by Truedigital Consulting India Pvt. Ltd.</span>
            <span>33/34 N S English County, Jigani Road, Bengaluru - 560083</span>
            <span>GST: 29AAHCT5704C1ZE</span>
            <span>CIN: U74999KA2019PTC129015</span>
            <span>hello@tdventure.vc</span>
            <span>+91 99862 33640</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
