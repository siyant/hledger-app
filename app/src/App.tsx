import { useState, useEffect } from "react";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { JollySearchField } from "@/components/ui/searchfield";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { JollyDateRangePicker } from "@/components/ui/date-picker";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { invoke } from "@tauri-apps/api/core";
import { DateValue, getLocalTimeZone, today } from "@internationalized/date";
import {
  createDefaultAccountsOptions,
  createDefaultBalanceOptions,
  type BalanceReport,
  type SimpleBalance,
  type PeriodicBalance,
  type BalanceAccount,
} from "./types/hledger.types";

// Date range utilities
function getDateRange(preset: string): { begin: DateValue; end: DateValue } | null {
  const now = today(getLocalTimeZone());

  switch (preset) {
    case "this-month": {
      const startOfMonth = now.set({ day: 1 });
      // Get last day of current month
      const endOfMonth = now.add({ months: 1 }).set({ day: 1 }).subtract({ days: 1 });
      return {
        begin: startOfMonth,
        end: endOfMonth,
      };
    }
    case "last-month": {
      const startOfLastMonth = now.subtract({ months: 1 }).set({ day: 1 });
      // Get last day of last month (which is the day before first day of current month)
      const endOfLastMonth = now.set({ day: 1 }).subtract({ days: 1 });
      return {
        begin: startOfLastMonth,
        end: endOfLastMonth,
      };
    }
    case "this-year": {
      const startOfYear = now.set({ month: 1, day: 1 });
      const endOfYear = now.set({ month: 12, day: 31 });
      return {
        begin: startOfYear,
        end: endOfYear,
      };
    }
    case "last-year": {
      const startOfLastYear = now.subtract({ years: 1 }).set({ month: 1, day: 1 });
      const endOfLastYear = now.subtract({ years: 1 }).set({ month: 12, day: 31 });
      return {
        begin: startOfLastYear,
        end: endOfLastYear,
      };
    }
    default:
      return null;
  }
}

function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState<BalanceAccount[]>([]);
  const [selectedDateRange, setSelectedDateRange] =
    useState<string>("this-month");
  const [customDateRange, setCustomDateRange] = useState<{
    start: DateValue;
    end: DateValue;
  } | null>(null);

  async function fetchAccounts(
    query = "",
    customRange: { start: DateValue; end: DateValue } | null = null,
  ) {
    const options = createDefaultAccountsOptions();

    // Add the search query if provided
    if (query.trim()) {
      options.queries = [query];
    }

    // Add date range if provided (custom always used since presets populate it)
    if (customRange) {
      options.begin = customRange.start.toString();
      options.end = customRange.end.toString();
    }

    try {
      const accountsList = await invoke<string[]>("get_accounts", { options });
      setAccounts(accountsList);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setAccounts([]);
    }
  }

  async function fetchBalances(
    query = "",
    customRange: { start: DateValue; end: DateValue } | null = null,
  ) {
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
  }

  // Clear search query
  const clearSearch = () => {
    setSearchQuery("");
  };

  // Clear date range function
  const clearDateRange = () => {
    setSelectedDateRange("");
    setCustomDateRange(null);
  };

  // Handle preset toggle selection
  const handlePresetSelection = (keys: Set<React.Key>) => {
    const selected = Array.from(keys)[0] as string;
    if (selected) {
      setSelectedDateRange(selected);
      
      // Convert preset to custom date range and populate the date picker
      const dates = getDateRange(selected);
      if (dates) {
        setCustomDateRange({
          start: dates.begin,
          end: dates.end
        });
      }
    }
  };

  // Handle custom date range selection
  const handleCustomDateRange = (
    range: { start: DateValue; end: DateValue } | null,
  ) => {
    if (range) {
      setCustomDateRange(range);
      setSelectedDateRange(""); // Clear preset when custom is selected manually
    } else {
      setCustomDateRange(null);
    }
  };

  // Fetch accounts when searchQuery or customDateRange changes
  useEffect(() => {
    fetchAccounts(searchQuery, customDateRange);
  }, [searchQuery, customDateRange]);

  // Fetch balances when searchQuery or customDateRange changes
  useEffect(() => {
    fetchBalances(searchQuery, customDateRange);
  }, [searchQuery, customDateRange]);

  return (
    <div className="min-h-screen bg-background">
      {/* Fixed Left Sidebar */}
      <div className="fixed left-0 top-0 w-80 h-screen bg-muted/50 border-r border-border p-6 overflow-y-auto">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">Filters & Options</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-2 block">
                  Search Accounts
                </label>
                <JollySearchField
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onClear={clearSearch}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Date Range
                  </label>
                  {(selectedDateRange || customDateRange) && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 p-0"
                      onClick={clearDateRange}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <div className="space-y-0">
                  <ToggleButtonGroup
                    selectedKeys={selectedDateRange ? [selectedDateRange] : []}
                    onSelectionChange={handlePresetSelection}
                    className="-mx-1"
                  >
                    <Toggle id="this-month" className="text-xs font-normal">
                      This Month
                    </Toggle>
                    <Toggle id="last-month" className="text-xs font-normal">
                      Last Month
                    </Toggle>
                    <Toggle id="this-year" className="text-xs font-normal">
                      This Year
                    </Toggle>
                  </ToggleButtonGroup>

                  <JollyDateRangePicker
                    className="w-full"
                    value={customDateRange}
                    onChange={handleCustomDateRange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-80 p-8">
        <div className="max-w-5xl mx-auto w-full">
          <Tabs>
            <TabList aria-label="hledger data views" className="w-fit">
              <Tab id="accounts">Accounts</Tab>
              <Tab id="balances">Balances</Tab>
            </TabList>

            <TabPanel id="accounts">
              <Card>
                <CardHeader>
                  <CardTitle>Accounts</CardTitle>
                  <CardDescription>
                    View all accounts from your hledger journal
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div>
                    {accounts.length > 0 ? (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Found {accounts.length} account
                          {accounts.length !== 1 ? "s" : ""}:
                        </p>
                        <div className="bg-muted rounded-md p-3">
                          <ul className="space-y-1">
                            {accounts.map((account, index) => (
                              <li key={index} className="text-sm font-mono">
                                {account}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-center items-center py-8">
                        <p className="text-sm text-muted-foreground">
                          No accounts found
                        </p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabPanel>

            <TabPanel id="balances">
              <Card>
                <CardHeader>
                  <CardTitle>Balances</CardTitle>
                  <CardDescription>
                    View account balances from your hledger journal
                  </CardDescription>
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
                              >
                                <span className="font-mono text-muted-foreground flex-1 mr-2">
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
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
