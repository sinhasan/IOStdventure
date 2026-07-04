import { QueryClient, QueryClientProvider as QCProvider } from '@tanstack/react-query';
export const queryClient = new QueryClient();
export function QueryClientProvider({ children }: { children: React.ReactNode }) {
  return <QCProvider client={queryClient}>{children}</QCProvider>;
}
