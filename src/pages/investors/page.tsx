import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createInvestor } from '@/lib/api';
import { Link } from 'react-router-dom';

const investorTypes = [
  'Angel Investor',
  'VC Fund',
  'Family Office',
  'Corporate VC',
  'Accelerator',
  'Investment Banker',
  'Strategic Investor',
  'Other',
];

const ticketSizes = [
  '₹10L - ₹50L',
  '₹50L - ₹1Cr',
  '₹1Cr - ₹5Cr',
  '₹5Cr - ₹25Cr',
  '$50K - $250K',
  '$250K - $1M',
  '$1M+',
];

export default function InvestorRegisterPage() {
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    city: '',
    country: 'India',
    firm: '',
    linkedin_profile: '',
    investor_type: '',
    ticket_size: '',
    focus_sectors: '',
    preferred_stage: '',
  });

  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: createInvestor,
    onSuccess: () => setSaved(true),
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);

    mutation.mutate({
      full_name: form.full_name,
      email: form.email,
      phone: form.phone,
      city: form.city,
      country: form.country,
      firm: form.firm,
      linkedin_profile: form.linkedin_profile,
    });
  };

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/70 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Register Investor
        </div>

        <h1 className="text-3xl font-semibold mb-2">Create your investor profile</h1>

        <p className="text-sm text-gray-400">
          Complete your investor profile once. Use it to discover startups, connect,
          reveal founders and manage opportunities in Deal Flow.
        </p>

        <div className="mt-4 text-sm text-lime-300">
          Register → Discover Startups → Connect → Reveal → Deal Flow
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <form
          onSubmit={submit}
          className="lg:col-span-3 border border-lime-500/60 bg-black/75 rounded-lg p-6 space-y-5"
        >
          <div>
            <h2 className="text-xl font-semibold mb-1">Investor Details</h2>
            <p className="text-sm text-gray-400">
              Identity remains protected until a startup connects and reveals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Full Name *"
              value={form.full_name}
              onChange={(e) => update('full_name', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Email *"
              type="email"
              value={form.email}
              onChange={(e) => update('email', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Mobile *"
              value={form.phone}
              onChange={(e) => update('phone', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Firm / Fund Name *"
              value={form.firm}
              onChange={(e) => update('firm', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Country *"
              value={form.country}
              onChange={(e) => update('country', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="City *"
              value={form.city}
              onChange={(e) => update('city', e.target.value)}
              required
            />

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="LinkedIn Profile — e.g. https://linkedin.com/in/yourname"
              value={form.linkedin_profile}
              onChange={(e) => update('linkedin_profile', e.target.value)}
            />

            <select
              className="bg-black border border-lime-500/50 rounded-md p-3"
              value={form.investor_type}
              onChange={(e) => update('investor_type', e.target.value)}
            >
              <option value="">Investor Type</option>
              {investorTypes.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>

            <select
              className="bg-black border border-lime-500/50 rounded-md p-3"
              value={form.ticket_size}
              onChange={(e) => update('ticket_size', e.target.value)}
            >
              <option value="">Typical Ticket Size</option>
              {ticketSizes.map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>

            <input
              className="bg-black border border-lime-500/50 rounded-md p-3"
              placeholder="Preferred Stage — e.g. Seed, Series A"
              value={form.preferred_stage}
              onChange={(e) => update('preferred_stage', e.target.value)}
            />
          </div>

          <textarea
            className="w-full bg-black border border-lime-500/50 rounded-md p-3 min-h-28"
            placeholder="Focus Sectors — e.g. AI, SaaS, FinTech, HealthTech"
            value={form.focus_sectors}
            onChange={(e) => update('focus_sectors', e.target.value)}
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-lime-400 text-black px-6 py-3 font-semibold disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : 'Save Investor Profile'}
          </button>

          {saved && (
            <div className="border border-lime-500/60 rounded-md p-4 bg-lime-400/10">
              <div className="font-semibold text-lime-300">Investor profile saved successfully.</div>
              <Link to="/discover/startups" className="inline-block mt-3 text-lime-300 underline">
                Continue to Discover Startups →
              </Link>
            </div>
          )}

          {mutation.isError && (
            <div className="border border-red-500/60 rounded-md p-4 bg-red-500/10 text-red-300">
              Unable to save profile. Please check required fields.
            </div>
          )}
        </form>

        <aside className="border border-lime-500/60 bg-black/75 rounded-lg p-5 h-fit">
          <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-3">
            Profile Status
          </div>

          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-80 animate-ping"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400"></span>
            </span>
            <span className="text-sm text-lime-300">Live investor profile</span>
          </div>

          <ul className="space-y-2 text-sm text-gray-400">
            <li>✓ Required for Discover Startups</li>
            <li>✓ Required for Connect</li>
            <li>✓ Required for Reveal</li>
            <li>✓ Feeds Deal Flow</li>
          </ul>

          <div className="mt-6 border-t border-lime-500/30 pt-4">
            <div className="text-sm font-semibold mb-2">What happens next?</div>
            <p className="text-sm text-gray-400">
              Once saved, your investor profile becomes ready for startup discovery and future deal flow.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}