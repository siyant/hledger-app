import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createDefaultAccountsOptions } from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { useEffect, useState } from "react";

interface AccountsTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
}

export function AccountsTab({ searchQuery, dateRange }: AccountsTabProps) {
  const [accounts, setAccounts] = useState<string[]>([]);

  async function fetchAccounts(query = "", customRange: { start: DateValue; end: DateValue } | null = null) {
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

  // Fetch accounts when searchQuery or dateRange changes
  useEffect(() => {
    fetchAccounts(searchQuery, dateRange);
  }, [searchQuery, dateRange]);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Accounts</CardTitle>
        <CardDescription>View all accounts from your hledger journal</CardDescription>
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
                    <li key={index} className="text-sm hover:bg-muted-foreground/10 rounded px-2 py-1">
                      {account}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">No accounts found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
