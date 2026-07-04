import { useState } from 'react';
import { useQuery, useMutation } from '@/lib/react-query-client';
import { Authenticated } from '@/components/AuthGuard';

export default function PartnerPage() {
  const { data: partner, refetch } = useQuery('api.partners.getMyPartnerProfile');
  const { mutate: submit, isLoading } = useMutation('api.partners.submitReferral');
  const [form, setForm] = useState({ name: '', email: '', phone: '', city: '', referralMethod: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(form, {
      onSuccess: () => { alert('Referral submitted!'); refetch(); },
      onError: (err: any) => alert('Error: ' + err.message),
    });
  };

  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Partner Dashboard</h1>
        {partner && (
          <div className="border rounded-md p-4 mb-4">
            <p>Welcome, {(partner as any).name || 'Partner'}!</p>
            <p>Referral Code: {(partner as any).referral_code}</p>
          </div>
        )}
        <div className="border rounded-md p-4">
          <h2 className="font-medium mb-2">Submit a Referral</h2>
          <form onSubmit={handleSubmit} className="space-y-3">
            {(['name','email','phone','city','referralMethod'] as const).map((field) => (
              <input
                key={field}
                type={field === 'email' ? 'email' : 'text'}
                placeholder={field.charAt(0).toUpperCase() + field.slice(1)}
                className="w-full px-3 py-1 border rounded-md bg-transparent"
                value={form[field]}
                onChange={(e) => setForm({ ...form, [field]: e.target.value })}
                required
              />
            ))}
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-lime-400 text-black rounded-md disabled:opacity-50"
            >
              {isLoading ? 'Submitting...' : 'Submit Referral'}
            </button>
          </form>
        </div>
      </div>
    </Authenticated>
  );
}
