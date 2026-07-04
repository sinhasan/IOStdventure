import {
  useQuery as useRQQuery,
  useMutation as useRQMutation,
  useQueryClient,
} from '@tanstack/react-query';
import * as apiModule from './api';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import React from 'react';

export const Authenticated = ({ children }: { children: React.ReactNode }) => {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  return user ? <>{children}</> : null;
};
export const Unauthenticated = ({ children }: { children: React.ReactNode }) => {
  const { data: user, isLoading } = useCurrentUser();
  if (isLoading) return null;
  return !user ? <>{children}</> : null;
};
export const AuthLoading = () => null;
export const useAuth = useCurrentUser;
export const useConvexAuth = useCurrentUser;
export const useAuthCallback = () => ({});

const queryMap: Record<string, (...args: any[]) => Promise<any>> = {
  'api.users.getCurrentUser':          apiModule.getCurrentUser,
  'api.users.listAllUsers':            apiModule.adminListUsers,
  'api.startups.list':                 apiModule.listStartups,
  'api.startups.getMyProfile':         apiModule.getMyStartup,
  'api.startups.getMyMatchCount':      apiModule.getMyMatchCount,
  'api.investors.list':                apiModule.listInvestors,
  'api.investors.getMyProfile':        apiModule.getMyInvestor,
  'api.matches.listForCurrentUser':    apiModule.getMatches,
  'api.connections.getMyConnections':  apiModule.getMatches,
  'api.connections.discoverInvestors': apiModule.listInvestors,
  'api.connections.discoverStartups':  apiModule.listStartups,
  'api.invitations.list':              () => Promise.resolve([]),
  'api.partners.getMyPartnerProfile':  apiModule.getMyPartnerProfile,
  'api.partners.getMyReferrals':       () => Promise.resolve([]),
  'api.premiumTiers.getMyTiers':       () => Promise.resolve([]),
  'api.premiumTiers.getTierStats':     () => Promise.resolve({}),
  'api.stats.myStats':                 apiModule.getMyStats,
  'api.stats.overview':                apiModule.getOverviewStats,
  'api.userProfiles.getMyProfile':     apiModule.getMyStartup,
  'api.userProfiles.listAllProfiles':  apiModule.adminListUsers,
  'api.payments.getMyPaymentStatus':   () => Promise.resolve({ status: 'none' }),
};

const mutationMap: Record<string, (...args: any[]) => Promise<any>> = {
  'api.users.updateCurrentUser':                 apiModule.updateUser,
  'api.users.setUserRole':                       apiModule.updateUser,
  'api.users.selfSetRole':                       apiModule.updateUser,
  'api.users.completeOnboarding':                apiModule.updateUser,
  'api.startups.create':                         apiModule.createStartup,
  'api.startups.update':                         apiModule.updateStartup,
  'api.startups.remove':                         apiModule.deleteStartup,
  'api.investors.create':                        apiModule.createInvestor,
  'api.investors.update':                        apiModule.updateInvestor,
  'api.investors.remove':                        apiModule.deleteInvestor,
  'api.matches.create':                          apiModule.createMatch,
  'api.matches.updateStatus':                    (args: any) => apiModule.updateMatchStatus(args.id, args.status),
  'api.matches.remove':                          apiModule.deleteMatch,
  'api.matches.autoMatch':                       () => Promise.resolve({}),
  'api.matches.requestIntro':                    () => Promise.resolve({}),
  'api.connections.initiateConnection':          apiModule.createMatch,
  'api.invitations.send':                        () => Promise.resolve({}),
  'api.invitations.updateStatus':                () => Promise.resolve({}),
  'api.invitations.remove':                      () => Promise.resolve({}),
  'api.partners.submitReferral':                 apiModule.submitPartnerApplication,
  'api.partners.updatePartnerProfile':           apiModule.updateUser,
  'api.partners.adminUpdateReferralStatus':      () => Promise.resolve({}),
  'api.partners.ensurePartnerExists':            () => Promise.resolve({ id: 'stub' }),
  'api.payments.checkAndActivatePayment':        () => Promise.resolve({}),
  'api.payments.createConnectionPayment':        () => Promise.resolve({}),
  'api.payments.createContactUnlockPayment':     () => Promise.resolve({}),
  'api.payments.createMatchingPaymentLink':      () => Promise.resolve({}),
  'api.payments.verifyAndActivateTier':          () => Promise.resolve({}),
  'api.premiumPayments.createFullAccessPayment': () => Promise.resolve({}),
  'api.premiumPayments.createSectorPackPayment': () => Promise.resolve({}),
  'api.userProfiles.saveStep1':                  () => Promise.resolve({}),
  'api.userProfiles.saveStep2':                  () => Promise.resolve({}),
  'api.userProfiles.saveStep3':                  () => Promise.resolve({}),
};

export function useQuery<T = any>(queryFnOrKey: string | ((...args: any[]) => Promise<T>), args: any = {}) {
  const fn = typeof queryFnOrKey === 'string' ? queryMap[queryFnOrKey] : queryFnOrKey;
  if (!fn) throw new Error(`No query mapping for ${String(queryFnOrKey)}`);
  const key = typeof queryFnOrKey === 'string' ? [queryFnOrKey, args] : [(queryFnOrKey as any).name, args];
  const result = useRQQuery<T>({ queryKey: key, queryFn: () => fn(args), staleTime: 5 * 60 * 1000 });
  return { data: result.data as T | undefined, isLoading: result.isLoading, error: result.error, refetch: result.refetch };
}

export function useMutation<T = any>(mutationFnOrKey: string | ((...args: any[]) => Promise<T>)) {
  const fn = typeof mutationFnOrKey === 'string' ? mutationMap[mutationFnOrKey] : mutationFnOrKey;
  if (!fn) throw new Error(`No mutation mapping for ${String(mutationFnOrKey)}`);
  const result = useRQMutation<T, Error, any>({ mutationFn: (args: any) => fn(args) });
  return { mutate: result.mutate, mutateAsync: result.mutateAsync, isLoading: result.isPending, error: result.error };
}

export const useAction = useMutation;
export const useConvex = useQueryClient;
export const usePaginatedQuery = () => ({ data: null, isLoading: false, error: null, loadMore: () => {} });
export const useUser = useCurrentUser;
export { apiModule as api };
export const convex = {};
