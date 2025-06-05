import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import {
  type BalanceSheetReport,
  type BalanceSheetSubreport,
  createDefaultBalanceSheetOptions,
} from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { ChevronDown, ChevronRight, Dot } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

interface BalanceSheetTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
  selectedJournalFile: string;
}

export function BalanceSheetTab({
  searchQuery,
  dateRange,
  selectedJournalFile,
}: BalanceSheetTabProps) {
  const [balanceSheetData, setBalanceSheetData] =
    useState<BalanceSheetReport | null>(null);
  const [balanceDisplayMode, setBalanceDisplayMode] = useState<string>("flat");
  const [periodMode, setPeriodMode] = useState<string>("none");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set(),
  );

  // Memoized calculation of which accounts have children
  const accountsWithChildren = useMemo(() => {
    const childrenMap = new Map<string, boolean>();

    if (balanceSheetData) {
      balanceSheetData.subreports.forEach((subreport) => {
        subreport.rows.forEach((row, index) => {
          // In balance sheet data, we need to compute indent from account name
          const indent = (row.account.match(/:/g) || []).length;
          const hasChild =
            index < subreport.rows.length - 1 &&
            (subreport.rows[index + 1].account.match(/:/g) || []).length >
              indent;
          childrenMap.set(row.account, hasChild);
        });
      });
    }

    return childrenMap;
  }, [balanceSheetData]);

  // Memoized visibility calculations
  const visibilityCache = useMemo(() => {
    if (balanceDisplayMode !== "tree" || !balanceSheetData) {
      const visibilityMap = new Map<string, boolean>();
      balanceSheetData?.subreports.forEach((subreport) => {
        subreport.rows.forEach((row) => {
          visibilityMap.set(row.account, true);
        });
      });
      return visibilityMap;
    }

    const visibilityMap = new Map<string, boolean>();

    balanceSheetData.subreports.forEach((subreport) => {
      subreport.rows.forEach((row, index) => {
        const indent = (row.account.match(/:/g) || []).length;

        // Root level accounts are always visible
        if (indent === 0) {
          visibilityMap.set(row.account, true);
          return;
        }

        // Find parent account by looking backwards
        let isVisible = false;
        for (let i = index - 1; i >= 0; i--) {
          const parentIndent = (subreport.rows[i].account.match(/:/g) || [])
            .length;
          if (parentIndent === indent - 1) {
            const parent = subreport.rows[i];
            const parentVisible = visibilityMap.get(parent.account) ?? false;
            isVisible = expandedAccounts.has(parent.account) && parentVisible;
            break;
          }
        }

        visibilityMap.set(row.account, isVisible);
      });
    });

    return visibilityMap;
  }, [balanceSheetData, expandedAccounts, balanceDisplayMode]);

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

  const fetchBalanceSheet = useCallback(
    async (
      query = "",
      customRange: { start: DateValue; end: DateValue } | null = null,
    ) => {
      const options = createDefaultBalanceSheetOptions();

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
        const balanceSheetReport = await invoke<BalanceSheetReport>(
          "get_balancesheet",
          {
            journalFile: selectedJournalFile,
            options,
          },
        );

        setBalanceSheetData(balanceSheetReport);
      } catch (error) {
        console.error("Failed to fetch balance sheet:", error);
        setBalanceSheetData(null);
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

  // Fetch balance sheet when searchQuery, dateRange, or balanceDisplayMode changes
  useEffect(() => {
    fetchBalanceSheet(searchQuery, dateRange);
  }, [searchQuery, dateRange, fetchBalanceSheet]);

  const renderSubreport = (subreport: BalanceSheetSubreport) => {
    const visibleRows = subreport.rows.filter((row) =>
      isAccountVisible(row.account),
    );

    return (
      <div key={subreport.name} className="mb-6">
        <h3 className="text-lg font-semibold mb-2 text-primary">
          {subreport.name}
        </h3>
        <div className="bg-muted rounded-md p-3 overflow-x-auto">
          {visibleRows.length === 0 ? (
            <div className="flex justify-center items-center py-4">
              <p className="text-sm text-muted-foreground">No entries found</p>
            </div>
          ) : (
            <div className="min-w-fit">
              {/* Period headers */}
              {subreport.dates.length > 1 && (
                <div className="flex mb-2 border-b border-muted-foreground/20 pb-2">
                  <div
                    className={cn(
                      "flex-1 min-w-[200px] font-medium text-sm",
                      balanceDisplayMode === "flat" && "px-2",
                    )}
                  >
                    Account
                  </div>
                  {subreport.dates.map((periodDate, index) => (
                    <div
                      key={index}
                      className="w-24 text-right font-medium text-sm px-1"
                    >
                      {new Date(periodDate.start).toLocaleDateString("en-US", {
                        month: "short",
                        year: periodMode === "yearly" ? "2-digit" : undefined,
                        day: periodMode === "daily" ? "numeric" : undefined,
                      })}
                    </div>
                  ))}
                </div>
              )}

              {/* Account rows */}
              <div className="space-y-1">
                {visibleRows.map((row, index) => {
                  const indent =
                    balanceDisplayMode === "tree"
                      ? (row.account.match(/:/g) || []).length
                      : 0;
                  const hasChildAccounts =
                    balanceDisplayMode === "tree" && hasChildren(row.account);

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

                      {/* Amounts */}
                      {subreport.dates.length > 1 ? (
                        // Periodic amounts
                        row.amounts.map((periodAmounts, periodIndex) => (
                          <div
                            key={periodIndex}
                            className="w-24 text-right px-1"
                          >
                            {periodAmounts
                              .filter(
                                (amount) =>
                                  Number.parseFloat(amount.quantity) !== 0,
                              )
                              .map((amount, amountIndex) => {
                                const isExpandedParent =
                                  hasChildAccounts &&
                                  expandedAccounts.has(row.account);
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
                        ))
                      ) : (
                        // Single period amounts
                        <div className="flex flex-col items-end">
                          {row.amounts[0]
                            ?.filter(
                              (amount) =>
                                Number.parseFloat(amount.quantity) !== 0,
                            )
                            .map((amount, amountIndex) => {
                              const isExpandedParent =
                                hasChildAccounts &&
                                expandedAccounts.has(row.account);
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
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Totals row */}
              {subreport.totals && (
                <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                  <div className="flex items-start text-sm font-semibold px-2">
                    <div className="flex-1 min-w-[200px] mr-2">
                      Total {subreport.name}
                    </div>
                    {subreport.dates.length > 1 ? (
                      // Periodic totals
                      subreport.totals.amounts.map(
                        (periodAmounts, periodIndex) => (
                          <div
                            key={periodIndex}
                            className="w-24 text-right px-1"
                          >
                            {periodAmounts
                              .filter(
                                (amount) =>
                                  Number.parseFloat(amount.quantity) !== 0,
                              )
                              .map((amount, amountIndex) => (
                                <div
                                  key={amountIndex}
                                  className="font-mono text-xs"
                                >
                                  {amount.commodity}
                                  {amount.quantity}
                                </div>
                              ))}
                          </div>
                        ),
                      )
                    ) : (
                      // Single period totals
                      <div className="flex flex-col items-end">
                        {subreport.totals.amounts[0]
                          ?.filter(
                            (amount) =>
                              Number.parseFloat(amount.quantity) !== 0,
                          )
                          .map((amount, amountIndex) => (
                            <span
                              key={amountIndex}
                              className="font-mono text-xs"
                            >
                              {amount.commodity}
                              {amount.quantity}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Balance Sheet</CardTitle>
        <CardDescription>View assets, liabilities, and equity</CardDescription>

        <div className="flex flex-col space-y-2 mt-2">
          <div className="flex flex-row gap-2 items-center">
            <label className="text-sm font-medium text-muted-foreground block w-16">
              Display
            </label>
            <ToggleButtonGroup
              selectedKeys={[balanceDisplayMode]}
              onSelectionChange={handleBalanceDisplayMode}
            >
              <Toggle
                id="flat"
                size="xs"
                className="text-xs font-normal text-muted-foreground"
              >
                Flat
              </Toggle>
              <Toggle
                id="tree"
                size="xs"
                className="text-xs font-normal text-muted-foreground"
              >
                Tree
              </Toggle>
            </ToggleButtonGroup>
          </div>

          <div className="flex flex-row gap-2 items-center">
            <label className="text-sm font-medium text-muted-foreground block w-16">
              Period
            </label>
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
          {balanceSheetData ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
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

              {/* Render each subreport */}
              {balanceSheetData.subreports.map((subreport) =>
                renderSubreport(subreport),
              )}

              {/* Overall totals */}
              {balanceSheetData.totals && (
                <div className="mt-6 pt-4 border-t border-border">
                  <h3 className="text-lg font-semibold mb-2 text-primary">
                    Net Worth
                  </h3>
                  <div className="bg-muted rounded-md p-3">
                    <div className="flex items-start text-sm font-semibold px-2">
                      <div className="flex-1 min-w-[200px] mr-2">Total</div>
                      {balanceSheetData.dates.length > 1 ? (
                        // Periodic totals
                        balanceSheetData.totals.amounts.map(
                          (periodAmounts, periodIndex) => (
                            <div
                              key={periodIndex}
                              className="w-24 text-right px-1"
                            >
                              {periodAmounts
                                .filter(
                                  (amount) =>
                                    Number.parseFloat(amount.quantity) !== 0,
                                )
                                .map((amount, amountIndex) => (
                                  <div
                                    key={amountIndex}
                                    className="font-mono text-xs"
                                  >
                                    {amount.commodity}
                                    {amount.quantity}
                                  </div>
                                ))}
                            </div>
                          ),
                        )
                      ) : (
                        // Single period totals
                        <div className="flex flex-col items-end">
                          {balanceSheetData.totals.amounts[0]
                            ?.filter(
                              (amount) =>
                                Number.parseFloat(amount.quantity) !== 0,
                            )
                            .map((amount, amountIndex) => (
                              <span
                                key={amountIndex}
                                className="font-mono text-xs"
                              >
                                {amount.commodity}
                                {amount.quantity}
                              </span>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">No data found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
