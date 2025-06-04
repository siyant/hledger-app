import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { DateValue } from "@internationalized/date";
import { ChevronDown, ChevronRight, Dot } from "lucide-react";
import {
  createDefaultBalanceOptions,
  type BalanceReport,
  type SimpleBalance,
  type PeriodicBalance,
  type BalanceAccount,
} from "@/types/hledger.types";

interface BalancesTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
}

export function BalancesTab({ searchQuery, dateRange }: BalancesTabProps) {
  const [balances, setBalances] = useState<BalanceAccount[]>([]);
  const [balanceDisplayMode, setBalanceDisplayMode] = useState<string>("flat");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set(),
  );

  // Memoized calculation of which accounts have children
  const accountsWithChildren = useMemo(() => {
    const childrenMap = new Map<string, boolean>();
    balances.forEach((account, index) => {
      const hasChild =
        index < balances.length - 1 &&
        balances[index + 1].indent > account.indent;
      childrenMap.set(account.name, hasChild);
    });
    return childrenMap;
  }, [balances]);

  // Memoized visibility calculations
  const visibilityCache = useMemo(() => {
    if (balanceDisplayMode !== "tree") {
      return new Map(balances.map((account) => [account.name, true]));
    }

    const visibilityMap = new Map<string, boolean>();

    balances.forEach((account, index) => {
      // Root level accounts are always visible
      if (account.indent === 0) {
        visibilityMap.set(account.name, true);
        return;
      }

      // Find parent account by looking backwards
      let isVisible = false;
      for (let i = index - 1; i >= 0; i--) {
        if (balances[i].indent === account.indent - 1) {
          const parent = balances[i];
          // Account is visible if parent is expanded AND parent itself is visible
          const parentVisible = visibilityMap.get(parent.name) ?? false;
          isVisible = expandedAccounts.has(parent.name) && parentVisible;
          break;
        }
      }

      visibilityMap.set(account.name, isVisible);
    });

    return visibilityMap;
  }, [balances, expandedAccounts, balanceDisplayMode]);

  // Helper functions using memoized data
  const hasChildren = (account: BalanceAccount): boolean => {
    return accountsWithChildren.get(account.name) ?? false;
  };

  const isAccountVisible = (account: BalanceAccount): boolean => {
    return visibilityCache.get(account.name) ?? false;
  };

  // Toggle expand/collapse state
  const toggleAccount = (accountName: string) => {
    setExpandedAccounts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(accountName)) {
        newSet.delete(accountName);
      } else {
        newSet.add(accountName);
      }
      return newSet;
    });
  };

  // Expand all accounts that have children
  const expandAll = () => {
    const allParentAccounts = Array.from(accountsWithChildren.entries())
      .filter(([_, hasChild]) => hasChild)
      .map(([accountName]) => accountName);
    setExpandedAccounts(new Set(allParentAccounts));
  };

  // Collapse all accounts
  const collapseAll = () => {
    setExpandedAccounts(new Set());
  };

  const fetchBalances = useCallback(
    async (
      query = "",
      customRange: { start: DateValue; end: DateValue } | null = null,
    ) => {
      const options = createDefaultBalanceOptions();

      // Add the search query if provided
      if (query.trim()) {
        options.queries = [query];
      }

      // Add date range if provided (custom always used since presets populate it)
      if (customRange) {
        options.begin = customRange.start.toString();
        options.end = customRange.end.toString();
      }

      // Set tree/flat display mode
      if (balanceDisplayMode === "tree") {
        options.tree = true;
        options.flat = false;
      } else {
        options.flat = true;
        options.tree = false;
      }

      try {
        const balanceReport = await invoke<BalanceReport>("get_balance", {
          options,
        });

        // Extract accounts from the balance report
        // Check if it's a SimpleBalance (has accounts property) or PeriodicBalance (has dates/rows properties)
        if ("accounts" in balanceReport) {
          const simpleBalance = balanceReport as SimpleBalance;
          // Filter out accounts that have only zero amounts
          const accountsWithBalances = simpleBalance.accounts.filter(
            (account) =>
              account.amounts.some(
                (amount) => parseFloat(amount.quantity) !== 0,
              ),
          );
          setBalances(accountsWithBalances);
        } else if ("dates" in balanceReport && "rows" in balanceReport) {
          const periodicBalance = balanceReport as PeriodicBalance;
          // For periodic balances, we'll show the account names from rows
          const accounts: BalanceAccount[] = periodicBalance.rows
            .map((row) => ({
              name: row.account,
              display_name: row.display_name,
              indent: 0,
              amounts: row.amounts[0] || [], // Use first period's amounts
            }))
            .filter((account) =>
              account.amounts.some(
                (amount) => parseFloat(amount.quantity) !== 0,
              ),
            );
          setBalances(accounts);
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalances([]);
      }
    },
    [balanceDisplayMode],
  );

  // Handle balance display mode selection
  const handleBalanceDisplayMode = (keys: Set<React.Key>) => {
    const selected = Array.from(keys)[0] as string;
    if (selected) {
      setBalanceDisplayMode(selected);
      // Clear expanded state when switching modes
      setExpandedAccounts(new Set());
    }
  };

  // Fetch balances when searchQuery, dateRange, or balanceDisplayMode changes
  useEffect(() => {
    fetchBalances(searchQuery, dateRange);
  }, [searchQuery, dateRange, fetchBalances]);
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Balances</CardTitle>
          <CardDescription>
            View account balances from your hledger journal
          </CardDescription>

          <ToggleButtonGroup
            selectedKeys={[balanceDisplayMode]}
            onSelectionChange={handleBalanceDisplayMode}
            className="mt-2 justify-start"
          >
            <Toggle id="flat" className="text-xs font-normal">
              Flat
            </Toggle>
            <Toggle id="tree" className="text-xs font-normal">
              Tree
            </Toggle>
          </ToggleButtonGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          {balances.length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Found {balances.length} account
                  {balances.length !== 1 ? "s" : ""} with balances:
                </p>
                {balanceDisplayMode === "tree" && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={expandAll}
                      className="text-xs"
                    >
                      Expand All
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={collapseAll}
                      className="text-xs"
                    >
                      Collapse All
                    </Button>
                  </div>
                )}
              </div>
              <div className="bg-muted rounded-md p-3">
                <ul className="space-y-1">
                  {balances
                    .filter((balance) => isAccountVisible(balance))
                    .map((balance, index) => {
                      const hasChildAccounts =
                        balanceDisplayMode === "tree" && hasChildren(balance);
                      return (
                        <li
                          key={index}
                          className="flex justify-between items-start text-sm"
                          style={{ paddingLeft: `${balance.indent * 16}px` }}
                        >
                          <span className="flex-1 mr-2 flex items-center">
                            {balanceDisplayMode === "tree" && (
                              <>
                                {hasChildAccounts ? (
                                  <button
                                    onClick={() => toggleAccount(balance.name)}
                                    className="mr-1 p-0 hover:bg-muted rounded flex items-center"
                                  >
                                    {expandedAccounts.has(balance.name) ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : (
                                  <span className="mr-1 flex items-center w-4">
                                    <Dot className="h-4 w-4" />
                                  </span>
                                )}
                              </>
                            )}
                            {hasChildAccounts ? (
                              <button
                                onClick={() => toggleAccount(balance.name)}
                                className="hover:underline text-left"
                              >
                                {balance.display_name || balance.name}
                              </button>
                            ) : (
                              balance.display_name || balance.name
                            )}
                          </span>
                          <div className="flex flex-col items-end">
                            {balance.amounts
                              .filter(
                                (amount) => parseFloat(amount.quantity) !== 0,
                              )
                              .map((amount, amountIndex) => {
                                // Check if this is an expanded parent account (has children and is expanded)
                                const isExpandedParent =
                                  hasChildAccounts &&
                                  expandedAccounts.has(balance.name);
                                return (
                                  <span
                                    key={amountIndex}
                                    className={`font-mono text-xs ${isExpandedParent ? "text-muted-foreground" : ""}`}
                                  >
                                    {amount.commodity}
                                    {amount.quantity}
                                  </span>
                                );
                              })}
                          </div>
                        </li>
                      );
                    })}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">No balances found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
