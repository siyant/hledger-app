import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type BalanceReport,
  type PrintReport,
  createDefaultBalanceOptions,
  createDefaultPrintOptions,
} from "@/types/hledger.types";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

interface VerificationTabProps {
  selectedJournalFile: string;
}

export default function VerificationTab({ selectedJournalFile }: VerificationTabProps) {
  const [tempBalances, setTempBalances] = useState<BalanceReport | null>(null);
  const [uncategorizedTransactions, setUncategorizedTransactions] = useState<PrintReport | null>(null);

  const fetchTempBalances = useCallback(async () => {
    if (!selectedJournalFile) return;

    const options = createDefaultBalanceOptions();
    options.queries = ["temp"];

    try {
      const balanceReport = await invoke<BalanceReport>("get_balance", {
        journalFile: selectedJournalFile,
        options,
      });
      setTempBalances(balanceReport);
    } catch (error) {
      console.error("Failed to fetch temp balances:", error);
      setTempBalances(null);
    }
  }, [selectedJournalFile]);

  const fetchUncategorizedTransactions = useCallback(async () => {
    if (!selectedJournalFile) return;

    const options = createDefaultPrintOptions();
    options.queries = ["expenses:uncat", "expenses:unknown"];

    try {
      const printReport = await invoke<PrintReport>("get_print", {
        journalFile: selectedJournalFile,
        options,
      });
      setUncategorizedTransactions(printReport);
    } catch (error) {
      console.error("Failed to fetch uncategorized transactions:", error);
      setUncategorizedTransactions(null);
    }
  }, [selectedJournalFile]);

  useEffect(() => {
    fetchTempBalances();
    fetchUncategorizedTransactions();
  }, [fetchTempBalances, fetchUncategorizedTransactions]);

  const renderTempBalances = () => {
    if (!tempBalances) {
      return (
        <div className="flex justify-center items-center py-8">
          <p className="text-sm text-muted-foreground">No data found</p>
        </div>
      );
    }

    if ("accounts" in tempBalances) {
      const simpleBalance = tempBalances;
      const accountsWithBalances = simpleBalance.accounts.filter((account) =>
        account.amounts.some((amount) => Number.parseFloat(amount.quantity) !== 0),
      );

      if (accountsWithBalances.length === 0) {
        return (
          <div className="flex justify-center items-center py-8">
            <p className="text-sm text-muted-foreground">No temporary accounts found</p>
          </div>
        );
      }

      return (
        <div className="bg-muted rounded-md p-3">
          <ul className="space-y-1">
            {accountsWithBalances.map((balance, index) => (
              <li
                key={index}
                className="flex justify-between items-start text-sm hover:bg-muted-foreground/10 rounded px-2 py-1"
              >
                <span className="flex-1 mr-2">{balance.display_name || balance.name}</span>
                <div className="flex flex-col items-end">
                  {balance.amounts
                    .filter((amount) => Number.parseFloat(amount.quantity) !== 0)
                    .map((amount, amountIndex) => (
                      <span key={amountIndex} className="font-mono text-xs">
                        {amount.commodity}
                        {amount.quantity}
                      </span>
                    ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      );
    }

    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-sm text-muted-foreground">No temporary accounts found</p>
      </div>
    );
  };

  const renderUncategorizedTransactions = () => {
    if (!uncategorizedTransactions) {
      return (
        <div className="flex justify-center items-center py-8">
          <p className="text-sm text-muted-foreground">No data found</p>
        </div>
      );
    }

    if (uncategorizedTransactions.length === 0) {
      return (
        <div className="flex justify-center items-center py-8">
          <p className="text-sm text-muted-foreground">No uncategorized transactions found</p>
        </div>
      );
    }

    return (
      <div className="bg-muted rounded-md p-3">
        <div className="space-y-3">
          {uncategorizedTransactions.map((transaction, index) => {
            return (
              <div key={index} className="rounded p-2 hover:bg-muted-foreground/10">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <div className="font-medium text-sm">{transaction.description}</div>
                    <div className="text-xs text-muted-foreground">{transaction.date}</div>
                  </div>
                </div>
                <div className="space-y-1">
                  {transaction.postings?.map((posting, postingIndex) => (
                    <div key={postingIndex} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{posting.account}</span>
                      <span className="font-mono">
                        {posting.amounts?.map((amount, amountIndex) => (
                          <span key={amountIndex}>
                            {amount.commodity}
                            {amount.quantity}
                          </span>
                        ))}
                      </span>
                    </div>
                  )) || <div>No postings found</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Temporary Accounts</CardTitle>
          <CardDescription>Balances in temporary accounts that should be zero</CardDescription>
        </CardHeader>
        <CardContent>{renderTempBalances()}</CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Uncategorized Transactions</CardTitle>
          <CardDescription>Transactions that need to be categorized</CardDescription>
        </CardHeader>
        <CardContent>{renderUncategorizedTransactions()}</CardContent>
      </Card>
    </div>
  );
}
