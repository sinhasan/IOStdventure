import {
  useEffect,
  useMemo,
  useState,
} from 'react';

type Props = {
  opportunityId?: string | null;
};

type Gate0Document = {
  document_key: string;
  original_filename: string;
  content_type?: string | null;
  size_bytes: number;
  uploaded_at?: string;
  updated_at?: string;
};

type Manifest = {
  opportunity_id: string;
  opportunity_code?: string | null;
  startup_name?: string;
  sharing?: {
    approved?: boolean;
    approved_at?: string | null;
  };
  gate0?: {
    verified?: number;
    total?: number;
  };
  documents?: Gate0Document[];
};

const API_ROOT =
  'https://' + 'staging.tdventure.vc/api';

const LABELS: Record<string, string> = {
  pitch_deck: 'Investor-safe Pitch Deck',
  business_plan: 'Business Plan',
  three_year_projections:
    '3-Year Financial Projections',
  revenue_evidence: 'Revenue Evidence',
};

function getToken(): string {
  if (typeof window === 'undefined') return '';

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

async function responseDetail(
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

function formatBytes(value: number): string {
  const bytes = Number(value || 0);

  if (bytes >= 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(2)} MB`;
  }

  return `${Math.max(
    1,
    Math.round(bytes / 1024)
  )} KB`;
}

export function Gate0InvestorDocuments({
  opportunityId,
}: Props) {
  const role = useMemo(
    () => readRole(),
    []
  );

  const [manifest, setManifest] =
    useState<Manifest | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [restricted, setRestricted] =
    useState(false);

  const [message, setMessage] =
    useState('');

  const [downloading, setDownloading] =
    useState<string | null>(null);

  const isInvestor =
    role === 'investor';

  useEffect(() => {
    if (!isInvestor || !opportunityId) {
      return;
    }

    let cancelled = false;

    const load = async () => {
      const token = getToken();

      if (!token) return;

      setLoading(true);
      setRestricted(false);
      setMessage('');

      try {
        const response = await fetch(
          `${API_ROOT}/deal-desk/gate0/${encodeURIComponent(
            opportunityId
          )}/documents`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.status === 403) {
          if (!cancelled) {
            setRestricted(true);
            setManifest(null);
          }
          return;
        }

        if (response.status === 404) {
          if (!cancelled) {
            setManifest(null);
            setRestricted(false);
          }
          return;
        }

        if (!response.ok) {
          throw new Error(
            await responseDetail(response)
          );
        }

        const data =
          await response.json() as Manifest;

        if (!cancelled) {
          setManifest(data);
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not load Gate 0 documents.'
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [
    isInvestor,
    opportunityId,
  ]);

  if (!isInvestor || !opportunityId) {
    return null;
  }

  const downloadDocument = async (
    document: Gate0Document
  ) => {
    const token = getToken();

    if (!token) {
      setMessage(
        'Your TD Venture session is unavailable.'
      );
      return;
    }

    setDownloading(document.document_key);
    setMessage('');

    try {
      const response = await fetch(
        `${API_ROOT}/deal-desk/gate0/${encodeURIComponent(
          opportunityId
        )}/documents/${encodeURIComponent(
          document.document_key
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          await responseDetail(response)
        );
      }

      const blob = await response.blob();
      const objectUrl =
        window.URL.createObjectURL(blob);

      const anchor =
        window.document.createElement('a');

      anchor.href = objectUrl;
      anchor.download =
        document.original_filename ||
        'gate0-document';

      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      window.URL.revokeObjectURL(objectUrl);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : 'Could not download document.'
      );
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-black/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold text-emerald-300">
            Gate 0 Documents
          </div>

          <div className="mt-1 text-xs text-gray-500">
            Founder-approved, TD-verified documents for this opportunity.
          </div>
        </div>

        {manifest && (
          <div className="rounded-md border border-emerald-500/20 px-3 py-2 text-xs text-emerald-200">
            {manifest.gate0?.verified || 0}/
            {manifest.gate0?.total || 4} Verified
          </div>
        )}
      </div>

      {loading && (
        <div className="mt-4 text-xs text-gray-500">
          Loading Gate 0 documents...
        </div>
      )}

      {!loading && restricted && (
        <div className="mt-4 rounded-md border border-gray-800 bg-black/30 p-3">
          <div className="text-xs font-semibold text-gray-300">
            Documents not yet released
          </div>

          <div className="mt-1 text-xs leading-5 text-gray-500">
            Access opens only after TD Venture verifies all four
            Gate 0 requirements and the founder explicitly approves
            sharing for this opportunity.
          </div>
        </div>
      )}

      {!loading &&
        manifest &&
        (manifest.documents || []).length > 0 && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            {(manifest.documents || []).map(
              (document) => (
                <div
                  key={document.document_key}
                  className="rounded-md border border-gray-800 bg-black/30 p-3"
                >
                  <div className="text-xs font-semibold text-white">
                    {LABELS[
                      document.document_key
                    ] ||
                      document.document_key}
                  </div>

                  <div className="mt-1 break-all text-[11px] text-gray-500">
                    {document.original_filename}
                  </div>

                  <div className="mt-1 text-[10px] text-gray-600">
                    {formatBytes(
                      document.size_bytes
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={
                      downloading ===
                      document.document_key
                    }
                    onClick={() =>
                      void downloadDocument(
                        document
                      )
                    }
                    className="mt-3 rounded-md border border-emerald-500/30 px-3 py-2 text-[11px] font-semibold text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    {downloading ===
                    document.document_key
                      ? 'Downloading...'
                      : 'Download securely'}
                  </button>
                </div>
              )
            )}
          </div>
        )}

      {!loading &&
        manifest &&
        (manifest.documents || []).length === 0 && (
          <div className="mt-4 text-xs text-gray-500">
            No released Gate 0 documents are available.
          </div>
        )}

      {manifest?.sharing?.approved && (
        <div className="mt-4 text-[10px] leading-4 text-gray-600">
          Access is specific to this Deal Desk opportunity.
          Founder and investor contact details remain protected.
        </div>
      )}

      {message && (
        <div className="mt-3 text-xs text-red-400">
          {message}
        </div>
      )}
    </div>
  );
}
