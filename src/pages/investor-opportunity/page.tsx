import React, { useEffect, useMemo, useState } from 'react';

type InvitationReview = {
  ok: boolean;
  invitation: {
    expires_at: string | null;
    already_responded: boolean;
    response: string | null;
  };
  opportunity: {
    opportunity_code: string;
    status: string | null;
    startup: {
      identity: string;
      sector: string | null;
      stage: string | null;
      capital_ask: string | null;
    };
  };
  privacy: string;
  response_options: string[];
};

type InvestorResponse =
  | 'interested'
  | 'request_meeting'
  | 'not_this_opportunity'
  | 'pause'
  | 'do_not_contact';

const RESPONSE_OPTIONS: Array<{
  value: InvestorResponse;
  title: string;
  description: string;
  emphasis?: 'primary' | 'neutral' | 'danger';
}> = [
  {
    value: 'interested',
    title: 'Interested',
    description:
      'I would like TD Venture to continue this conversation and coordinate the next step.',
    emphasis: 'primary',
  },
  {
    value: 'request_meeting',
    title: 'Request Meeting',
    description:
      'I would like TD Venture to coordinate a first meeting with this startup.',
    emphasis: 'primary',
  },
  {
    value: 'not_this_opportunity',
    title: 'Not This Opportunity',
    description:
      'This opportunity is not a fit for me. No introduction is required.',
    emphasis: 'neutral',
  },
  {
    value: 'pause',
    title: 'Pause for 30 days',
    description:
      'Pause TD Venture Deal Desk outreach for 30 days. New invitations may resume automatically after the pause expires.',
    emphasis: 'neutral',
  },
  {
    value: 'do_not_contact',
    title: 'Do Not Contact Me',
    description:
      'Do not send me further Deal Desk investor outreach.',
    emphasis: 'danger',
  },
];

function getInvitationToken(): string {
  if (typeof window === 'undefined') return '';

  const hash = window.location.hash.replace(/^#/, '');
  const params = new URLSearchParams(hash);

  return (params.get('invite') || '').trim();
}

function humanResponse(value: string | null | undefined): string {
  switch (value) {
    case 'interested':
      return 'Interested';
    case 'request_meeting':
      return 'Meeting requested';
    case 'not_this_opportunity':
      return 'Not this opportunity';
    case 'pause':
      return 'Invitations paused';
    case 'do_not_contact':
      return 'Do not contact';
    default:
      return 'Response recorded';
  }
}

export default function InvestorOpportunityPage() {
  const token = useMemo(() => getInvitationToken(), []);

  const [review, setReview] = useState<InvitationReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [submitting, setSubmitting] =
    useState<InvestorResponse | null>(null);

  const [responseResult, setResponseResult] = useState<{
    response: string;
    message: string;
  } | null>(null);

  const [responseError, setResponseError] = useState('');
  const [confirmDoNotContact, setConfirmDoNotContact] =
    useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadInvitation() {
      if (!token) {
        setLoadError(
          'This invitation link is incomplete. Please use the secure link sent by TD Venture.'
        );
        setLoading(false);
        return;
      }

      try {
        const res = await fetch(
          '/api/public/opportunity-invitations/review',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          }
        );

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          throw new Error(
            data?.detail ||
              'This invitation is unavailable or has expired.'
          );
        }

        if (!cancelled) {
          setReview(data);

          if (
            data?.invitation?.already_responded &&
            data?.invitation?.response
          ) {
            setResponseResult({
              response: data.invitation.response,
              message:
                'Your response has already been recorded by TD Venture.',
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'This invitation could not be loaded.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function submitResponse(response: InvestorResponse) {
    if (!token || submitting || responseResult) return;

    if (response === 'do_not_contact' && !confirmDoNotContact) {
      setConfirmDoNotContact(true);
      return;
    }

    setResponseError('');
    setSubmitting(response);

    try {
      const res = await fetch(
        '/api/public/opportunity-invitations/respond',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token,
            response,
          }),
        }
      );

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(
          data?.detail ||
            'TD Venture could not record your response.'
        );
      }

      setResponseResult({
        response,
        message:
          data?.message ||
          'Your response has been recorded by TD Venture.',
      });

      setConfirmDoNotContact(false);
    } catch (error) {
      setResponseError(
        error instanceof Error
          ? error.message
          : 'Your response could not be recorded.'
      );
    } finally {
      setSubmitting(null);
    }
  }

  const startup = review?.opportunity?.startup;

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-900">
      <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
        <header className="mb-10 flex items-center justify-between border-b border-slate-200 pb-6">
          <div>
            <div className="text-xl font-semibold tracking-tight text-slate-950">
              TD Venture
            </div>
            <div className="mt-1 text-sm text-slate-500">
              Private investor opportunity
            </div>
          </div>

          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm">
            Protected Review
          </div>
        </header>

        {loading && (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="h-2 w-24 animate-pulse rounded bg-slate-200" />
            <div className="mt-6 h-8 w-72 max-w-full animate-pulse rounded bg-slate-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-slate-100" />
            <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-slate-100" />
          </section>
        )}

        {!loading && loadError && (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
            <div className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-400">
              Secure invitation
            </div>

            <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
              This opportunity is not available
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              {loadError}
            </p>

            <p className="mt-6 text-sm text-slate-500">
              If you believe this link should still be active, contact TD Venture through your usual channel.
            </p>
          </section>
        )}

        {!loading && review && (
          <>
            <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 px-7 py-8 sm:px-10 sm:py-10">
                <div className="text-sm font-semibold uppercase tracking-[0.16em] text-indigo-600">
                  Investor Opportunity
                </div>

                <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Review a protected startup opportunity
                </h1>

                <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">
                  TD Venture is managing this fundraising conversation. Review the opportunity below and tell us how you would like to proceed.
                </p>
              </div>

              <div className="grid gap-0 md:grid-cols-[1.4fr_0.6fr]">
                <div className="px-7 py-8 sm:px-10">
                  <div className="mb-6 flex flex-wrap items-center gap-3">
                    <span className="rounded-full bg-slate-950 px-3 py-1.5 text-xs font-semibold text-white">
                      {review.opportunity.opportunity_code}
                    </span>

                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800">
                      Identity protected
                    </span>
                  </div>

                  <dl className="grid gap-6 sm:grid-cols-3">
                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Sector
                      </dt>
                      <dd className="mt-2 text-base font-medium text-slate-900">
                        {startup?.sector || 'Not disclosed'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Stage
                      </dt>
                      <dd className="mt-2 text-base font-medium text-slate-900">
                        {startup?.stage || 'Not disclosed'}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                        Capital required
                      </dt>
                      <dd className="mt-2 text-base font-medium text-slate-900">
                        {startup?.capital_ask || 'Not disclosed'}
                      </dd>
                    </div>
                  </dl>
                </div>

                <aside className="border-t border-slate-100 bg-slate-50 px-7 py-8 md:border-l md:border-t-0 sm:px-8">
                  <div className="text-sm font-semibold text-slate-900">
                    Privacy by design
                  </div>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {review.privacy}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-slate-600">
                    A positive response authorizes TD Venture to coordinate the next step. It does not automatically release either party's contact details.
                  </p>
                </aside>
              </div>
            </section>

            <section className="mt-7 rounded-3xl border border-slate-200 bg-white p-7 shadow-sm sm:p-10">
              <div className="max-w-2xl">
                <div className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Your response
                </div>

                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
                  What would you like TD Venture to do next?
                </h2>

                <p className="mt-3 text-sm leading-6 text-slate-600">
                  Silence is not treated as rejection. You can respond when you are ready while this secure invitation remains active.
                </p>
              </div>

              {responseResult ? (
                <div className="mt-7 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
                    Response recorded
                  </div>

                  <div className="mt-2 text-xl font-semibold text-emerald-950">
                    {humanResponse(responseResult.response)}
                  </div>

                  <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-900">
                    {responseResult.message}
                  </p>

                  <p className="mt-3 text-sm leading-6 text-emerald-800">
                    Contact details remain protected. TD Venture will coordinate any appropriate next step.
                  </p>
                </div>
              ) : (
                <div className="mt-7 grid gap-3">
                  {RESPONSE_OPTIONS.map((option) => {
                    const isDanger =
                      option.emphasis === 'danger';
                    const isPrimary =
                      option.emphasis === 'primary';

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={Boolean(submitting)}
                        onClick={() =>
                          submitResponse(option.value)
                        }
                        className={[
                          'w-full rounded-2xl border p-5 text-left transition',
                          'disabled:cursor-not-allowed disabled:opacity-60',
                          isPrimary
                            ? 'border-indigo-200 bg-indigo-50 hover:border-indigo-300 hover:bg-indigo-100/70'
                            : isDanger
                              ? 'border-red-200 bg-white hover:bg-red-50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50',
                        ].join(' ')}
                      >
                        <div
                          className={[
                            'text-base font-semibold',
                            isDanger
                              ? 'text-red-800'
                              : isPrimary
                                ? 'text-indigo-950'
                                : 'text-slate-900',
                          ].join(' ')}
                        >
                          {submitting === option.value
                            ? 'Recording response…'
                            : option.title}
                        </div>

                        <div
                          className={[
                            'mt-1 text-sm leading-6',
                            isDanger
                              ? 'text-red-700'
                              : 'text-slate-600',
                          ].join(' ')}
                        >
                          {option.description}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {confirmDoNotContact && !responseResult && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-5">
                  <div className="font-semibold text-red-900">
                    Confirm do-not-contact
                  </div>

                  <p className="mt-2 text-sm leading-6 text-red-800">
                    TD Venture will record this address as unavailable for future Deal Desk outreach.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      disabled={Boolean(submitting)}
                      onClick={() =>
                        submitResponse('do_not_contact')
                      }
                      className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-800 disabled:opacity-60"
                    >
                      Confirm Do Not Contact
                    </button>

                    <button
                      type="button"
                      disabled={Boolean(submitting)}
                      onClick={() =>
                        setConfirmDoNotContact(false)
                      }
                      className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {responseError && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  {responseError}
                </div>
              )}
            </section>

            <footer className="px-2 py-8 text-center text-xs leading-5 text-slate-500">
              TD Venture facilitates introductions and tracks the investment conversation. An invitation does not create an obligation to invest or respond.
            </footer>
          </>
        )}
      </div>
    </main>
  );
}
