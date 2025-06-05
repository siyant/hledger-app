// Import and re-export all generated types from hledger-lib
import type { AccountsOptions } from "../../../hledger-lib/bindings/AccountsOptions.ts";
import type { Amount } from "../../../hledger-lib/bindings/Amount.ts";
import type { BalanceAccount } from "../../../hledger-lib/bindings/BalanceAccount.ts";
import type { BalanceOptions } from "../../../hledger-lib/bindings/BalanceOptions.ts";
import type { BalanceReport } from "../../../hledger-lib/bindings/BalanceReport.ts";
import type { PeriodDate } from "../../../hledger-lib/bindings/PeriodDate.ts";
import type { PeriodicBalance } from "../../../hledger-lib/bindings/PeriodicBalance.ts";
import type { PeriodicBalanceRow } from "../../../hledger-lib/bindings/PeriodicBalanceRow.ts";
import type { Price } from "../../../hledger-lib/bindings/Price.ts";
import type { SimpleBalance } from "../../../hledger-lib/bindings/SimpleBalance.ts";

export type {
  AccountsOptions,
  BalanceOptions,
  BalanceReport,
  SimpleBalance,
  PeriodicBalance,
  PeriodicBalanceRow,
  PeriodDate,
  BalanceAccount,
  Amount,
  Price,
};

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

/**
 * Create a new BalanceOptions object with default values
 */
export function createDefaultBalanceOptions(): BalanceOptions {
  return {
    sum: false,
    valuechange: false,
    gain: false,
    budget: null,
    count: false,
    change: false,
    cumulative: false,
    historical: false,
    flat: true,
    tree: false,
    drop: null,
    declared: false,
    average: false,
    row_total: false,
    summary_only: false,
    no_total: false,
    no_elide: false,
    sort_amount: false,
    percent: false,
    related: false,
    invert: false,
    transpose: false,
    layout: null,
    daily: false,
    weekly: false,
    monthly: false,
    quarterly: false,
    yearly: false,
    period: null,
    begin: null,
    end: null,
    depth: null,
    unmarked: false,
    pending: false,
    cleared: false,
    real: false,
    empty: false,
    cost: false,
    market: false,
    exchange: null,
    value: null,
    queries: [],
  };
}
