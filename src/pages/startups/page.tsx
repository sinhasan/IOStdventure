import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { createStartup } from '@/lib/api';
import { Link } from 'react-router-dom';

const sectors = [
  'AI / Machine Learning',
  'SaaS',
  'FinTech',
  'HealthTech',
  'EdTech',
  'ClimateTech',
  'DeepTech',
  'Consumer',
  'Enterprise Software',
  'Cybersecurity',
  'Logistics',
  'AgriTech',
  'Other',
];

const stages = ['Pre-Seed', 'Seed', 'Growth', 'Series A', 'Series B-F'];

export default function StartupRegisterPage() {
  const [form, setForm] = useState({
    startup_name: '',
    founder_name: '',
    email: '',
    phone: '',
    city: '',
    country: 'India',
    sector: '',
    stage: '',
    website: '',
    pitch_summary: '',
    ask: '',
    linkedin_profile: '',
    social_media_handles: '',
  });

  const [saved, setSaved] = useState(false);

  const mutation = useMutation({
    mutationFn: createStartup,
    onSuccess: () => setSaved(true),
  });

  const update = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(false);
    mutation.mutate(form);
  };

  return (
    <div className="p-6 text-white">
      <div className="mb-6 border border-lime-500/60 bg-black/70 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Register Startup
        </div>
        <h1 className="text-3xl font-semibold mb-2">Create your startup profile</h1>
        <p className="text-sm text-gray-400">
          Complete your profile once. Use it for investor discovery, connect requests,
          reveal credits and Deal Flow.
        </p>

        <div className="mt-4 text-sm text-lime-300">
          Register → Discover Investors → Connect → Reveal → Deal Flow
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <form
          onSubmit={submit}
          className="lg:col-span-3 border border-lime-500/60 bg-black/75 rounded-lg p-6 space-y-5"
        >
          <div>
            <h2 className="text-xl font-semibold mb-1">Founder Details</h2>
            <p className="text-sm text-gray-400">These details remain protected until reveal.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Founder Name *" value={form.founder_name} onChange={(e) => update('founder_name', e.target.value)} required />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Email *" type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Mobile *" value={form.phone} onChange={(e) => update('phone', e.target.value)} required />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="LinkedIn Profile" value={form.linkedin_profile} onChange={(e) => update('linkedin_profile', e.target.value)} />
          </div>

          <div className="pt-4">
            <h2 className="text-xl font-semibold mb-1">Startup Details</h2>
            <p className="text-sm text-gray-400">This powers matching and discovery.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Startup Name *" value={form.startup_name} onChange={(e) => update('startup_name', e.target.value)} required />

            <select className="bg-black border border-lime-500/50 rounded-md p-3" value={form.sector} onChange={(e) => update('sector', e.target.value)} required>
              <option value="">Select Sector *</option>
              {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <select className="bg-black border border-lime-500/50 rounded-md p-3" value={form.stage} onChange={(e) => update('stage', e.target.value)} required>
              <option value="">Select Stage *</option>
              {stages.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>

            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Ask / Funding Requirement" value={form.ask} onChange={(e) => update('ask', e.target.value)} />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Country *" value={form.country} onChange={(e) => update('country', e.target.value)} required />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="City *" value={form.city} onChange={(e) => update('city', e.target.value)} required />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Website" value={form.website} onChange={(e) => update('website', e.target.value)} />
            <input className="bg-black border border-lime-500/50 rounded-md p-3" placeholder="Social Media Handles" value={form.social_media_handles} onChange={(e) => update('social_media_handles', e.target.value)} />
          </div>

          <textarea
            className="w-full bg-black border border-lime-500/50 rounded-md p-3 min-h-32"
            placeholder="Pitch Summary"
            value={form.pitch_summary}
            onChange={(e) => update('pitch_summary', e.target.value)}
          />

          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-md bg-lime-400 text-black px-6 py-3 font-semibold disabled:opacity-60"
          >
            {mutation.isPending ? 'Saving...' : 'Save Startup Profile'}
          </button>

          {saved && (
            <div className="border border-lime-500/60 rounded-md p-4 bg-lime-400/10">
              <div className="font-semibold text-lime-300">Profile saved successfully.</div>
              <Link to="/discover/investors" className="inline-block mt-3 text-lime-300 underline">
                Continue to Discover Investors →
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
            <span className="text-sm text-lime-300">Live profile creation</span>
          </div>

          <ul className="space-y-2 text-sm text-gray-400">
            <li>✓ Required for Discover Investors</li>
            <li>✓ Required for Connect</li>
            <li>✓ Required for Reveal</li>
            <li>✓ Feeds Deal Flow</li>
          </ul>

          <div className="mt-6 border-t border-lime-500/30 pt-4">
            <div className="text-sm font-semibold mb-2">What happens next?</div>
            <p className="text-sm text-gray-400">
              Once saved, your profile becomes ready for investor discovery and future AI matching.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}