declare module "@cashfreepayments/cashfree-js" {
  export function load(options: { mode: "production" | "sandbox" }): Promise<{
    checkout(options: {
      paymentSessionId: string;
      redirectTarget?: "_self" | "_blank" | "_modal";
    }): void;
  }>;
}
