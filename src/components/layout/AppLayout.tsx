import { useEffect, useState } from "react";
import { Outlet, Link, useNavigate, Navigate } from "react-router-dom";
import ProcessRibbon from "@/components/crm/ProcessRibbon";
import BloombergBackground from "@/components/crm/BloombergBackground";
import { useCurrentUser } from '@/hooks/useCurrentUser';

export default function AppLayout() {
  const { data: user, isLoading, isError } = useCurrentUser();
  const [loadingTimedOut, setLoadingTimedOut] = useState(false);
  const hasToken = Boolean(localStorage.getItem("tdventure_token"));
  const navigate = useNavigate();
  const [openMenu, setOpenMenu] = useState<string | null>(null);

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

  const closeMenus = () => setOpenMenu(null);

  return (
    <div className="relative min-h-screen flex flex-col text-white">
      <BloombergBackground />

      <header className="relative z-20 border-b border-lime-500/70 bg-black/95 p-4 flex justify-between items-center">
        <div className="flex items-center gap-7">
          <Link to="/" className="text-xl font-bold text-lime-400" onClick={closeMenus}>
            TD Venture Deal Desk
          </Link>

          <nav className="flex gap-5 text-sm items-center">
            <Link to="/" onClick={closeMenus}>Dashboard</Link>

            <div className="relative">
              <button
                type="button"
                className="text-lime-300"
                onClick={() => setOpenMenu(openMenu === "register" ? null : "register")}
              >
                Register ▾
              </button>

              {openMenu === "register" && (
                <div className="absolute left-0 mt-2 min-w-44 rounded-md border border-lime-500/50 bg-black p-2 shadow-lg">
                  <Link className="block px-3 py-2 hover:bg-lime-400 hover:text-black" to="/startups" onClick={closeMenus}>
                    Startup
                  </Link>
                  <Link className="block px-3 py-2 hover:bg-lime-400 hover:text-black" to="/investors" onClick={closeMenus}>
                    Investor
                  </Link>
                </div>
              )}
            </div>

            <div className="relative">
              <button
                type="button"
                className="text-lime-300"
                onClick={() => setOpenMenu(openMenu === "discover" ? null : "discover")}
              >
                Discover ▾
              </button>

              {openMenu === "discover" && (
                <div className="absolute left-0 mt-2 min-w-48 rounded-md border border-lime-500/50 bg-black p-2 shadow-lg">
                  <Link className="block px-3 py-2 hover:bg-lime-400 hover:text-black" to="/discover/startups" onClick={closeMenus}>
                    Startups
                  </Link>
                  <Link className="block px-3 py-2 hover:bg-lime-400 hover:text-black" to="/discover/investors" onClick={closeMenus}>
                    Investors
                  </Link>
                </div>
              )}
            </div>

            <Link to="/matches" onClick={closeMenus}>Opportunities</Link>
            <Link to="/payments" onClick={closeMenus}>Payments</Link>
            <Link to="/profiles" onClick={closeMenus}>Profile</Link>
          </nav>
        </div>

        <div>
          {user ? (
            <>
              <span className="mr-4">Welcome, {user?.full_name || user?.email}</span>
              <button type="button" onClick={logout}>Logout</button>
            </>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </header>

      <ProcessRibbon />

      <main className="relative z-10 flex-1 p-4" onClick={closeMenus}>
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
