/** Returns "sandbox" for test accounts, "production" for everyone else.
 *  Mirrors the backend getCashfreeConfig() logic so the Cashfree JS SDK
 *  always opens the correct checkout UI.
 *
 *  ENABLE_SANDBOX_TEST_USERS must be "true" (set via VITE_ENABLE_SANDBOX_TEST_USERS)
 *  AND the logged-in user email must be in SANDBOX_USERS list.
 */
export const SANDBOX_USERS = ["hello@tdventure.vc", "sanjeev@tdventures.in"];

export function getCashfreeMode(userEmail: string | null | undefined): "production" | "sandbox" {
  const sandboxEnabled =
    (import.meta.env.VITE_ENABLE_SANDBOX_TEST_USERS ?? "false").toLowerCase() === "true";
  if (sandboxEnabled && SANDBOX_USERS.includes(userEmail ?? "")) return "sandbox";
  return (import.meta.env.VITE_CASHFREE_MODE ?? "production") as "production" | "sandbox";
}
