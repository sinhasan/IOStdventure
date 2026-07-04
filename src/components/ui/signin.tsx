import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const body = new URLSearchParams();
      body.append("username", email);
      body.append("password", password);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      if (!res.ok) throw new Error('Login failed');
      const data = await res.json();
      if (data.access_token) localStorage.setItem('tdventure_token', data.access_token);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 p-6 border rounded-md">
        <h1 className="text-xl font-semibold">Sign In</h1>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <input type="email" placeholder="Email"
          className="w-full px-3 py-2 border rounded-md bg-transparent"
          value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input type="password" placeholder="Password"
          className="w-full px-3 py-2 border rounded-md bg-transparent"
          value={password} onChange={(e) => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading}
          className="w-full py-2 bg-lime-400 text-black rounded-md font-medium disabled:opacity-50">
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
