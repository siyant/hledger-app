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
import { invoke } from "@tauri-apps/api/core";
import { createDefaultAccountsOptions } from "./types/hledger.types";

function App() {
  const [accounts, setAccounts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Clear search query
  const clearSearch = () => {
    setSearchQuery("");
    fetchAccounts("");
  };

  // Load accounts when component mounts
  useEffect(() => {
    fetchAccounts();
  }, []);

  return (
    <div className="min-h-screen bg-background flex flex-col p-8">
      <div className="max-w-5xl mx-auto w-full space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Tauri + shadcn/ui + Tailwind
          </h1>
          <p className="text-xl text-muted-foreground">
            Modern desktop app boilerplate
          </p>
          <div className="flex gap-2">
            <Badge variant="secondary">Tauri v2</Badge>
            <Badge variant="secondary">React 18</Badge>
            <Badge variant="secondary">TypeScript</Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 gap-8">
          {/* Accounts */}
          <Card>
            <CardHeader>
              <CardTitle>Accounts</CardTitle>
              <CardDescription>
                View all accounts from your hledger journal
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <JollySearchField
                value={searchQuery}
                onChange={(value) => {
                  setSearchQuery(value);
                  fetchAccounts(value);
                }}
                onClear={clearSearch}
              />

              <div className="min-h-[250px]">
                {accounts.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Found {accounts.length} account
                      {accounts.length !== 1 ? "s" : ""}:
                    </p>
                    <div className="h-[200px] overflow-y-auto bg-muted rounded-md p-3">
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
                  <div className="flex justify-center items-center h-full">
                    <p className="text-sm text-muted-foreground">
                      No accounts found
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="text-sm text-muted-foreground">
          <p>
            Built with Tauri, React, TypeScript, shadcn/ui, and Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
