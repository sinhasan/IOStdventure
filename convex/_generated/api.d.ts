/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as adminCleanup from "../adminCleanup.js";
import type * as adminCleanupMutations from "../adminCleanupMutations.js";
import type * as adminCleanupQueries from "../adminCleanupQueries.js";
import type * as connections from "../connections.js";
import type * as crons from "../crons.js";
import type * as emails from "../emails.js";
import type * as http from "../http.js";
import type * as investors from "../investors.js";
import type * as invitations from "../invitations.js";
import type * as matches from "../matches.js";
import type * as matching from "../matching.js";
import type * as partners from "../partners.js";
import type * as paymentRecords from "../paymentRecords.js";
import type * as payments from "../payments.js";
import type * as premiumPayments from "../premiumPayments.js";
import type * as premiumTiers from "../premiumTiers.js";
import type * as startups from "../startups.js";
import type * as stats from "../stats.js";
import type * as userProfiles from "../userProfiles.js";
import type * as users from "../users.js";
import type * as webhookActivationMutations from "../webhookActivationMutations.js";
import type * as webhookActivations from "../webhookActivations.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  adminCleanup: typeof adminCleanup;
  adminCleanupMutations: typeof adminCleanupMutations;
  adminCleanupQueries: typeof adminCleanupQueries;
  connections: typeof connections;
  crons: typeof crons;
  emails: typeof emails;
  http: typeof http;
  investors: typeof investors;
  invitations: typeof invitations;
  matches: typeof matches;
  matching: typeof matching;
  partners: typeof partners;
  paymentRecords: typeof paymentRecords;
  payments: typeof payments;
  premiumPayments: typeof premiumPayments;
  premiumTiers: typeof premiumTiers;
  startups: typeof startups;
  stats: typeof stats;
  userProfiles: typeof userProfiles;
  users: typeof users;
  webhookActivationMutations: typeof webhookActivationMutations;
  webhookActivations: typeof webhookActivations;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
