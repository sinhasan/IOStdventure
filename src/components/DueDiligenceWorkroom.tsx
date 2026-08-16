import {
  useEffect,
  useMemo,
  useState,
} from 'react';

type DDItem = {
  id: string;
  item_key: string;
  label: string;
  category: string;
  status: string;
  td_notes?: string | null;
  source?: string | null;
  requested_at?: string | null;
  received_at?: string | null;
  verified_at?: string | null;
  waived_at?: string | null;
  issue_at?: string | null;
};

type DDSubmission = {
  id: string;
  opportunity_id: string;
  item_key: string;
  filename?: string | null;
  content_type?: string | null;
  size_bytes?: number | null;
  sha256?: string | null;
  founder_note?: string | null;
  version: number;
  is_current: boolean;
  created_at?: string | null;
};

type DDSummary = {
  total: number;
  verified: number;
  waived: number;
  received: number;
  requested: number;
  issues: number;
  completed: number;
  progress_percent: number;
  ready_for_decision: boolean;
};

type Props = {
  opportunityId?: string | null;
  opportunityStatus?: string | null;
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
      JSON.parse(window.atob(padded))?.role || ''
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

function prettyStatus(value: string): string {
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function statusClass(status: string): string {
  if (status === 'verified') {
    return 'border-[#D4FF00]/35 bg-[#D4FF00]/10 text-[#D4FF00]';
  }

  if (status === 'waived') {
    return 'border-blue-400/30 bg-blue-400/10 text-blue-300';
  }

  if (status === 'received') {
    return 'border-cyan-400/30 bg-cyan-400/10 text-cyan-300';
  }

  if (status === 'issue') {
    return 'border-red-400/30 bg-red-400/10 text-red-300';
  }

  if (status === 'requested') {
    return 'border-amber-400/30 bg-amber-400/10 text-amber-300';
  }

  return 'border-gray-700 bg-black/30 text-gray-400';
}

export function DueDiligenceWorkroom({
  opportunityId,
  opportunityStatus,
}: Props) {
  const role = useMemo(
    () => readRole(),
    []
  );

  const isAdmin = role === 'admin';

  const isFounder =
    role === 'startup' ||
    role === 'founder';

  const relevant = [
    'due_diligence',
    'funded',
    'closed',
  ].includes(
    String(opportunityStatus || '')
  );

  const [items, setItems] =
    useState<DDItem[]>([]);

  const [summary, setSummary] =
    useState<DDSummary | null>(null);

  const [editable, setEditable] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [busyKey, setBusyKey] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  const [notes, setNotes] =
    useState<Record<string, string>>({});

  const [newLabel, setNewLabel] =
    useState('');

  const [newCategory, setNewCategory] =
    useState('Other');

  const [submissions, setSubmissions] =
    useState<Record<string, DDSubmission>>({});

  const [founderNotes, setFounderNotes] =
    useState<Record<string, string>>({});

  const [founderFiles, setFounderFiles] =
    useState<Record<string, File | null>>({});

  const [submissionBusy, setSubmissionBusy] =
    useState<string | null>(null);

  const loadSubmissions = async () => {
    if (
      !opportunityId ||
      (!isAdmin && !isFounder)
    ) {
      setSubmissions({});
      return;
    }

    const token = getToken();

    if (!token) return;

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence/submissions`,
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

      const next: Record<string, DDSubmission> = {};

      for (
        const submission of
        Array.isArray(data?.submissions)
          ? data.submissions
          : []
      ) {
        if (
          submission?.item_key
        ) {
          next[
            String(submission.item_key)
          ] = submission;
        }
      }

      setSubmissions(next);
    } catch (error) {
      console.warn(
        'Could not load private DD submissions',
        error
      );
    }
  };

  const load = async () => {
    if (!opportunityId || !relevant) {
      return;
    }

    const token = getToken();

    if (!token) return;

    setLoading(true);
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence`,
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

      const loadedItems: DDItem[] =
        Array.isArray(data?.items)
          ? data.items
          : [];

      setItems(loadedItems);
      setSummary(data?.summary || null);
      setEditable(Boolean(data?.editable));

      const nextNotes: Record<string, string> = {};

      for (const item of loadedItems) {
        nextNotes[item.item_key] =
          String(item.td_notes || '');
      }

      setNotes(nextNotes);

      if (
        isAdmin ||
        isFounder
      ) {
        await loadSubmissions();
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not load Due Diligence.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [
    opportunityId,
    opportunityStatus,
  ]);

  if (!opportunityId || !relevant) {
    return null;
  }

  const updateItem = async (
    item: DDItem,
    status: string
  ) => {
    if (!editable) return;

    const token = getToken();

    if (!token) {
      setMessage(
        'TD Venture admin session unavailable.'
      );
      return;
    }

    setBusyKey(item.item_key);
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence/items/${encodeURIComponent(
          item.item_key
        )}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            status,
            td_notes:
              notes[item.item_key]?.trim() || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not update DD item.'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const saveNotes = async (
    item: DDItem
  ) => {
    await updateItem(
      item,
      item.status
    );
  };

  const addCustomItem = async () => {
    if (
      !editable ||
      !newLabel.trim()
    ) {
      return;
    }

    const token = getToken();

    if (!token) return;

    setBusyKey('new-item');
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence/items`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            label: newLabel.trim(),
            category:
              newCategory.trim() || 'Other',
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      setNewLabel('');
      setNewCategory('Other');

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not add DD item.'
      );
    } finally {
      setBusyKey(null);
    }
  };

  const fileToBase64 = (
    file: File
  ): Promise<string> =>
    new Promise(
      (resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => {
          const result = String(
            reader.result || ''
          );

          const comma =
            result.indexOf(',');

          resolve(
            comma >= 0
              ? result.slice(comma + 1)
              : result
          );
        };

        reader.onerror = () =>
          reject(
            new Error(
              'Could not read the selected file.'
            )
          );

        reader.readAsDataURL(file);
      }
    );

  const submitFounderEvidence = async (
    item: DDItem
  ) => {
    if (
      !isFounder ||
      !opportunityId
    ) {
      return;
    }

    const file =
      founderFiles[item.item_key]
      || null;

    const note = String(
      founderNotes[item.item_key]
      || ''
    ).trim();

    if (!file && !note) {
      setMessage(
        'Attach a file or enter a founder response.'
      );
      return;
    }

    if (
      file &&
      file.size > 10 * 1024 * 1024
    ) {
      setMessage(
        'DD files are limited to 10 MB.'
      );
      return;
    }

    const token = getToken();

    if (!token) {
      setMessage(
        'Founder session unavailable.'
      );
      return;
    }

    setSubmissionBusy(
      item.item_key
    );
    setMessage('');

    try {
      const fileBase64 =
        file
          ? await fileToBase64(file)
          : '';

      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence/items/${encodeURIComponent(
          item.item_key
        )}/submission`,
        {
          method: 'PUT',
          headers: {
            Authorization:
              `Bearer ${token}`,
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            filename:
              file?.name || null,
            content_type:
              file?.type || null,
            file_base64:
              fileBase64 || null,
            note:
              note || null,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      setFounderFiles(
        (current) => ({
          ...current,
          [item.item_key]:
            null,
        })
      );

      setFounderNotes(
        (current) => ({
          ...current,
          [item.item_key]:
            '',
        })
      );

      setMessage(
        'Due Diligence evidence submitted privately to TD Venture.'
      );

      await load();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : (
              'Could not submit '
              + 'Due Diligence evidence.'
            )
      );
    } finally {
      setSubmissionBusy(null);
    }
  };

  const downloadSubmission = async (
    item: DDItem
  ) => {
    if (
      !opportunityId ||
      (!isAdmin && !isFounder)
    ) {
      return;
    }

    const token = getToken();

    if (!token) return;

    setSubmissionBusy(
      item.item_key
    );
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/due-diligence/items/${encodeURIComponent(
          item.item_key
        )}/submission/download`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      const blob =
        await response.blob();

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement('a');

      link.href = url;

      link.download =
        submissions[
          item.item_key
        ]?.filename ||
        'dd-evidence';

      document.body.appendChild(
        link
      );

      link.click();
      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : (
              'Could not download '
              + 'Due Diligence evidence.'
            )
      );
    } finally {
      setSubmissionBusy(null);
    }
  };

  const grouped = items.reduce<
    Record<string, DDItem[]>
  >((acc, item) => {
    const category =
      item.category || 'Other';

    if (!acc[category]) {
      acc[category] = [];
    }

    acc[category].push(item);

    return acc;
  }, {});

  return (
    <div className="mt-4 rounded-xl border border-[#D4FF00]/20 bg-black/25 p-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#D4FF00]">
            Due Diligence Workroom
          </div>

          <div className="mt-1 text-sm font-semibold text-white">
            Investment diligence checklist
          </div>

          <div className="mt-1 max-w-2xl text-xs leading-5 text-gray-500">
            Gate 0 evidence carries forward as received,
            not as investment diligence verified.
            TD Venture controls verification and exceptions.
          </div>
        </div>

        {summary && (
          <div className="min-w-[150px] rounded-lg border border-gray-800 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-wider text-gray-500">
              DD Progress
            </div>

            <div className="mt-1 text-2xl font-bold text-white">
              {summary.progress_percent}%
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
              <div
                className="h-full bg-[#D4FF00]"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(
                      0,
                      summary.progress_percent
                    )
                  )}%`,
                }}
              />
            </div>

            <div className="mt-2 text-[11px] text-gray-500">
              {summary.completed}/{summary.total}{' '}
              verified or waived
            </div>
          </div>
        )}
      </div>

      {summary && (
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">
          <div className="rounded-md border border-gray-800 p-2">
            <div className="text-[10px] text-gray-500">
              Verified
            </div>
            <div className="mt-1 text-sm font-bold text-[#D4FF00]">
              {summary.verified}
            </div>
          </div>

          <div className="rounded-md border border-gray-800 p-2">
            <div className="text-[10px] text-gray-500">
              Received
            </div>
            <div className="mt-1 text-sm font-bold text-cyan-300">
              {summary.received}
            </div>
          </div>

          <div className="rounded-md border border-gray-800 p-2">
            <div className="text-[10px] text-gray-500">
              Requested
            </div>
            <div className="mt-1 text-sm font-bold text-amber-300">
              {summary.requested}
            </div>
          </div>

          <div className="rounded-md border border-gray-800 p-2">
            <div className="text-[10px] text-gray-500">
              Issues
            </div>
            <div className="mt-1 text-sm font-bold text-red-300">
              {summary.issues}
            </div>
          </div>

          <div className="rounded-md border border-gray-800 p-2">
            <div className="text-[10px] text-gray-500">
              Waived
            </div>
            <div className="mt-1 text-sm font-bold text-blue-300">
              {summary.waived}
            </div>
          </div>
        </div>
      )}

      {summary?.ready_for_decision && (
        <div className="mt-4 rounded-lg border border-[#D4FF00]/30 bg-[#D4FF00]/5 px-4 py-3 text-xs font-semibold text-[#D4FF00]">
          Due Diligence checklist complete.
          Investment decision can now be recorded.
        </div>
      )}

      {loading && (
        <div className="mt-4 text-xs text-gray-500">
          Loading Due Diligence…
        </div>
      )}

      {!loading &&
        Object.entries(grouped).map(
          ([category, categoryItems]) => (
            <div
              key={category}
              className="mt-5"
            >
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-500">
                {category}
              </div>

              <div className="space-y-2">
                {categoryItems.map(
                  (item) => (
                    <div
                      key={item.item_key}
                      className="rounded-lg border border-gray-800 bg-black/20 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-white">
                            {item.label}
                          </div>

                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-gray-500">
                            {item.source === 'gate0' && (
                              <span>
                                Carried from Gate 0
                              </span>
                            )}

                            {item.source === 'custom' && (
                              <span>
                                Custom DD request
                              </span>
                            )}
                          </div>
                        </div>

                        <span
                          className={`rounded-md border px-2 py-1 text-[10px] font-semibold ${statusClass(
                            item.status
                          )}`}
                        >
                          {prettyStatus(
                            item.status
                          )}
                        </span>
                      </div>

                      {(isAdmin || isFounder) &&
                        submissions[item.item_key] && (
                          <div className="mt-3 rounded-md border border-cyan-400/20 bg-cyan-400/5 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                              Private DD Submission
                            </div>

                            <div className="mt-2 text-xs text-gray-300">
                              Version{' '}
                              {submissions[item.item_key].version}
                              {submissions[item.item_key].filename
                                ? ` · ${submissions[item.item_key].filename}`
                                : ''}
                            </div>

                            {submissions[item.item_key].size_bytes ? (
                              <div className="mt-1 text-[10px] text-gray-500">
                                {(
                                  Number(
                                    submissions[item.item_key].size_bytes
                                  ) /
                                  1024 /
                                  1024
                                ).toFixed(2)}{' '}
                                MB
                              </div>
                            ) : null}

                            {submissions[item.item_key].founder_note && (
                              <div className="mt-2 whitespace-pre-wrap rounded-md border border-gray-800 bg-black/30 px-3 py-2 text-xs text-gray-300">
                                {
                                  submissions[item.item_key].founder_note
                                }
                              </div>
                            )}

                            {submissions[item.item_key].filename && (
                              <button
                                type="button"
                                disabled={
                                  submissionBusy ===
                                  item.item_key
                                }
                                onClick={() =>
                                  void downloadSubmission(
                                    item
                                  )
                                }
                                className="mt-2 rounded-md border border-cyan-400/30 px-3 py-1.5 text-[10px] font-semibold text-cyan-300 disabled:opacity-40"
                              >
                                Download Evidence
                              </button>
                            )}

                            <div className="mt-2 text-[10px] text-gray-500">
                              Private to founder and TD Venture.
                              Not shared with the investor.
                            </div>
                          </div>
                        )}

                      {isFounder &&
                        opportunityStatus === 'due_diligence' &&
                        (
                          item.status === 'requested' ||
                          item.status === 'issue'
                        ) && (
                          <div className="mt-3 rounded-md border border-[#D4FF00]/20 bg-[#D4FF00]/5 p-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#D4FF00]">
                              Respond to DD Request
                            </div>

                            {item.status === 'issue' && (
                              <div className="mt-2 text-xs text-amber-300">
                                TD Venture has requested revised
                                or additional evidence.
                              </div>
                            )}

                            <textarea
                              value={
                                founderNotes[
                                  item.item_key
                                ] || ''
                              }
                              onChange={(event) =>
                                setFounderNotes(
                                  (current) => ({
                                    ...current,
                                    [item.item_key]:
                                      event.target.value,
                                  })
                                )
                              }
                              placeholder="Founder response or context..."
                              className="mt-3 min-h-[70px] w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-xs text-white"
                            />

                            <input
                              type="file"
                              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.png,.jpg,.jpeg"
                              onChange={(event) =>
                                setFounderFiles(
                                  (current) => ({
                                    ...current,
                                    [item.item_key]:
                                      event.target.files?.[0]
                                      || null,
                                  })
                                )
                              }
                              className="mt-3 block w-full text-xs text-gray-400"
                            />

                            {founderFiles[item.item_key] && (
                              <div className="mt-2 text-[10px] text-gray-500">
                                {
                                  founderFiles[item.item_key]?.name
                                }
                                {' · '}
                                {(
                                  Number(
                                    founderFiles[
                                      item.item_key
                                    ]?.size || 0
                                  ) /
                                  1024 /
                                  1024
                                ).toFixed(2)}
                                {' MB'}
                              </div>
                            )}

                            <button
                              type="button"
                              disabled={
                                submissionBusy ===
                                item.item_key
                              }
                              onClick={() =>
                                void submitFounderEvidence(
                                  item
                                )
                              }
                              className="mt-3 rounded-md bg-[#D4FF00] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
                            >
                              {submissionBusy ===
                              item.item_key
                                ? 'Submitting…'
                                : 'Submit Privately to TD Venture'}
                            </button>

                            <div className="mt-2 text-[10px] leading-4 text-gray-500">
                              Upload only investor-safe business
                              evidence. Do not include passwords,
                              credentials, source code, trade secrets
                              or unnecessary sensitive personal data.
                            </div>
                          </div>
                        )}

                      {editable && (
                        <>
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {[
                              'requested',
                              'received',
                              'verified',
                              'issue',
                              'waived',
                            ].map(
                              (status) => (
                                <button
                                  key={status}
                                  type="button"
                                  disabled={
                                    busyKey ===
                                    item.item_key
                                  }
                                  onClick={() =>
                                    void updateItem(
                                      item,
                                      status
                                    )
                                  }
                                  className="rounded-md border border-gray-700 px-2.5 py-1.5 text-[10px] font-semibold text-gray-300 hover:border-[#D4FF00]/40 hover:text-white disabled:opacity-40"
                                >
                                  {prettyStatus(
                                    status
                                  )}
                                </button>
                              )
                            )}
                          </div>

                          <div className="mt-3 flex gap-2">
                            <input
                              value={
                                notes[
                                  item.item_key
                                ] || ''
                              }
                              onChange={(
                                event
                              ) =>
                                setNotes(
                                  (current) => ({
                                    ...current,
                                    [item.item_key]:
                                      event.target
                                        .value,
                                  })
                                )
                              }
                              placeholder="TD diligence note..."
                              className="min-w-0 flex-1 rounded-md border border-gray-700 bg-black px-3 py-2 text-xs text-white"
                            />

                            <button
                              type="button"
                              disabled={
                                busyKey ===
                                item.item_key
                              }
                              onClick={() =>
                                void saveNotes(
                                  item
                                )
                              }
                              className="rounded-md border border-gray-700 px-3 py-2 text-[10px] font-semibold text-gray-300 disabled:opacity-40"
                            >
                              Save
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )
                )}
              </div>
            </div>
          )
        )}

      {editable && (
        <div className="mt-5 border-t border-gray-800 pt-4">
          <div className="text-xs font-semibold text-white">
            Add diligence item
          </div>

          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-[1fr_180px_auto]">
            <input
              value={newLabel}
              onChange={(event) =>
                setNewLabel(
                  event.target.value
                )
              }
              placeholder="Additional diligence request..."
              className="rounded-md border border-gray-700 bg-black px-3 py-2 text-xs text-white"
            />

            <select
              value={newCategory}
              onChange={(event) =>
                setNewCategory(
                  event.target.value
                )
              }
              className="rounded-md border border-gray-700 bg-black px-3 py-2 text-xs text-white"
            >
              <option>Corporate</option>
              <option>Business</option>
              <option>Financial</option>
              <option>Commercial</option>
              <option>Technology</option>
              <option>Compliance</option>
              <option>Investment</option>
              <option>Team</option>
              <option>Other</option>
            </select>

            <button
              type="button"
              disabled={
                !newLabel.trim() ||
                busyKey === 'new-item'
              }
              onClick={() =>
                void addCustomItem()
              }
              className="rounded-md bg-[#D4FF00] px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {busyKey === 'new-item'
                ? 'Adding…'
                : 'Add Item'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-md border border-gray-800 px-3 py-2 text-xs text-gray-300">
          {message}
        </div>
      )}
    </div>
  );
}
