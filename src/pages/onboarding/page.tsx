import { useState } from 'react';
import { useQuery, useMutation } from '@/lib/react-query-client';
import { Authenticated } from '@/components/AuthGuard';

export default function OnboardingPage() {
  const { data: user } = useQuery('api.users.getCurrentUser');
  const { mutate: complete, isLoading } = useMutation('api.users.completeOnboarding');
  const [role, setRole] = useState('');

  return (
    <Authenticated>
      <div className="p-6">
        <h1 className="text-xl font-semibold mb-4">Complete Your Onboarding</h1>
        <p className="text-muted-foreground mb-4">
          Welcome, {(user as any)?.full_name || (user as any)?.email}!
        </p>
        <div className="space-y-3">
          <select
            className="px-3 py-1 border rounded-md bg-transparent"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="">Select your role</option>
            <option value="founder">Founder</option>
            <option value="investor">Investor</option>
            <option value="partner">Partner</option>
          </select>
          <button
            onClick={() => complete({ role }, {
              onSuccess: () => alert('Onboarding complete!'),
              onError: (err: any) => alert('Error: ' + err.message),
            })}
            disabled={!role || isLoading}
            className="block px-4 py-2 bg-lime-400 text-black rounded-md disabled:opacity-50"
          >
            {isLoading ? 'Saving...' : 'Complete Onboarding'}
          </button>
        </div>
      </div>
    </Authenticated>
  );
}
