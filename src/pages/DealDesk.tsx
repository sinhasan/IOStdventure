import Layout from "../components/dealdesk/Layout";
import Sidebar from "../components/dealdesk/Sidebar";

export default function DealDesk() {
  return (
    <Layout>
      <div className="flex">
        <Sidebar />

        <div className="flex-1 p-8">

          <h1 className="text-3xl font-bold text-white">
            Bloomberg Deal Desk
          </h1>

          <p className="text-zinc-400 mt-2">
            Version 1.0
          </p>

          <div className="grid grid-cols-4 gap-4 mt-8">

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="text-zinc-500 text-sm">
                Total Startups
              </div>

              <div className="text-3xl mt-2 font-bold">
                1464
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="text-zinc-500 text-sm">
                Investors
              </div>

              <div className="text-3xl mt-2 font-bold">
                631
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="text-zinc-500 text-sm">
                Matches
              </div>

              <div className="text-3xl mt-2 font-bold text-green-400">
                294
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-6">
              <div className="text-zinc-500 text-sm">
                Active Deals
              </div>

              <div className="text-3xl mt-2 font-bold text-yellow-400">
                42
              </div>
            </div>

          </div>

        </div>
      </div>
    </Layout>
  );
}
