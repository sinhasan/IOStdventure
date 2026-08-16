import React from "react";

type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="text-green-400 font-bold tracking-wider">
          TDVENTURE.VC
        </div>

        <div className="text-sm text-zinc-400">
          Bloomberg Deal Desk
        </div>
      </header>

      <div className="flex">
        <aside className="w-64 border-r border-zinc-800 min-h-[calc(100vh-56px)] p-4">

          <div className="text-xs uppercase text-zinc-500 mb-3">
            Navigation
          </div>

          <ul className="space-y-2">

            <li className="bg-zinc-900 rounded px-3 py-2 cursor-pointer hover:bg-zinc-800">
              Dashboard
            </li>

            <li className="rounded px-3 py-2 cursor-pointer hover:bg-zinc-900">
              Startups
            </li>

            <li className="rounded px-3 py-2 cursor-pointer hover:bg-zinc-900">
              Investors
            </li>

            <li className="rounded px-3 py-2 cursor-pointer hover:bg-zinc-900">
              Deal Desk
            </li>

          </ul>

        </aside>

        <main className="flex-1 p-6">
          {children}
        </main>

      </div>
    </div>
  );
}
