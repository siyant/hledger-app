// Import and re-export all generated types from hledger-lib
import type { AccountsOptions } from "../../../hledger-lib/bindings/AccountsOptions.ts";
export type { AccountsOptions };

// Utility functions for creating default instances

/**
 * Create a new AccountsOptions object with default values
 */
export function createDefaultAccountsOptions(): AccountsOptions {
  return {
    used: false,
    declared: false,
    unused: false,
    undeclared: false,
    types: false,
    positions: false,
    directives: false,
    find: null,
    drop: null,
    depth: null,
    begin: null,
    end: null,
    period: null,
    unmarked: false,
    pending: false,
    cleared: false,
    real: false,
    empty: false,
    queries: [],
  };
}
