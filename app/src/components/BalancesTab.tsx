import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import {
  type BalanceAccount,
  type BalanceReport,
  type PeriodicBalance,
  type SimpleBalance,
  createDefaultBalanceOptions,
} from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight, Dot } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface BalancesTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
  selectedJournalFile: string;
}

export function BalancesTab({ searchQuery, dateRange, selectedJournalFile }: BalancesTabProps) {
  const [balances, setBalances] = useState<BalanceAccount[]>([]);
  const [periodicData, setPeriodicData] = useState<PeriodicBalance | null>(null);
  const [balanceDisplayMode, setBalanceDisplayMode] = useState<string>("flat");
  const [periodMode, setPeriodMode] = useState<string>("none");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(new Set());

  // Memoized calculation of which accounts have children
  const accountsWithChildren = useMemo(() => {
    const childrenMap = new Map<string, boolean>();

    if (periodicData) {
      // For periodic data, use the rows to determine children
      periodicData.rows.forEach((row, index) => {
        // In periodic data, we need to compute indent from account name
        const indent = (row.account.match(/:/g) || []).length;
        const hasChild =
          index < periodicData.rows.length - 1 &&
          (periodicData.rows[index + 1].account.match(/:/g) || []).length > indent;
        childrenMap.set(row.account, hasChild);
      });
    } else {
      // For simple data, use existing logic
      balances.forEach((account, index) => {
        const hasChild = index < balances.length - 1 && balances[index + 1].indent > account.indent;
        childrenMap.set(account.name, hasChild);
      });
    }

    return childrenMap;
  }, [balances, periodicData]);

  // Memoized visibility calculations
  const visibilityCache = useMemo(() => {
    if (balanceDisplayMode !== "tree") {
      if (periodicData) {
        return new Map(periodicData.rows.map((row) => [row.account, true]));
      } else {
        return new Map(balances.map((account) => [account.name, true]));
      }
    }

    const visibilityMap = new Map<string, boolean>();

    if (periodicData) {
      // For periodic data
      periodicData.rows.forEach((row, index) => {
        const indent = (row.account.match(/:/g) || []).length;

        // Root level accounts are always visible
        if (indent === 0) {
          visibilityMap.set(row.account, true);
          return;
        }

        // Find parent account by looking backwards
        let isVisible = false;
        for (let i = index - 1; i >= 0; i--) {
          const parentIndent = (periodicData.rows[i].account.match(/:/g) || []).length;
          if (parentIndent === indent - 1) {
            const parent = periodicData.rows[i];
            const parentVisible = visibilityMap.get(parent.account) ?? false;
            isVisible = expandedAccounts.has(parent.account) && parentVisible;
            break;
          }
        }

        visibilityMap.set(row.account, isVisible);
      });
    } else {
      // For simple data, use existing logic
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
    }

    return visibilityMap;
  }, [balances, periodicData, expandedAccounts, balanceDisplayMode]);

  // Helper functions using memoized data
  const hasChildren = (accountName: string): boolean => {
    return accountsWithChildren.get(accountName) ?? false;
  };

  const isAccountVisible = (accountName: string): boolean => {
    return visibilityCache.get(accountName) ?? false;
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
    async (query = "", customRange: { start: DateValue; end: DateValue } | null = null) => {
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

      // Set period mode
      switch (periodMode) {
        case "daily":
          options.daily = true;
          break;
        case "weekly":
          options.weekly = true;
          break;
        case "monthly":
          options.monthly = true;
          break;
        case "quarterly":
          options.quarterly = true;
          break;
        case "yearly":
          options.yearly = true;
          break;
        // "none" or default - no period flags set
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
          journalFile: selectedJournalFile,
          options,
        });

        // Clear previous data
        setBalances([]);
        setPeriodicData(null);

        // Extract accounts from the balance report
        // Check if it's a SimpleBalance (has accounts property) or PeriodicBalance (has dates/rows properties)
        if ("accounts" in balanceReport) {
          const simpleBalance = balanceReport as SimpleBalance;
          // Filter out accounts that have only zero amounts
          const accountsWithBalances = simpleBalance.accounts.filter((account) =>
            account.amounts.some((amount) => Number.parseFloat(amount.quantity) !== 0),
          );
          setBalances(accountsWithBalances);
        } else if ("dates" in balanceReport && "rows" in balanceReport) {
          const periodicBalance = balanceReport as PeriodicBalance;
          // Filter out rows that have only zero amounts across all periods
          const filteredRows = periodicBalance.rows.filter((row) =>
            row.amounts.some((periodAmounts) =>
              periodAmounts.some((amount) => Number.parseFloat(amount.quantity) !== 0),
            ),
          );
          setPeriodicData({
            ...periodicBalance,
            rows: filteredRows,
          });
        }
      } catch (error) {
        console.error("Failed to fetch balances:", error);
        setBalances([]);
        setPeriodicData(null);
      }
    },
    [balanceDisplayMode, periodMode, selectedJournalFile],
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

  // Handle period mode selection
  const handlePeriodMode = (keys: Set<React.Key>) => {
    const selected = Array.from(keys)[0] as string;
    if (selected) {
      setPeriodMode(selected);
      // Clear expanded state when switching period modes
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
        <CardTitle>Balances</CardTitle>
        <CardDescription>View balance changes, end balances, budgets, gains..</CardDescription>

        <div className="flex flex-col space-y-2 mt-2">
          <div className="flex flex-row gap-2 items-center">
            <label className="text-sm font-medium text-muted-foreground block w-16">Display</label>
            <ToggleButtonGroup selectedKeys={[balanceDisplayMode]} onSelectionChange={handleBalanceDisplayMode}>
              <Toggle id="flat" size="xs" className="text-xs font-normal text-muted-foreground">
                Flat
              </Toggle>
              <Toggle id="tree" size="xs" className="text-xs font-normal text-muted-foreground">
                Tree
              </Toggle>
            </ToggleButtonGroup>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <label className="text-sm font-medium text-muted-foreground block w-16">Period</label>
            <ToggleButtonGroup
              selectedKeys={[periodMode]}
              onSelectionChange={handlePeriodMode}
              className="justify-start"
            >
              <Toggle id="none" size="xs" className="font-normal">
                None
              </Toggle>
              <Toggle id="daily" size="xs" className="font-normal">
                Daily
              </Toggle>
              <Toggle id="weekly" size="xs" className="font-normal">
                Weekly
              </Toggle>
              <Toggle id="monthly" size="xs" className="font-normal">
                Monthly
              </Toggle>
              <Toggle id="quarterly" size="xs" className="font-normal">
                Quarterly
              </Toggle>
              <Toggle id="yearly" size="xs" className="font-normal">
                Yearly
              </Toggle>
            </ToggleButtonGroup>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div>
          {balances.length > 0 || periodicData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {periodicData ? (
                    <>
                      {periodicData.rows.length} {periodicData.rows.length !== 1 ? "entries" : "entry"}
                    </>
                  ) : (
                    <>
                      {balances.length} {balances.length !== 1 ? "entries" : "entry"}
                    </>
                  )}
                </p>
                {balanceDisplayMode === "tree" && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={expandAll} className="text-xs">
                      Expand All
                    </Button>
                    <Button variant="outline" size="sm" onClick={collapseAll} className="text-xs">
                      Collapse All
                    </Button>
                  </div>
                )}
              </div>

              {periodicData ? (
                // Periodic balance display
                <div className="bg-muted rounded-md p-3 overflow-x-auto">
                  <div className="min-w-fit">
                    {/* Period headers */}
                    <div className="flex mb-2 border-b border-muted-foreground/20 pb-2">
                      <div className={cn("flex-1 min-w-[200px] font-medium text-sm px-2")}>Account</div>
                      {periodicData.dates.map((periodDate, index) => (
                        <div key={index} className="w-24 text-right font-medium text-sm px-1">
                          {new Date(periodDate.start).toLocaleDateString("en-US", {
                            month: "short",
                            year: periodMode === "yearly" ? "2-digit" : undefined,
                            day: periodMode === "daily" ? "numeric" : undefined,
                          })}
                        </div>
                      ))}
                    </div>

                    {/* Account rows */}
                    <div className="space-y-1">
                      {periodicData.rows
                        .filter((row) => isAccountVisible(row.account))
                        .map((row, index) => {
                          const indent = balanceDisplayMode === "tree" ? (row.account.match(/:/g) || []).length : 0;
                          const hasChildAccounts = balanceDisplayMode === "tree" && hasChildren(row.account);

                          return (
                            <div
                              key={index}
                              className="flex items-start text-sm hover:bg-muted-foreground/10 rounded px-2 py-1"
                              style={
                                balanceDisplayMode === "tree"
                                  ? {
                                      paddingLeft: `${indent * 16}px`,
                                    }
                                  : {}
                              }
                            >
                              <div className="flex-1 min-w-[200px] flex items-center mr-2">
                                {balanceDisplayMode === "tree" && (
                                  <>
                                    {hasChildAccounts ? (
                                      <button
                                        onClick={() => toggleAccount(row.account)}
                                        className="mr-1 p-0 hover:bg-muted rounded flex items-center"
                                      >
                                        {expandedAccounts.has(row.account) ? (
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
                                    onClick={() => toggleAccount(row.account)}
                                    className="hover:underline text-left"
                                  >
                                    {row.display_name || row.account}
                                  </button>
                                ) : (
                                  row.display_name || row.account
                                )}
                              </div>

                              {/* Period amounts */}
                              {row.amounts.map((periodAmounts, periodIndex) => (
                                <div key={periodIndex} className="w-24 text-right px-1">
                                  {periodAmounts
                                    .filter((amount) => Number.parseFloat(amount.quantity) !== 0)
                                    .map((amount, amountIndex) => {
                                      const isExpandedParent = hasChildAccounts && expandedAccounts.has(row.account);
                                      return (
                                        <div
                                          key={amountIndex}
                                          className={`font-mono text-xs ${isExpandedParent ? "text-muted-foreground" : ""}`}
                                        >
                                          {amount.commodity}
                                          {amount.quantity}
                                        </div>
                                      );
                                    })}
                                </div>
                              ))}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              ) : (
                // Simple balance display (existing logic)
                <div className="bg-muted rounded-md p-3">
                  <ul className="space-y-1">
                    {balances
                      .filter((balance) => isAccountVisible(balance.name))
                      .map((balance, index) => {
                        const hasChildAccounts = balanceDisplayMode === "tree" && hasChildren(balance.name);
                        return (
                          <li
                            key={index}
                            className="flex justify-between items-start text-sm hover:bg-muted-foreground/10 rounded px-2 py-1"
                            style={
                              balanceDisplayMode === "tree"
                                ? {
                                    paddingLeft: `${balance.indent * 16}px`,
                                  }
                                : {}
                            }
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
                                .filter((amount) => Number.parseFloat(amount.quantity) !== 0)
                                .map((amount, amountIndex) => {
                                  const isExpandedParent = hasChildAccounts && expandedAccounts.has(balance.name);
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
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">No entries found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
