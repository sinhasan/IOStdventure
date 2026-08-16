import React from "react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Briefcase,
  LineChart,
  Settings,
} from "lucide-react";

const items = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Building2, label: "Startups" },
  { icon: Users, label: "Investors" },
  { icon: Briefcase, label: "Deal Desk" },
  { icon: LineChart, label: "Analytics" },
  { icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800 min-h-screen">
      <div className="px-5 py-6">
        <h2 className="text-green-400 font-bold text-lg tracking-wider">
          TDVENTURE
        </h2>

        <p className="text-xs text-zinc-500 mt-1">
          Bloomberg CRM
        </p>
      </div>

      <nav className="px-3 space-y-1">
        {items.map((item) => {
          const Icon = item.icon;

          return (
            <button
              key={item.label}
              className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left text-zinc-300 hover:bg-zinc-900 hover:text-white transition"
            >
              <Icon size={18} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
