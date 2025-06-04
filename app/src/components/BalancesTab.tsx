import React, { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { invoke } from "@tauri-apps/api/core";
import { DateValue } from "@internationalized/date";
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

  const fetchBalances = useCallback(async (
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
        const accountsWithBalances = simpleBalance.accounts.filter((account) =>
          account.amounts.some((amount) => parseFloat(amount.quantity) !== 0),
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
            account.amounts.some((amount) => parseFloat(amount.quantity) !== 0),
          );
        setBalances(accounts);
      }
    } catch (error) {
      console.error("Failed to fetch balances:", error);
      setBalances([]);
    }
  }, [balanceDisplayMode]);

  // Handle balance display mode selection
  const handleBalanceDisplayMode = (keys: Set<React.Key>) => {
    const selected = Array.from(keys)[0] as string;
    if (selected) {
      setBalanceDisplayMode(selected);
    }
  };

  // Fetch balances when searchQuery, dateRange, or balanceDisplayMode changes
  useEffect(() => {
    fetchBalances(searchQuery, dateRange);
  }, [searchQuery, dateRange, fetchBalances]);
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Balances</CardTitle>
            <CardDescription>
              View account balances from your hledger journal
            </CardDescription>
          </div>
          <ToggleButtonGroup
            selectedKeys={[balanceDisplayMode]}
            onSelectionChange={handleBalanceDisplayMode}
            className="-mx-1"
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
              <p className="text-sm text-muted-foreground">
                Found {balances.length} account
                {balances.length !== 1 ? "s" : ""} with balances:
              </p>
              <div className="bg-muted rounded-md p-3">
                <ul className="space-y-2">
                  {balances.map((balance, index) => (
                    <li
                      key={index}
                      className="flex justify-between items-start text-sm"
                      style={{ paddingLeft: `${balance.indent * 16}px` }}
                    >
                      <span className="text-muted-foreground flex-1 mr-2">
                        {balance.display_name || balance.name}
                      </span>
                      <div className="flex flex-col items-end">
                        {balance.amounts
                          .filter(
                            (amount) =>
                              parseFloat(amount.quantity) !== 0,
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
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">
                No balances found
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}