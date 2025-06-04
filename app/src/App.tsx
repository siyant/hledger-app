import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { JollySearchField } from "@/components/ui/searchfield";
import { invoke } from "@tauri-apps/api/core";
import { createDefaultAccountsOptions } from "./types/hledger.types";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  async function greet() {
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      const message = await invoke<string>("greet", { name });
      setGreetMsg(message);
    } catch (error) {
      console.error("Failed to greet:", error);
      setGreetMsg("Failed to connect to Tauri backend");
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchAccounts(query: string = "") {
    const options = createDefaultAccountsOptions();

    // Add the search query if provided
    if (query.trim()) {
      options.queries = [query];
    }

    try {
      setIsLoading(true);
      const accountsList = await invoke<string[]>("get_accounts", { options });
      setAccounts(accountsList);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      setAccounts([]);
    } finally {
      setIsLoading(false);
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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Tauri + shadcn/ui + Tailwind
          </h1>
          <p className="text-xl text-muted-foreground">
            Modern desktop app boilerplate
          </p>
          <div className="flex justify-center gap-2">
            <Badge variant="secondary">Tauri v2</Badge>
            <Badge variant="secondary">React 18</Badge>
            <Badge variant="secondary">TypeScript</Badge>
          </div>
        </div>

        {/* Demo Card */}
        <Card>
          <CardHeader>
            <CardTitle>Demo</CardTitle>
            <CardDescription>
              Test the Tauri backend integration
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && greet()}
              />
              <Button onClick={greet} disabled={isLoading || !name.trim()}>
                {isLoading ? "..." : "Greet"}
              </Button>
            </div>
            {greetMsg && (
              <div className="p-3 bg-muted rounded-md">
                <p className="text-sm">{greetMsg}</p>
              </div>
            )}
          </CardContent>
        </Card>

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

            {isLoading ? (
              <div className="flex justify-center">
                <p>Loading accounts...</p>
              </div>
            ) : accounts.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Found {accounts.length} account
                  {accounts.length !== 1 ? "s" : ""}:
                </p>
                <div className="max-h-64 overflow-y-auto bg-muted rounded-md p-3">
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
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  No accounts found
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Built with Tauri, React, TypeScript, shadcn/ui, and Tailwind CSS
          </p>
        </div>
      </div>
    </div>
  );
}

export default App;
