import { useMemo, useState } from 'react';

type Props = {
  opportunityId?: string | null;
};

const API_ROOT = 'https://' + 'staging.tdventure.vc/api';

function getToken(): string {
  return String(
    window.localStorage.getItem('tdventure_token') || ''
  ).trim();
}

function readRole(): string {
  try {
    const token = getToken();
    const payload = token.split('.')[1];

    if (!payload) return '';

    const normalized = payload
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '='
    );

    const decoded = JSON.parse(
      window.atob(padded)
    );

    return String(decoded?.role || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

async function readError(response: Response) {
  try {
    const body = await response.json();

    return String(
      body?.detail ||
      body?.message ||
      `Request failed (${response.status})`
    );
  } catch {
    return `Request failed (${response.status})`;
  }
}

export function Gate0ConversionLaunch({
  opportunityId,
}: Props) {
  const role = useMemo(() => readRole(), []);
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState('');

  const isFounder =
    role === 'startup' ||
    role === 'founder';

  if (!isFounder || !opportunityId) {
    return null;
  }

  const openConversion = async () => {
    const token = getToken();

    if (!token) {
      setError(
        'Your TD Venture session is unavailable. Sign in again.'
      );
      return;
    }

    setOpening(true);
    setError('');

    try {
      const url =
        `${API_ROOT}/conversion/launch` +
        `?opportunity_id=${encodeURIComponent(
          opportunityId
        )}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      const data = await response.json();
      const launchUrl = String(
        data?.launch_url || ''
      ).trim();

      if (!launchUrl) {
        throw new Error(
          'Conversion launch link was not returned.'
        );
      }

      window.location.assign(launchUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not open Conversion.'
      );
      setOpening(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-lime-400/20 bg-black/20 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-white">
            Founder Gate 0 preparation
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Prepare the investor-safe document pack in Conversion.
          </div>
        </div>

        <button
          type="button"
          disabled={opening}
          onClick={() => void openConversion()}
          className="rounded-lg bg-lime-300 px-4 py-2 text-xs font-semibold text-black disabled:cursor-not-allowed disabled:opacity-50"
        >
          {opening
            ? 'Opening Conversion…'
            : 'Prepare Gate 0 in Conversion →'}
        </button>
      </div>

      {error && (
        <div className="mt-3 text-xs text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}
