import { useMemo, useState } from 'react';

type MeetingRecord = {
  status?: string | null;
  scheduled_start_at?: string | null;
  scheduled_end_at?: string | null;
  timezone?: string | null;
  meeting_mode?: string | null;
  meeting_url?: string | null;
  location?: string | null;
  coordination_notes?: string | null;
};

type Props = {
  opportunityId?: string | null;
  meeting?: MeetingRecord | null;
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

    const payload = JSON.parse(
      window.atob(padded)
    );

    return String(payload?.role || '')
      .trim()
      .toLowerCase();
  } catch {
    return '';
  }
}

function browserTimezone(): string {
  const value =
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone || 'Asia/Kolkata';

  return value === 'Asia/Calcutta'
    ? 'Asia/Kolkata'
    : value;
}

function localDateTime(
  value?: string | null
): string {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const offset =
    date.getTimezoneOffset() * 60 * 1000;

  return new Date(
    date.getTime() - offset
  )
    .toISOString()
    .slice(0, 16);
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

export function MeetingLifecycleControls({
  opportunityId,
  meeting,
}: Props) {
  const role = useMemo(
    () => readRole(),
    []
  );

  const [showReschedule, setShowReschedule] =
    useState(false);

  const [startAt, setStartAt] = useState(
    localDateTime(
      meeting?.scheduled_start_at
    )
  );

  const [endAt, setEndAt] = useState(
    localDateTime(
      meeting?.scheduled_end_at
    )
  );

  const [timezone, setTimezone] = useState(
    meeting?.timezone ||
    browserTimezone()
  );

  const [meetingMode, setMeetingMode] =
    useState(
      meeting?.meeting_mode ||
      'video'
    );

  const [meetingUrl, setMeetingUrl] =
    useState(
      meeting?.meeting_url || ''
    );

  const [location, setLocation] =
    useState(
      meeting?.location || ''
    );

  const [notes, setNotes] =
    useState(
      meeting?.coordination_notes || ''
    );

  const [busy, setBusy] =
    useState<string | null>(null);

  const [message, setMessage] =
    useState('');

  if (
    role !== 'admin' ||
    !opportunityId ||
    meeting?.status !== 'scheduled'
  ) {
    return null;
  }

  const request = async (
    action: 'reschedule' | 'cancel' | 'complete',
    body: Record<string, unknown>
  ) => {
    const token = getToken();

    if (!token) {
      setMessage(
        'TD Venture admin session unavailable.'
      );
      return;
    }

    setBusy(action);
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/opportunities/${encodeURIComponent(
          opportunityId
        )}/meeting-coordination/${action}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        }
      );

      if (!response.ok) {
        throw new Error(
          await readError(response)
        );
      }

      setMessage(
        action === 'reschedule'
          ? 'Meeting rescheduled.'
          : action === 'cancel'
          ? 'Meeting cancelled.'
          : 'Meeting completed. Opportunity moved to Due Diligence.'
      );

      window.setTimeout(() => {
        window.location.reload();
      }, 700);

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Meeting action failed.'
      );
    } finally {
      setBusy(null);
    }
  };

  const reschedule = async () => {
    if (!startAt || !endAt) {
      setMessage(
        'Start and end time are required.'
      );
      return;
    }

    const start = new Date(startAt);
    const end = new Date(endAt);

    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime())
    ) {
      setMessage(
        'Enter valid meeting times.'
      );
      return;
    }

    if (end <= start) {
      setMessage(
        'End time must be after start time.'
      );
      return;
    }

    await request(
      'reschedule',
      {
        scheduled_start_at:
          start.toISOString(),
        scheduled_end_at:
          end.toISOString(),
        timezone:
          timezone || browserTimezone(),
        meeting_mode: meetingMode,
        meeting_url:
          meetingMode === 'video'
            ? meetingUrl || null
            : null,
        location:
          meetingMode === 'in_person'
            ? location || null
            : null,
        coordination_notes:
          notes || null,
      }
    );
  };

  const cancel = async () => {
    const reason =
      window.prompt(
        'Reason for cancelling this meeting?'
      );

    if (reason === null) return;

    const confirmed =
      window.confirm(
        'Cancel this scheduled meeting? The opportunity will return to Meeting Requested.'
      );

    if (!confirmed) return;

    await request(
      'cancel',
      {
        reason:
          reason.trim() || null,
      }
    );
  };

  const complete = async () => {
    const confirmed =
      window.confirm(
        'Mark this meeting as completed and move the opportunity to Due Diligence?'
      );

    if (!confirmed) return;

    const completionNotes =
      window.prompt(
        'Optional meeting outcome notes:'
      );

    if (completionNotes === null) {
      return;
    }

    await request(
      'complete',
      {
        notes:
          completionNotes.trim() ||
          null,
      }
    );
  };

  return (
    <div className="mt-4 rounded-lg border border-blue-500/20 bg-black/30 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-blue-300">
            Meeting Lifecycle
          </div>
          <div className="mt-1 text-xs text-gray-500">
            TD Venture controls rescheduling,
            cancellation and completion.
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              setShowReschedule(
                (current) => !current
              )
            }
            className="rounded-md border border-blue-500/30 px-3 py-2 text-xs font-semibold text-blue-300 disabled:opacity-40"
          >
            Reschedule
          </button>

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void cancel()
            }
            className="rounded-md border border-amber-500/30 px-3 py-2 text-xs font-semibold text-amber-300 disabled:opacity-40"
          >
            {busy === 'cancel'
              ? 'Cancelling...'
              : 'Cancel'}
          </button>

          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void complete()
            }
            className="rounded-md bg-[#D4FF00] px-3 py-2 text-xs font-semibold text-black disabled:opacity-40"
          >
            {busy === 'complete'
              ? 'Completing...'
              : 'Mark Completed'}
          </button>
        </div>
      </div>

      {showReschedule && (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 border-t border-gray-800 pt-4">
          <label className="text-xs text-gray-400">
            New start
            <input
              type="datetime-local"
              value={startAt}
              onChange={(event) =>
                setStartAt(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="text-xs text-gray-400">
            New end
            <input
              type="datetime-local"
              value={endAt}
              onChange={(event) =>
                setEndAt(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="text-xs text-gray-400">
            Timezone
            <input
              value={timezone}
              onChange={(event) =>
                setTimezone(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <label className="text-xs text-gray-400">
            Meeting mode
            <select
              value={meetingMode}
              onChange={(event) =>
                setMeetingMode(
                  event.target.value
                )
              }
              className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            >
              <option value="video">
                Video
              </option>
              <option value="phone">
                Phone
              </option>
              <option value="in_person">
                In person
              </option>
            </select>
          </label>

          {meetingMode === 'video' && (
            <label className="md:col-span-2 text-xs text-gray-400">
              Meeting URL
              <input
                value={meetingUrl}
                onChange={(event) =>
                  setMeetingUrl(
                    event.target.value
                  )
                }
                placeholder="https://..."
                className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
              />
            </label>
          )}

          {meetingMode === 'in_person' && (
            <label className="md:col-span-2 text-xs text-gray-400">
              Location
              <input
                value={location}
                onChange={(event) =>
                  setLocation(
                    event.target.value
                  )
                }
                className="mt-1 w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
              />
            </label>
          )}

          <label className="md:col-span-2 text-xs text-gray-400">
            Coordination notes
            <textarea
              value={notes}
              onChange={(event) =>
                setNotes(
                  event.target.value
                )
              }
              className="mt-1 min-h-[70px] w-full rounded-md border border-gray-700 bg-black px-3 py-2 text-white"
            />
          </label>

          <div className="md:col-span-2">
            <button
              type="button"
              disabled={
                Boolean(busy)
              }
              onClick={() =>
                void reschedule()
              }
              className="rounded-md bg-blue-300 px-4 py-2 text-xs font-semibold text-black disabled:opacity-40"
            >
              {busy === 'reschedule'
                ? 'Rescheduling...'
                : 'Confirm Reschedule'}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className="mt-3 text-xs text-gray-300">
          {message}
        </div>
      )}
    </div>
  );
}
