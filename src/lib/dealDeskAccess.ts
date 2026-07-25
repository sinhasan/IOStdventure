export type DealDeskAccessResponse = {
  ok: boolean;
  allowed: boolean;
  user_id: string;
  role: 'startup' | 'investor' | 'admin';
  profile_type: 'startup' | 'investor' | 'admin';
  profile_id: string | null;
};

export async function readDealDeskApiError(
  response: Response,
  fallback: string
): Promise<string> {
  const rawBody = await response.text();
  let message = rawBody.trim();

  if (message) {
    try {
      const parsed = JSON.parse(message) as {
        detail?: string;
        message?: string;
      };

      message =
        parsed.detail ||
        parsed.message ||
        message;
    } catch {
      // Preserve a plain-text backend response.
    }
  }

  return message || fallback;
}

export async function verifyDealDeskAccess(
  token: string
): Promise<DealDeskAccessResponse> {
  const normalizedToken =
    String(token || '').trim();

  if (!normalizedToken) {
    throw new Error(
      'Your TD Venture session was not found.'
    );
  }

  const response = await fetch(
    '/api/deal-desk/access',
    {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${normalizedToken}`
      }
    }
  );

  if (!response.ok) {
    throw new Error(
      await readDealDeskApiError(
        response,
        'Deal Desk access could not be verified.'
      )
    );
  }

  const access =
    await response.json() as
      DealDeskAccessResponse;

  if (!access.allowed) {
    throw new Error(
      'Your account is not eligible to enter Deal Desk.'
    );
  }

  return access;
}
