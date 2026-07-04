import { useEffect } from "react";

const SESSION_ID_KEY = "fundind_session_id";
const REF_CODE_KEY = "fundind_ref_code";

// Get or create a persistent session ID stored in sessionStorage
export function getSessionId(): string {
  let id = sessionStorage.getItem(SESSION_ID_KEY);
  if (!id) {
    id = `s_${Math.random().toString(36).slice(2, 10)}_${Date.now().toString(36)}`;
    sessionStorage.setItem(SESSION_ID_KEY, id);
  }
  return id;
}

// Get stored referral code from sessionStorage
export function getRefCode(): string | null {
  return sessionStorage.getItem(REF_CODE_KEY);
}

/**
 * Hook: captures ?ref= from URL and saves to sessionStorage.
 * The partner program uses direct referral submissions (not URL click tracking),
 * but we keep the ref code in session in case it's needed for attribution.
 */
export function useReferralCapture() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) return;

    // Save to sessionStorage so it persists across navigation
    sessionStorage.setItem(REF_CODE_KEY, ref.toUpperCase());

    // Clean ?ref= from URL without reloading
    params.delete("ref");
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.replaceState({}, "", newUrl);
  }, []);
}
