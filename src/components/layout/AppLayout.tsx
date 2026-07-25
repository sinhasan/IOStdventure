import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, Navigate } from "react-router-dom";
import BloombergBackground from "@/components/crm/BloombergBackground";
import { useCurrentUser } from '@/hooks/useCurrentUser';
import {
  verifyDealDeskAccess
} from '@/lib/dealDeskAccess';

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

  const logout = () => {
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

  return (
    <div className="relative min-h-screen flex flex-col text-white">
      <BloombergBackground />

      <header className="relative z-20 border-b border-lime-500/70 bg-black/95 p-4 flex justify-between items-center">
        <div className="flex items-center gap-7">
          <Link to="/" className="text-xl font-bold text-lime-400">
            TD Venture Deal Desk
          </Link>

          <nav className="flex items-center gap-6 text-sm">
            <Link
              to="/"
              className="font-medium text-gray-500 transition-colors hover:text-white"
            >
              Dashboard
            </Link>

            <Link
              to="/matches"
              className="font-medium text-gray-500 transition-colors hover:text-white"
            >
              Opportunities
            </Link>

            <Link
              to="/payments"
              className="font-medium text-gray-500 transition-colors hover:text-white"
            >
              Payments
            </Link>

          </nav>
        </div>

          <div className="flex items-center gap-2">
            <a
              href="https://conversion.tdventure.vc/"
              target="_blank"
              rel="noreferrer"
              title="Open Conversion"
              className="motion-safe:animate-[pulse_3s_ease-in-out_infinite] inline-flex h-10 min-w-[130px] items-center justify-center rounded-md border border-cyan-300/70 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.24)] transition hover:bg-cyan-300 hover:text-black"
            >
              ← Conversion
            </a>

            <div
              title={user.email || user.full_name}
              className="inline-flex h-10 max-w-[190px] items-center rounded-md border border-white/15 bg-white/[0.05] px-3"
            >
              <span className="truncate text-xs font-semibold text-white">
                {user.full_name || user.email}
              </span>
            </div>

            <a
              href="https://staging.tdventure.vc/app"
              target="_blank"
              rel="noreferrer"
              title="Open Private Marketplace"
              className="motion-safe:animate-[pulse_3s_ease-in-out_infinite] inline-flex h-10 min-w-[165px] items-center justify-center rounded-md border border-lime-300/70 bg-lime-400/10 px-3 text-xs font-bold text-lime-200 shadow-[0_0_22px_rgba(163,255,18,0.24)] transition hover:bg-lime-300 hover:text-black"
            >
              Private Marketplace →
            </a>

            <button
              type="button"
              onClick={logout}
              className="h-10 rounded-md border border-white/15 bg-white/[0.04] px-3 text-xs font-semibold text-white transition hover:border-lime-300/60 hover:text-lime-300"
            >
              Logout
            </button>
          </div>
      </header>

      <main className="relative z-10 flex-1 p-4">
        <Outlet />

        <footer className="fixed bottom-0 left-0 right-0 z-40 border-t border-lime-500/30 bg-black/95 px-4 py-2 text-[11px] text-gray-400">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-center">
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
      </main>
    </div>
  );
}
