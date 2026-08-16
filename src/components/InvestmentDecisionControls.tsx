import {
  useEffect,
  useMemo,
  useState,
} from 'react';

type Props = {
  opportunityId?: string | null;
  opportunityStatus?: string | null;
};

type DecisionRecord = {
  decision?: string | null;
  decision_notes?: string | null;
  decision_at?: string | null;
  funded_amount?: string | number | null;
  funded_currency?: string | null;
  funded_at?: string | null;
  closed_reason?: string | null;
  closed_at?: string | null;
};

const API_ROOT = '/api';

function getToken(): string {
  return String(
    window.localStorage.getItem('tdventure_token') || ''
  ).trim();
}

function readRole(): string {
  try {
    const token = getToken();
    const raw = token.split('.')[1];

    if (!raw) return '';

    const normalized = raw
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const padded = normalized.padEnd(
      Math.ceil(normalized.length / 4) * 4,
      '='
    );

    return String(
      JSON.parse(
        window.atob(padded)
      )?.role || ''
    )
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

async function readError(
  response: Response
): Promise<string> {
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

export function InvestmentDecisionControls({
  opportunityId,
  opportunityStatus,
}: Props) {
  const role = useMemo(
    () => readRole(),
    []
  );

  const [decision, setDecision] =
    useState<DecisionRecord | null>(null);

  const [notes, setNotes] =
    useState('');

  const [closedReason, setClosedReason] =
    useState('');

  const [amount, setAmount] =
    useState('');

  const [currency, setCurrency] =
    useState('USD');

  const [busy, setBusy] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const isAdmin = role === 'admin';

  const relevantStatus = [
    'due_diligence',
    'funded',
    'closed',
  ].includes(
    String(opportunityStatus || '')
  );

  const loadDecision = async () => {
    if (
      !isAdmin ||
      !opportunityId ||
      !relevantStatus
    ) {
      return;
    }

    const token = getToken();

    if (!token) return;

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/investment-decision`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      const data = await response.json();

      setDecision(
        data?.decision || null
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load investment decision.'
      );
    }
  };

  useEffect(() => {
    void loadDecision();
  }, [
    opportunityId,
    opportunityStatus,
    isAdmin,
  ]);

  if (
    !isAdmin ||
    !opportunityId ||
    !relevantStatus
  ) {
    return null;
  }

  const sendDecision = async (
    value: 'proceed' | 'pass'
  ) => {
    const token = getToken();

    if (!token) {
      setMessage(
        'TD Venture admin session unavailable.'
      );
      return;
    }

    if (
      value === 'pass' &&
      !closedReason.trim()
    ) {
      setMessage(
        'Enter a reason before closing the opportunity.'
      );
      return;
    }

    setBusy(value);
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/investment-decision`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            decision: value,
            notes:
              notes.trim() || null,
            closed_reason:
              value === 'pass'
                ? closedReason.trim()
                : null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      setMessage(
        value === 'proceed'
          ? 'Proceed decision recorded. Opportunity remains in Due Diligence until funding is confirmed.'
          : 'Pass decision recorded. Opportunity closed.'
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not record investment decision.'
      );
    } finally {
      setBusy(null);
    }
  };

  const markFunded = async () => {
    const token = getToken();

    if (!token) {
      setMessage(
        'TD Venture admin session unavailable.'
      );
      return;
    }

    const numericAmount =
      Number(amount);

    if (
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setMessage(
        'Enter a valid funded amount.'
      );
      return;
    }

    if (
      currency.trim().length !== 3
    ) {
      setMessage(
        'Use a 3-letter currency code.'
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Mark this opportunity Funded for ${currency.toUpperCase()} ${amount}?`
      );

    if (!confirmed) return;

    setBusy('funded');
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/investment-decision/funded`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            amount,
            currency:
              currency.toUpperCase(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      setMessage(
        'Investment recorded as Funded.'
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 700);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not mark opportunity Funded.'
      );
    } finally {
      setBusy(null);
    }
  };

  const status =
    String(opportunityStatus || '');

  return (
    <div className="mt-4 rounded-lg border border-[#D4FF00]/25 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-[#D4FF00]">
            Investment Decision
          </div>

          <div className="mt-1 text-xs text-gray-500">
            Record the post-DD investment outcome and closing state.
          </div>
        </div>

        <div className="rounded-md border border-gray-800 px-3 py-2 text-xs text-gray-300">
          {status
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (m) =>
              m.toUpperCase()
            )}
        </div>
      </div>

      {decision && (
        <div className="mt-4 rounded-md border border-gray-800 bg-black/30 p-3">
          <div className="text-[11px] uppercase tracking-wide text-gray-500">
            Recorded Decision
          </div>

          <div className="mt-1 text-sm font-semibold text-white">
            {decision.decision === 'proceed'
              ? 'Proceed'
              : decision.decision === 'pass'
              ? 'Pass'
              : 'Awaiting decision'}
          </div>

          {decision.decision_notes && (
            <div className="mt-2 text-xs text-gray-400">
              {decision.decision_notes}
            </div>
          )}

          {decision.closed_reason && (
            <div className="mt-2 text-xs text-amber-300">
              Closed: {decision.closed_reason}
            </div>
          )}

          {decision.funded_amount && (
            <div className="mt-2 text-sm font-semibold text-[#D4FF00]">
              {decision.funded_currency || 'USD'}{' '}
              {decision.funded_amount}
            </div>
          )}
        </div>
      )}

      {status === 'due_diligence' && (
        <>
          <label className="mt-4 block text-xs text-gray-400">
            Decision / DD notes
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              placeholder="Key diligence outcome, terms, remaining conditions..."
              className="mt-1 min-h-[75px] w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void sendDecision(
                  'proceed'
                )
              }
              className="rounded-md bg-[#D4FF00] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {busy === 'proceed'
                ? 'Recording...'
                : 'Proceed'}
            </button>
          </div>

          <div className="mt-4 border-t border-gray-800 pt-4">
            <div className="text-xs font-semibold text-emerald-300">
              Closing
            </div>

            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="text-xs text-gray-400">
                Funded amount
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={amount}
                  onChange={(event) =>
                    setAmount(
                      event.target.value
                    )
                  }
                  placeholder="500000"
                  className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
                />
              </label>

              <label className="text-xs text-gray-400">
                Currency
                <input
                  value={currency}
                  maxLength={3}
                  onChange={(event) =>
                    setCurrency(
                      event.target.value
                        .toUpperCase()
                    )
                  }
                  className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
                />
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  disabled={
                    Boolean(busy) ||
                    decision?.decision !==
                      'proceed'
                  }
                  onClick={() =>
                    void markFunded()
                  }
                  className="w-full rounded-md border border-emerald-500/40 px-4 py-2 text-xs font-semibold text-emerald-300 disabled:cursor-not-allowed disabled:opacity-30"
                >
                  {busy === 'funded'
                    ? 'Recording...'
                    : 'Mark Funded'}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 border-t border-gray-800 pt-4">
            <div className="text-xs font-semibold text-amber-300">
              Pass / Close
            </div>

            <textarea
              value={closedReason}
              onChange={(event) =>
                setClosedReason(
                  event.target.value
                )
              }
              placeholder="Reason for pass / closure..."
              className="mt-2 min-h-[65px] w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />

            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() =>
                void sendDecision(
                  'pass'
                )
              }
              className="mt-3 rounded-md border border-amber-500/40 px-4 py-2 text-xs font-semibold text-amber-300 disabled:opacity-40"
            >
              {busy === 'pass'
                ? 'Closing...'
                : 'Pass & Close'}
            </button>
          </div>
        </>
      )}

      {status === 'funded' && (
        <div className="mt-4 text-sm font-semibold text-[#D4FF00]">
          Opportunity Funded
        </div>
      )}

      {status === 'closed' && (
        <div className="mt-4 text-sm font-semibold text-gray-400">
          Opportunity Closed
        </div>
      )}

      {message && (
        <div className="mt-4 text-xs text-gray-300">
          {message}
        </div>
      )}
    </div>
  );
}
