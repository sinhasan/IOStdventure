import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, Navigate } from "react-router-dom";
import BloombergBackground from "@/components/crm/BloombergBackground";
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AppLayout() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const hasToken = Boolean(localStorage.getItem("tdventure_token"));
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setLoadingTimedOut(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  const logout = () => {
    localStorage.removeItem('tdventure_token');
    navigate('/login', { replace: true });
  };

  if (!hasToken) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-lime-300 flex items-center justify-center">
        Loading Deal Desk...
      </div>
    );
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

        <div className="flex items-center gap-5">
          <a
            href="https://staging.tdventure.vc/app"
            target="_blank"
            rel="noreferrer"
            className="motion-safe:animate-pulse rounded-md bg-lime-400 px-4 py-2 text-sm font-bold text-black shadow-[0_0_24px_rgba(163,255,18,0.75)] transition hover:bg-lime-300"
          >
            Private Marketplace ↗
          </a>

          <div>
            {user ? (
              <>
                <span className="mr-4">
                  Welcome, {user?.full_name || user?.email}
                </span>

                <button
                  type="button"
                  onClick={logout}
                  className="font-semibold text-white transition hover:text-lime-300"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </div>
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
