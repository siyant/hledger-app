import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { JollySearchField } from "@/components/ui/searchfield";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { invoke } from "@tauri-apps/api/core";
import { 
  createDefaultAccountsOptions, 
  createDefaultBalanceOptions,
  type BalanceReport,
  type SimpleBalance,
  type PeriodicBalance,
  type BalanceAccount
} from "./types/hledger.types";

function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [balances, setBalances] = useState<BalanceAccount[]>([]);

  async function fetchAccounts(query = "") {
    const options = createDefaultAccountsOptions();

    // Add the search query if provided
    if (query.trim()) {
      options.queries = [query];
    }

    try {
      const accountsList = await invoke<string[]>("get_accounts", { options });
      setAccounts(accountsList);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setAccounts([]);
    }
  }

  async function fetchBalances(query = "") {
    const options = createDefaultBalanceOptions();

    // Add the search query if provided
    if (query.trim()) {
      options.queries = [query];
    }

    try {
      const balanceReport = await invoke<BalanceReport>("get_balance", { options });
      
      // Extract accounts from the balance report
      // Check if it's a SimpleBalance (has accounts property) or PeriodicBalance (has dates/rows properties)
      if ("accounts" in balanceReport) {
        const simpleBalance = balanceReport as SimpleBalance;
        // Filter out accounts that have only zero amounts
        const accountsWithBalances = simpleBalance.accounts.filter(account => 
          account.amounts.some(amount => parseFloat(amount.quantity) !== 0)
        );
        setBalances(accountsWithBalances);
      } else if ("dates" in balanceReport && "rows" in balanceReport) {
        const periodicBalance = balanceReport as PeriodicBalance;
        // For periodic balances, we'll show the account names from rows
        const accounts: BalanceAccount[] = periodicBalance.rows.map(row => ({
          name: row.account,
          display_name: row.display_name,
          indent: 0,
          amounts: row.amounts[0] || [], // Use first period's amounts
        })).filter(account => 
          account.amounts.some(amount => parseFloat(amount.quantity) !== 0)
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

  // Fetch accounts when searchQuery changes
  useEffect(() => {
    fetchAccounts(searchQuery);
  }, [searchQuery]);

  // Fetch balances when searchQuery changes
  useEffect(() => {
    fetchBalances(searchQuery);
  }, [searchQuery]);

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
                              <li key={index} className="flex justify-between items-start text-sm">
                                <span className="font-mono text-muted-foreground flex-1 mr-2">
                                  {balance.display_name || balance.name}
                                </span>
                                <div className="flex flex-col items-end">
                                  {balance.amounts
                                    .filter(amount => parseFloat(amount.quantity) !== 0)
                                    .map((amount, amountIndex) => (
                                    <span key={amountIndex} className="font-mono text-xs">
                                      {amount.commodity}{amount.quantity}
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
