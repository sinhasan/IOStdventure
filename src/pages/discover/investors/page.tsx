import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import {
  listInvestorMatches,
  startOpportunity,
  startOpportunityActivationCheckout,
} from '@/lib/api';

type Notice = {
  tone: 'success' | 'error' | 'pending';
  message: string;
};

export default function DiscoverInvestorsPage() {
  const [tier, setTier] = useState('');
  const [sectorFilter, setSectorFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [ticketFilter, setTicketFilter] = useState('');
  const [minFit, setMinFit] = useState(0);

  const [selectedMatch, setSelectedMatch] =
    useState<any | null>(null);

  const [selectedLens, setSelectedLens] =
    useState<any | null>(null);

  const [dealCreated, setDealCreated] =
    useState(false);

  const [dealError, setDealError] =
    useState('');

  const [returnNotice, setReturnNotice] =
    useState<Notice | null>(null);

  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const {
    data = [],
    isLoading,
  } = useQuery({
    queryKey: [
      'investorMatches',
      tier,
    ],
    queryFn: () =>
      listInvestorMatches({
        tier,
      }),
  });

  const returnedActivation =
    searchParams.get(
      'opportunity_activation'
    ) === '1';

  const returnedMatchId =
    searchParams.get('match_id') || '';

  const returnedStartupId =
    searchParams.get('startup_id') || '';

  const returnedInvestorId =
    searchParams.get('investor_id') || '';

  const returnedDirection =
    searchParams.get('direction') ||
    'startup_to_investor';

  const paymentRequiredMessage = (
    message: string
  ) =>
    message.includes(
      'successful ₹99 Opportunity Activation payment'
    );

  useEffect(() => {
    if (!returnedActivation) {
      return;
    }

    if (
      !returnedMatchId ||
      !returnedStartupId ||
      !returnedInvestorId
    ) {
      setReturnNotice({
        tone: 'error',
        message:
          'Opportunity payment returned, but the Match information was incomplete.',
      });
      return;
    }

    let active = true;

    setReturnNotice({
      tone: 'pending',
      message:
        'Confirming your ₹99 Opportunity Activation payment…',
    });

    const completeActivation =
      async () => {
        const maxAttempts = 8;

        for (
          let attempt = 0;
          attempt < maxAttempts;
          attempt += 1
        ) {
          try {
            await startOpportunity({
              match_id:
                returnedMatchId,
              startup_id:
                returnedStartupId,
              investor_id:
                returnedInvestorId,
              direction:
                returnedDirection,
            });

            if (!active) return;

            await queryClient.invalidateQueries({
              queryKey: [
                'opportunities',
              ],
            });

            await queryClient.invalidateQueries({
              queryKey: [
                'investorMatches',
              ],
            });

            setReturnNotice({
              tone: 'success',
              message:
                'Opportunity Started. TD Venture will now coordinate investor outreach.',
            });

            navigate(
              '/discover/investors',
              {
                replace: true,
              }
            );

            return;
          } catch (error) {
            if (!active) return;

            const message =
              error instanceof Error
                ? error.message
                : (
                  'Opportunity Activation '
                  + 'could not be completed.'
                );

            if (
              paymentRequiredMessage(
                message
              ) &&
              attempt <
                maxAttempts - 1
            ) {
              await new Promise<void>(
                (resolve) => {
                  window.setTimeout(
                    resolve,
                    1500
                  );
                }
              );

              continue;
            }

            setReturnNotice({
              tone: 'error',
              message:
                paymentRequiredMessage(
                  message
                )
                  ? (
                    'Your payment is still being confirmed. '
                    + 'Refresh this page in a few seconds. '
                    + 'A confirmed payment will not be charged again.'
                  )
                  : message,
            });

            return;
          }
        }
      };

    void completeActivation();

    return () => {
      active = false;
    };
  }, [
    returnedActivation,
    returnedMatchId,
    returnedStartupId,
    returnedInvestorId,
    returnedDirection,
    navigate,
    queryClient,
  ]);

  const createDeal = useMutation({
    mutationFn: async (
      match: any
    ) => {
      const payload = {
        match_id:
          match.id,
        startup_id:
          match.startup_id,
        investor_id:
          match.investor_id,
        direction:
          'startup_to_investor',
      };

      try {
        const result =
          await startOpportunity(
            payload
          );

        return {
          action:
            'opportunity' as const,
          result,
        };
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : '';

        if (
          !paymentRequiredMessage(
            message
          )
        ) {
          throw error;
        }

        await startOpportunityActivationCheckout(
          payload,
          {
            returnPath:
              '/discover/investors',
          }
        );

        return {
          action:
            'checkout' as const,
        };
      }
    },

    onMutate: () => {
      setDealError('');
      setDealCreated(false);
    },

    onSuccess: async (
      result
    ) => {
      if (
        result.action ===
        'checkout'
      ) {
        return;
      }

      await queryClient.invalidateQueries({
        queryKey: [
          'opportunities',
        ],
      });

      setDealCreated(true);
      setDealError('');
    },

    onError: (
      error: unknown
    ) => {
      const message =
        error instanceof Error
          ? error.message
          : (
            'Unable to start this Opportunity. '
            + 'Please try again.'
          );

      setDealError(message);
    },
  });

  const parseTicket = (
    value: string
  ): number | null => {
    const normalized =
      value
        .trim()
        .toLowerCase()
        .replace(/[$,\s]/g, '');

    if (!normalized) {
      return null;
    }

    let multiplier = 1;
    let numberPart =
      normalized;

    if (
      normalized.endsWith('k')
    ) {
      multiplier = 1000;
      numberPart =
        normalized.slice(0, -1);
    } else if (
      normalized.endsWith('m')
    ) {
      multiplier = 1000000;
      numberPart =
        normalized.slice(0, -1);
    }

    const amount =
      Number(numberPart);

    if (
      !Number.isFinite(amount)
    ) {
      return null;
    }

    return amount * multiplier;
  };

  const stageOptions =
    useMemo(() => {
      const values =
        new Set<string>();

      data.forEach(
        (match: any) => {
          const raw =
            match
              ?.investor_mandate
              ?.scope
              ?.stage ||
            match?.stage ||
            '';

          String(raw)
            .split(',')
            .map(
              (value) =>
                value.trim()
            )
            .filter(Boolean)
            .forEach(
              (value) =>
                values.add(value)
            );
        }
      );

      return Array
        .from(values)
        .sort(
          (a, b) =>
            a.localeCompare(b)
        );
    }, [data]);

  const matches =
    useMemo(() => {
      const sectorNeedle =
        sectorFilter
          .trim()
          .toLowerCase();

      const locationNeedle =
        locationFilter
          .trim()
          .toLowerCase();

      const ticketTarget =
        parseTicket(
          ticketFilter
        );

      return data
        .filter(
          (m: any) => {
            const mandate =
              m.investor_mandate ||
              {};

            const scope =
              mandate.scope || {};

            const score =
              Number(
                m.match_score || 0
              );

            if (
              score < minFit
            ) {
              return false;
            }

            const sectorText =
              String(
                scope.sector ||
                m.sector ||
                ''
              ).toLowerCase();

            if (
              sectorNeedle &&
              !sectorText.includes(
                sectorNeedle
              )
            ) {
              return false;
            }

            const stageText =
              String(
                scope.stage ||
                m.stage ||
                ''
              ).toLowerCase();

            if (
              stageFilter &&
              !stageText.includes(
                stageFilter
                  .toLowerCase()
              )
            ) {
              return false;
            }

            const locationText =
              [
                scope.geography,
                m.geography,
                m.city,
                m.country,
              ]
                .filter(Boolean)
                .join(' ')
                .toLowerCase();

            if (
              locationNeedle &&
              !locationText.includes(
                locationNeedle
              )
            ) {
              return false;
            }

            if (
              ticketFilter.trim()
            ) {
              if (
                ticketTarget === null
              ) {
                return false;
              }

              const min =
                Number(
                  scope
                    .ticket_min_usd
                );

              const max =
                Number(
                  scope
                    .ticket_max_usd
                );

              const hasMin =
                Number.isFinite(min);

              const hasMax =
                Number.isFinite(max);

              if (
                !hasMin &&
                !hasMax
              ) {
                return false;
              }

              if (
                hasMin &&
                ticketTarget < min
              ) {
                return false;
              }

              if (
                hasMax &&
                ticketTarget > max
              ) {
                return false;
              }
            }

            return true;
          }
        )
        .sort(
          (
            a: any,
            b: any
          ) =>
            Number(
              b.match_score || 0
            ) -
            Number(
              a.match_score || 0
            )
        );
    }, [
      data,
      sectorFilter,
      stageFilter,
      locationFilter,
      ticketFilter,
      minFit,
    ]);

  const tierStyle = (
    tierValue: string
  ) => {
    if (
      tierValue === 'Gold'
    ) {
      return (
        'text-yellow-300 '
        + 'border-yellow-400/70'
      );
    }

    if (
      tierValue === 'Silver'
    ) {
      return (
        'text-blue-300 '
        + 'border-blue-400/70'
      );
    }

    return (
      'text-orange-300 '
      + 'border-orange-400/70'
    );
  };

  const alignmentLabel = (
    state?: string
  ) => {
    if (
      state === 'aligned'
    ) {
      return 'Aligned';
    }

    if (
      state ===
      'outside_mandate'
    ) {
      return 'Outside';
    }

    return 'Awaiting';
  };

  const alignmentStyle = (
    state?: string
  ) => {
    if (
      state === 'aligned'
    ) {
      return (
        'border-emerald-500/50 '
        + 'bg-emerald-500/10 '
        + 'text-emerald-300'
      );
    }

    if (
      state ===
      'outside_mandate'
    ) {
      return (
        'border-amber-500/50 '
        + 'bg-amber-500/10 '
        + 'text-amber-300'
      );
    }

    return (
      'border-slate-700 '
      + 'bg-slate-900/70 '
      + 'text-slate-400'
    );
  };

  const formatMoney = (
    value: unknown
  ) => {
    const amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return 'Awaiting';
    }

    return new Intl.NumberFormat(
      'en-US',
      {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 0,
      }
    ).format(amount);
  };

  const compactMoney = (
    value: unknown
  ) => {
    const amount =
      Number(value);

    if (
      !Number.isFinite(amount)
    ) {
      return 'Awaiting';
    }

    if (
      Math.abs(amount) >=
      1000000
    ) {
      return (
        '$'
        + (
          amount /
          1000000
        ).toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 1,
          }
        )
        + 'M'
      );
    }

    if (
      Math.abs(amount) >=
      1000
    ) {
      return (
        '$'
        + (
          amount /
          1000
        ).toLocaleString(
          'en-US',
          {
            maximumFractionDigits: 0,
          }
        )
        + 'K'
      );
    }

    return (
      '$'
      + amount.toLocaleString(
        'en-US',
        {
          maximumFractionDigits: 0,
        }
      )
    );
  };

  const mandateValue = (
    value: unknown
  ) => {
    const rendered =
      value === null ||
      value === undefined
        ? ''
        : String(value).trim();

    return (
      rendered ||
      'Awaiting investor input'
    );
  };

  const compactText = (
    value: unknown,
    max = 170
  ) => {
    const text =
      mandateValue(value);

    if (
      text.length <= max
    ) {
      return text;
    }

    return (
      text.slice(
        0,
        max - 1
      ).trimEnd()
      + '…'
    );
  };

  const investorSummary = (
    m: any
  ) => {
    const mandate =
      m.investor_mandate ||
      {};

    const scope =
      mandate.scope || {};

    const alignment =
      mandate.alignment || {};

    const evidence =
      mandate
        .evidence_record ||
      {};

    const parts: string[] =
      [];

    parts.push(
      `${Number(
        m.match_score || 0
      )}% Match Fit`
    );

    if (
      alignment
        .sector
        ?.state ===
      'aligned'
    ) {
      parts.push(
        'Sector aligned'
      );
    }

    if (
      alignment
        .stage
        ?.state ===
      'aligned'
    ) {
      parts.push(
        'Stage aligned'
      );
    }

    if (
      alignment
        .geography
        ?.state ===
      'aligned'
    ) {
      parts.push(
        'Location aligned'
      );
    }

    if (
      scope.ticket_min_usd !==
        null &&
      scope.ticket_min_usd !==
        undefined &&
      scope.ticket_max_usd !==
        null &&
      scope.ticket_max_usd !==
        undefined
    ) {
      parts.push(
        `${compactMoney(
          scope.ticket_min_usd
        )}–${compactMoney(
          scope.ticket_max_usd
        )} tickets`
      );
    }

    if (
      typeof
        evidence
          .completion_count ===
      'number'
    ) {
      parts.push(
        `${evidence.completion_count}/12 investor evidence`
      );
    } else {
      parts.push(
        'Detailed lens awaiting'
      );
    }

    return parts.join(
      ' · '
    );
  };

  const resetFilters = () => {
    setTier('');
    setSectorFilter('');
    setStageFilter('');
    setLocationFilter('');
    setTicketFilter('');
    setMinFit(0);
  };

  return (
    <div className="p-6 text-white">

      {returnNotice && (
        <div
          className={[
            'mb-5 rounded-lg border p-4',
            returnNotice.tone ===
              'success'
              ? (
                'border-emerald-500/60 '
                + 'bg-emerald-500/10'
              )
              : returnNotice.tone ===
                  'error'
                ? (
                  'border-red-500/60 '
                  + 'bg-red-500/10'
                )
                : (
                  'border-cyan-500/60 '
                  + 'bg-cyan-500/10'
                ),
          ].join(' ')}
        >
          <div
            className={
              returnNotice.tone ===
              'success'
                ? 'text-emerald-300'
                : returnNotice.tone ===
                    'error'
                  ? 'text-red-300'
                  : 'text-cyan-300'
            }
          >
            {returnNotice.message}
          </div>
        </div>
      )}

      <div className="mb-5 border border-lime-500/60 bg-black/75 rounded-lg p-5">
        <div className="text-xs uppercase tracking-[0.35em] text-lime-300 mb-2">
          Founder Matches
        </div>

        <h1 className="text-3xl font-semibold mb-2">
          Matches
        </h1>

        <p className="text-sm text-gray-400 max-w-4xl">
          Match Fit remains the canonical stored Match score.
          Investor mandate and decision evidence explain why an
          investor may be relevant without changing your startup
          assessment.
        </p>

        <div className="mt-3 text-sm text-lime-300">
          Match Fit → Investor Lens → Start Opportunity →
          Secure Checkout → TD Venture Outreach
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-lime-500/50 bg-black/75 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-[0.25em] text-lime-300">
              Match Filters
            </div>

            <div className="mt-1 text-xs text-gray-500">
              Filter the investor pool without changing any Match score.
            </div>
          </div>

          <button
            type="button"
            className="rounded-md border border-lime-500/50 px-4 py-2 text-xs font-semibold text-lime-300"
            onClick={resetFilters}
          >
            Clear Filters
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">

          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-[0.16em]">
              Sector
            </span>

            <input
              value={sectorFilter}
              onChange={(event) =>
                setSectorFilter(
                  event.target.value
                )
              }
              placeholder="Fintech"
              className="w-full rounded-md border border-slate-700 bg-black p-3 text-sm text-white outline-none focus:border-lime-400"
            />
          </label>

          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-[0.16em]">
              Stage
            </span>

            <select
              value={stageFilter}
              onChange={(event) =>
                setStageFilter(
                  event.target.value
                )
              }
              className="w-full rounded-md border border-slate-700 bg-black p-3 text-sm text-white outline-none focus:border-lime-400"
            >
              <option value="">
                All stages
              </option>

              {stageOptions.map(
                (stage) => (
                  <option
                    key={stage}
                    value={stage}
                  >
                    {stage}
                  </option>
                )
              )}
            </select>
          </label>

          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-[0.16em]">
              Location
            </span>

            <input
              value={locationFilter}
              onChange={(event) =>
                setLocationFilter(
                  event.target.value
                )
              }
              placeholder="India / Global"
              className="w-full rounded-md border border-slate-700 bg-black p-3 text-sm text-white outline-none focus:border-lime-400"
            />
          </label>

          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-[0.16em]">
              Ticket Size
            </span>

            <input
              value={ticketFilter}
              onChange={(event) =>
                setTicketFilter(
                  event.target.value
                )
              }
              placeholder="250k"
              className="w-full rounded-md border border-slate-700 bg-black p-3 text-sm text-white outline-none focus:border-lime-400"
            />
          </label>

          <label className="text-xs text-gray-400">
            <span className="mb-1 block uppercase tracking-[0.16em]">
              Match Tier
            </span>

            <select
              value={tier}
              onChange={(event) =>
                setTier(
                  event.target.value
                )
              }
              className="w-full rounded-md border border-slate-700 bg-black p-3 text-sm text-white outline-none focus:border-lime-400"
            >
              <option value="">
                All tiers
              </option>
              <option value="Gold">
                Gold
              </option>
              <option value="Silver">
                Silver
              </option>
              <option value="Bronze">
                Bronze
              </option>
            </select>
          </label>

          <label className="text-xs text-gray-400">
            <span className="mb-1 flex items-center justify-between uppercase tracking-[0.16em]">
              <span>Match Fit</span>
              <span className="text-lime-300">
                ≥ {minFit}%
              </span>
            </span>

            <div className="rounded-md border border-slate-700 bg-black px-3 py-[13px]">
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={minFit}
                onChange={(event) =>
                  setMinFit(
                    Number(
                      event.target.value
                    )
                  )
                }
                className="w-full accent-lime-400"
              />
            </div>
          </label>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-lime-300">
          {isLoading
            ? 'Loading investor Matches…'
            : `${matches.length} investor Matches`}
        </div>

        <div className="text-xs text-gray-500">
          Payment never changes Match Fit, qualification or startup score.
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">

        {matches.map(
          (m: any) => {
            const mandate =
              m.investor_mandate ||
              {};

            const scope =
              mandate.scope || {};

            const alignment =
              mandate.alignment ||
              {};

            const evidence =
              mandate
                .evidence_record ||
              {};

            const evidenceCount =
              typeof
                evidence
                  .completion_count ===
              'number'
                ? (
                  `${evidence.completion_count}/12`
                )
                : 'Awaiting';

            return (
              <div
                key={m.id}
                className={`border ${tierStyle(
                  m.tier
                )} bg-black/80 rounded-xl p-4`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={`text-xs uppercase tracking-[0.22em] ${
                        tierStyle(
                          m.tier
                        ).split(' ')[0]
                      }`}
                    >
                      {m.tier} Match
                    </div>

                    <div className="mt-1 text-[11px] text-gray-500">
                      Protected investor ·{' '}
                      {m.investor_category ||
                        m.investor_tier ||
                        'Capital Partner'}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-gray-500">
                      Match Fit
                    </div>

                    <div className="text-xl font-semibold text-lime-300">
                      {m.match_score}%
                    </div>
                  </div>
                </div>

                <div className="mt-3 h-2 rounded-full bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-lime-400"
                    style={{
                      width:
                        `${Math.min(
                          100,
                          Math.max(
                            0,
                            Number(
                              m.match_score || 0
                            )
                          )
                        )}%`,
                    }}
                  />
                </div>

                <div className="mt-3 rounded-lg border border-lime-500/25 bg-lime-400/[0.04] p-3">
                  <div className="text-[9px] uppercase tracking-[0.18em] text-lime-300">
                    Investor Summary
                  </div>

                  <p className="mt-1 text-xs leading-5 text-gray-300">
                    {investorSummary(m)}
                  </p>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2">

                  {[
                    [
                      'Sector',
                      alignment.sector,
                    ],
                    [
                      'Stage',
                      alignment.stage,
                    ],
                    [
                      'Location',
                      alignment.geography,
                    ],
                  ].map(
                    (
                      [label, item]: any
                    ) => (
                      <div
                        key={label}
                        className="rounded-lg border border-slate-800 bg-slate-950/70 p-3"
                      >
                        <div className="text-[9px] uppercase tracking-[0.16em] text-gray-500">
                          {label}
                        </div>

                        <div className="mt-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-1 text-[9px] font-semibold ${alignmentStyle(
                              item?.state
                            )}`}
                          >
                            {alignmentLabel(
                              item?.state
                            )}
                          </span>
                        </div>
                      </div>
                    )
                  )}

                  <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-cyan-300">
                      Ticket Size
                    </div>

                    <div className="mt-2 text-xs text-gray-200">
                      {scope.ticket_min_usd !==
                        null &&
                      scope.ticket_min_usd !==
                        undefined
                        ? compactMoney(
                          scope.ticket_min_usd
                        )
                        : 'Awaiting'}

                      {' — '}

                      {scope.ticket_max_usd !==
                        null &&
                      scope.ticket_max_usd !==
                        undefined
                        ? compactMoney(
                          scope.ticket_max_usd
                        )
                        : 'Awaiting'}
                    </div>
                  </div>
                </div>

                <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-[9px] uppercase tracking-[0.16em] text-violet-300">
                      Investor Lens
                    </div>

                    <div className="text-[10px] text-gray-500">
                      Evidence {evidenceCount}
                    </div>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-gray-300">
                    {compactText(
                      mandate.investment_thesis
                    )}
                  </p>
                </div>

                {Array.isArray(
                  m.reasons
                ) &&
                  m.reasons.length >
                    0 && (
                    <div className="mt-3 border-t border-slate-800 pt-3">
                      <div className="text-[9px] uppercase tracking-[0.18em] text-lime-300">
                        Why Matched
                      </div>

                      <div className="mt-2 space-y-1 text-[11px] text-gray-400">
                        {m.reasons
                          .slice(0, 2)
                          .map(
                            (
                              reason: string,
                              index: number
                            ) => (
                              <div
                                key={
                                  `${m.id}-reason-${index}`
                                }
                              >
                                ✓ {reason}
                              </div>
                            )
                          )}
                      </div>
                    </div>
                  )}

                <div className="mt-4 grid grid-cols-2 gap-2">

                  <button
                    type="button"
                    className="rounded-md border border-cyan-500/40 bg-cyan-500/5 px-3 py-2 text-xs font-semibold text-cyan-300"
                    onClick={() =>
                      setSelectedLens(m)
                    }
                  >
                    View Investor Lens
                  </button>

                  <button
                    type="button"
                    className="rounded-md bg-lime-400 px-3 py-2 text-xs font-semibold text-black"
                    onClick={() => {
                      setDealCreated(false);
                      setDealError('');
                      setSelectedMatch(m);
                    }}
                  >
                    Start Opportunity — ₹99 + GST
                  </button>
                </div>
              </div>
            );
          }
        )}
      </div>

      {!isLoading &&
        matches.length === 0 && (
          <div className="mt-6 rounded-lg border border-slate-800 bg-black/70 p-8 text-center">
            <div className="text-lg font-semibold">
              No Matches meet these filters
            </div>

            <p className="mt-2 text-sm text-gray-500">
              Clear or widen the filters. Your stored Match scores remain unchanged.
            </p>
          </div>
        )}

      {selectedLens && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="max-h-[88vh] w-full max-w-5xl overflow-y-auto rounded-xl border border-cyan-500/50 bg-black p-6 shadow-[0_0_40px_rgba(34,211,238,0.12)]">

            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-[0.28em] text-cyan-300">
                  Protected Investor
                </div>

                <h2 className="mt-2 text-2xl font-semibold">
                  Investor Decision Lens
                </h2>

                <p className="mt-2 max-w-3xl text-sm text-gray-400">
                  Investor-supplied preferences and expectations explain relevance.
                  They do not change Match Fit or your startup assessment.
                </p>
              </div>

              <button
                type="button"
                className="text-gray-400 hover:text-white"
                onClick={() =>
                  setSelectedLens(null)
                }
              >
                Close
              </button>
            </div>

            <div className="mt-5 rounded-lg border border-lime-500/30 bg-lime-500/[0.04] p-4">
              <div className="text-xs uppercase tracking-[0.2em] text-lime-300">
                Investment Thesis
              </div>

              <p className="mt-2 text-sm leading-6 text-gray-300">
                {mandateValue(
                  selectedLens
                    ?.investor_mandate
                    ?.investment_thesis
                )}
              </p>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-cyan-300">
                  Founder Lens
                </div>

                <div className="mt-3 space-y-4 text-sm">
                  <div>
                    <div className="text-gray-500">
                      Qualities that create conviction
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.founder_lens
                          ?.founder_qualities
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Pursuit despite visible risk
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.founder_lens
                          ?.pursuit_criteria
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-violet-300">
                  Market & Moat
                </div>

                <div className="mt-3 space-y-4 text-sm">
                  <div>
                    <div className="text-gray-500">
                      Attractive market characteristics
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.market_moat_lens
                          ?.market_opportunity
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Defensibility expected
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.market_moat_lens
                          ?.moat_expectation
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Market risks watched
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.market_moat_lens
                          ?.market_risks
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-amber-300">
                  Evidence Expected
                </div>

                <div className="mt-3 space-y-4 text-sm">
                  <div>
                    <div className="text-gray-500">
                      Traction
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.evidence_expected
                          ?.traction_expectation
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Economics
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.evidence_expected
                          ?.economics_expectation
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Evidence before diligence
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.evidence_expected
                          ?.evidence_required
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-4">
                <div className="text-xs uppercase tracking-[0.2em] text-emerald-300">
                  Capital & Decision Style
                </div>

                <div className="mt-3 space-y-4 text-sm">
                  <div>
                    <div className="text-gray-500">
                      Capital strategy
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.capital_decision_style
                          ?.capital_strategy
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Capital outcomes
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.capital_decision_style
                          ?.capital_outcomes
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="text-gray-500">
                      Decision & engagement
                    </div>
                    <div className="mt-1 leading-6 text-gray-300">
                      {mandateValue(
                        selectedLens
                          ?.investor_mandate
                          ?.capital_decision_style
                          ?.decision_engagement
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4">
          <div className="w-full max-w-xl rounded-xl border border-lime-500/70 bg-black p-6 shadow-[0_0_35px_rgba(163,255,18,0.20)]">

            <div className="text-xs uppercase tracking-[0.32em] text-lime-300">
              Start Opportunity
            </div>

            <h2 className="mt-2 text-2xl font-semibold">
              Activate this Match
            </h2>

            <p className="mt-2 text-sm leading-6 text-gray-400">
              TD Venture will initiate and track investor outreach.
              Investor identity and contact information remain protected.
            </p>

            <div className="mt-5 rounded-lg border border-lime-500/40 bg-lime-400/5 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Opportunity Activation
                  </div>

                  <div className="mt-1 text-xl font-semibold text-lime-300">
                    ₹99 + GST
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs uppercase tracking-[0.18em] text-gray-500">
                    Match Fit
                  </div>

                  <div className="mt-1 text-xl font-semibold text-lime-300">
                    {selectedMatch.match_score}%
                  </div>
                </div>
              </div>

              <div className="mt-4 text-xs leading-5 text-gray-400">
                Payment activates this stored Match as a Deal Desk Opportunity.
                It does not improve the Match score, qualification, evidence,
                risk assessment or reveal private investor contact details.
              </div>
            </div>

            <div className="mt-4 rounded-lg border border-cyan-500/30 bg-cyan-500/[0.05] p-4">
              <div className="font-semibold text-cyan-300">
                What happens next
              </div>

              <div className="mt-2 text-sm leading-6 text-gray-400">
                Proceed to secure checkout. After successful payment,
                you return directly to Matches and TD Venture completes
                the Opportunity activation automatically.
              </div>
            </div>

            {dealError && (
              <div className="mt-4 rounded-lg border border-red-500/50 bg-red-500/10 p-4">
                <div className="font-semibold text-red-300">
                  Opportunity could not be started
                </div>

                <div className="mt-1 text-sm text-gray-300">
                  {dealError}
                </div>
              </div>
            )}

            {dealCreated && (
              <div className="mt-4 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-4">
                <div className="font-semibold text-emerald-300">
                  Opportunity Started
                </div>

                <div className="mt-1 text-sm text-gray-400">
                  TD Venture will manage and track investor outreach.
                </div>
              </div>
            )}

            <div className="mt-6 flex items-center justify-between gap-4">
              <button
                type="button"
                className="text-sm text-gray-400 hover:text-white"
                onClick={() =>
                  setSelectedMatch(null)
                }
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={
                  createDeal.isPending ||
                  dealCreated
                }
                className="rounded-md bg-lime-400 px-5 py-3 text-sm font-semibold text-black disabled:opacity-60"
                onClick={() =>
                  createDeal.mutate(
                    selectedMatch
                  )
                }
              >
                {dealCreated
                  ? 'Opportunity Started'
                  : createDeal.isPending
                    ? 'Opening Secure Checkout…'
                    : 'Proceed to Secure Checkout'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
