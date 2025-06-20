import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { type PrintTransaction, type PrintReport, createDefaultPrintOptions } from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import type React from "react";
import { useCallback, useEffect, useState } from "react";

interface PrintTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
  selectedJournalFile: string;
}

export function PrintTab({ searchQuery, dateRange, selectedJournalFile }: PrintTabProps) {
  const [transactions, setTransactions] = useState<PrintTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTransactions = useCallback(
    async (query = "", customRange: { start: DateValue; end: DateValue } | null = null) => {
      if (!selectedJournalFile) {
        setTransactions([]);
        return;
      }

      setLoading(true);
      const options = createDefaultPrintOptions();

      // Add the search query if provided
      if (query.trim()) {
        options.queries = [query];
      }

      // Add date range if provided
      if (customRange) {
        options.begin = customRange.start.toString();
        options.end = customRange.end.add({ days: 1 }).toString();
      }

      try {
        const printReport = await invoke<PrintReport>("get_print", {
          journalFile: selectedJournalFile,
          options,
        });

        setTransactions(printReport);
      } catch (error) {
        console.error("Failed to fetch transactions:", error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    },
    [selectedJournalFile],
  );

  // Fetch transactions when searchQuery, dateRange, or selectedJournalFile changes
  useEffect(() => {
    fetchTransactions(searchQuery, dateRange);
  }, [searchQuery, dateRange, fetchTransactions]);

  const formatAmount = (amount: { commodity: string; quantity: string }) => {
    return `${amount.commodity}${amount.quantity}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Print</CardTitle>
        <CardDescription>View transaction entries with postings</CardDescription>
      </CardHeader>
      <CardContent>
        <div>
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">Loading transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {transactions.length} {transactions.length !== 1 ? "transactions" : "transaction"}
                </p>
              </div>

              <div className="bg-muted rounded-md p-3">
                <div className="space-y-0">
                  {transactions.map((transaction, transactionIndex) => (
                    <div key={transactionIndex}>
                      {transactionIndex > 0 && <div className="border-t border-muted-foreground/20 my-4" />}
                      <div className="space-y-2">
                        {/* Transaction header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <span className="font-medium text-sm">{transaction.date}</span>
                            {transaction.date2 && (
                              <span className="text-xs text-muted-foreground">({transaction.date2})</span>
                            )}
                            <span className="text-sm font-medium">{transaction.description}</span>
                          </div>
                          {transaction.code && (
                            <span className="text-xs font-mono text-muted-foreground">({transaction.code})</span>
                          )}
                        </div>
                        {transaction.comment && <p className="text-xs text-muted-foreground">{transaction.comment}</p>}

                        {/* Transaction tags */}
                        {transaction.tags && transaction.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {transaction.tags.map((tag, tagIndex) => (
                              <span
                                key={tagIndex}
                                className="text-xs px-2 py-1 bg-secondary/50 rounded-full text-muted-foreground"
                              >
                                {tag[0]}: {tag[1]}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Postings */}
                        <div className="space-y-1">
                          {transaction.postings.map((posting, postingIndex) => (
                            <div key={postingIndex} className="flex items-start justify-between text-sm pl-4">
                              <div className="flex-1 mr-4">
                                <span className="font-medium">{posting.account}</span>
                                {posting.comment && (
                                  <p className="text-xs text-muted-foreground mt-1">{posting.comment}</p>
                                )}
                              </div>
                              <div className="text-right">
                                {posting.amounts && posting.amounts.length > 0 && (
                                  <div className="space-y-1">
                                    {posting.amounts.map((amount, amountIndex) => (
                                      <div key={amountIndex} className="font-mono text-xs">
                                        {formatAmount(amount)}
                                      </div>
                                    ))}
                                  </div>
                                )}
                                {posting.balance_assertion && (
                                  <div className="text-xs text-muted-foreground mt-1">
                                    = {formatAmount(posting.balance_assertion.amount)}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex justify-center items-center py-8">
              <p className="text-sm text-muted-foreground">No transactions found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
