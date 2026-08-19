import React, {
  useEffect,
  useState
} from 'react';
import {
  Link,
  useNavigate
} from 'react-router-dom';
import {
  verifyDealDeskAccess
} from '@/lib/dealDeskAccess';

const CANONICAL_EXCHANGE_URL =
  'https://staging.tdventure.vc/api/deal-desk/launch/exchange';

const PENDING_LAUNCH_KEY =
  'tdv_deal_desk_pending_launch';

let exchangePromise:
  Promise<string> | null = null;

function scrubLaunchParameters(): void {
  const cleanUrl =
    new URL(window.location.href);

  cleanUrl.searchParams.delete('launch');
  cleanUrl.searchParams.delete('token');

  window.history.replaceState(
    {},
    document.title,
    cleanUrl.pathname
      + cleanUrl.search
      + cleanUrl.hash
  );
}

function resolveLaunchDestination(): string {
  const launchUrl = new URL(
    window.location.href
  );

  const requested =
    launchUrl.searchParams.get('next');

  if (requested !== '/discover/startups') {
    return '/';
  }

  const startupId = String(
    launchUrl.searchParams.get('startup_id') || ''
  ).trim();

  if (!startupId) {
    return '/discover/startups';
  }

  const validStartupId =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
      .test(startupId);

  if (!validStartupId) {
    return '/discover/startups';
  }

  return (
    '/discover/startups?startup_id=' +
    encodeURIComponent(startupId)
  );
}

async function exchangeLaunchToken(
  rawLaunchToken: string
): Promise<string> {
  const response = await fetch(
    CANONICAL_EXCHANGE_URL,
    {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        launch_token: rawLaunchToken
      })
    }
  );

  if (!response.ok) {
    const rawBody = await response.text();
    let message = rawBody.trim();

    try {
      const parsed = JSON.parse(rawBody);

      if (
        parsed &&
        typeof parsed.detail === 'string'
      ) {
        message = parsed.detail;
      }
    } catch {
      // Preserve the plain-text response.
    }

    throw new Error(
      message ||
      'The secure Deal Desk link is invalid or expired.'
    );
  }

  const data = await response.json();
  const token = String(
    data?.access_token || ''
  ).trim();

  if (!token) {
    throw new Error(
      'The Deal Desk launch did not return a session.'
    );
  }

  localStorage.setItem(
    'tdventure_token',
    token
  );

  try {
    await verifyDealDeskAccess(token);
  } catch (accessError) {
    localStorage.removeItem(
      'tdventure_token'
    );

    throw accessError;
  }

  return token;
}

function initializeLaunch(): Promise<string> {
  const currentUrl =
    new URL(window.location.href);

  const urlLaunch =
    currentUrl.searchParams
      .get('launch')
      ?.trim() || '';

  const hasLegacyToken =
    currentUrl.searchParams.has('token');

  if (urlLaunch) {
    sessionStorage.setItem(
      PENDING_LAUNCH_KEY,
      urlLaunch
    );
  }

  scrubLaunchParameters();

  if (hasLegacyToken && !urlLaunch) {
    return Promise.reject(
      new Error(
        'Legacy token links are not accepted. Open Deal Desk from Conversion again.'
      )
    );
  }

  const rawLaunchToken =
    urlLaunch ||
    sessionStorage.getItem(
      PENDING_LAUNCH_KEY
    ) ||
    '';

  if (
    rawLaunchToken.length < 32 ||
    rawLaunchToken.length > 512
  ) {
    const existingToken =
      localStorage.getItem(
        'tdventure_token'
      );

    if (existingToken) {
      return Promise.resolve(
        existingToken
      );
    }

    return Promise.reject(
      new Error(
        'The secure Deal Desk link is missing or invalid.'
      )
    );
  }

  if (!exchangePromise) {
    exchangePromise =
      exchangeLaunchToken(
        rawLaunchToken
      ).finally(() => {
        exchangePromise = null;
      });
  }

  return exchangePromise;
}

export default function WorkspaceLaunch() {
  const navigate = useNavigate();
  const [error, setError] =
    useState('');

  useEffect(() => {
    let cancelled = false;
    const destination = resolveLaunchDestination();

    void initializeLaunch()
      .then(() => {
        sessionStorage.removeItem(
          PENDING_LAUNCH_KEY
        );

        if (!cancelled) {
          navigate(destination, {
            replace: true
          });
        }
      })
      .catch((launchError) => {
        sessionStorage.removeItem(
          PENDING_LAUNCH_KEY
        );

        localStorage.removeItem(
          'tdventure_token'
        );

        if (!cancelled) {
          setError(
            launchError instanceof Error
              ? launchError.message
              : 'Could not connect the TD Venture session.'
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#111111] p-8 text-center shadow-2xl">
        {!error ? (
          <>
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-[#D4FF00]">
              Common Auth
            </div>

            <h1 className="mt-4 text-3xl font-bold">
              Opening Deal Desk
            </h1>

            <p className="mt-3 text-sm text-gray-400">
              Verifying your shared TD Venture identity…
            </p>
          </>
        ) : (
          <>
            <div className="font-mono text-xs uppercase tracking-[0.28em] text-[#D4FF00]">
              Secure launch stopped
            </div>

            <h1 className="mt-4 text-3xl font-bold">
              Deal Desk could not open
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-400">
              {error}
            </p>

            <Link
              to="/login"
              className="mt-6 inline-flex rounded-xl border border-[#D4FF00]/40 px-5 py-3 text-sm font-bold text-[#D4FF00] transition hover:bg-[#D4FF00]/10"
            >
              Use Deal Desk login
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
