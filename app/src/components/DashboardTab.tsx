import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type BalanceSheetReport,
  type IncomeStatementReport,
  createDefaultBalanceSheetOptions,
  createDefaultIncomeStatementOptions,
} from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

interface DashboardTabProps {
  searchQuery: string;
  dateRange: { start: DateValue; end: DateValue } | null;
  selectedJournalFile: string;
}

export function DashboardTab({ searchQuery, dateRange, selectedJournalFile }: DashboardTabProps) {
  const [balanceSheetData, setBalanceSheetData] = useState<BalanceSheetReport | null>(null);
  const [incomeStatementData, setIncomeStatementData] = useState<IncomeStatementReport | null>(null);
  const [prevIncomeStatementData, setPrevIncomeStatementData] = useState<IncomeStatementReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [prevExpensesLoading, setPrevExpensesLoading] = useState(false);

  const fetchNetWorth = useCallback(async () => {
    const options = createDefaultBalanceSheetOptions();

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    // Don't apply any filters - we want the total net worth

    try {
      setLoading(true);
      const balanceSheetReport = await invoke<BalanceSheetReport>("get_balancesheet", {
        journalFile: selectedJournalFile,
        options,
      });

      setBalanceSheetData(balanceSheetReport);
    } catch (error) {
      console.error("Failed to fetch balance sheet:", error);
      setBalanceSheetData(null);
    } finally {
      setLoading(false);
    }
  }, [selectedJournalFile]);

  const fetchLastMonthExpenses = useCallback(async () => {
    const options = createDefaultIncomeStatementOptions();

    // Calculate last month's date range
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    options.begin = formatDate(lastMonth);
    options.end = formatDate(lastMonthEnd);

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    try {
      setExpensesLoading(true);
      const incomeStatementReport = await invoke<IncomeStatementReport>("get_incomestatement", {
        journalFile: selectedJournalFile,
        options,
      });

      setIncomeStatementData(incomeStatementReport);
    } catch (error) {
      console.error("Failed to fetch income statement:", error);
      setIncomeStatementData(null);
    } finally {
      setExpensesLoading(false);
    }
  }, [selectedJournalFile]);

  const fetchPreviousMonthExpenses = useCallback(async () => {
    const options = createDefaultIncomeStatementOptions();

    // Calculate previous month's date range (2 months ago)
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const prevMonthEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    options.begin = formatDate(prevMonth);
    options.end = formatDate(prevMonthEnd);

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    try {
      setPrevExpensesLoading(true);
      const incomeStatementReport = await invoke<IncomeStatementReport>("get_incomestatement", {
        journalFile: selectedJournalFile,
        options,
      });

      setPrevIncomeStatementData(incomeStatementReport);
    } catch (error) {
      console.error("Failed to fetch previous month income statement:", error);
      setPrevIncomeStatementData(null);
    } finally {
      setPrevExpensesLoading(false);
    }
  }, [selectedJournalFile]);

  // Fetch net worth and expenses only when journal file changes
  useEffect(() => {
    if (selectedJournalFile) {
      fetchNetWorth();
      fetchLastMonthExpenses();
      fetchPreviousMonthExpenses();
    }
  }, [fetchNetWorth, fetchLastMonthExpenses, fetchPreviousMonthExpenses, selectedJournalFile]);

  // Extract net worth from balance sheet data
  const getNetWorth = () => {
    if (!balanceSheetData?.totals?.amounts?.[0]) return null;
    return balanceSheetData.totals.amounts[0].filter((amount) => Number.parseFloat(amount.quantity) !== 0);
  };

  // Extract expenses from income statement data
  const getLastMonthExpenses = () => {
    if (!incomeStatementData?.subreports) return null;

    // Find the expenses subreport
    const expensesSubreport = incomeStatementData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "expenses",
    );

    if (!expensesSubreport?.totals?.amounts?.[0]) return null;
    return expensesSubreport.totals.amounts[0].filter((amount) => Number.parseFloat(amount.quantity) !== 0);
  };

  // Extract previous month expenses from income statement data
  const getPreviousMonthExpenses = () => {
    if (!prevIncomeStatementData?.subreports) return null;

    // Find the expenses subreport
    const expensesSubreport = prevIncomeStatementData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "expenses",
    );

    if (!expensesSubreport?.totals?.amounts?.[0]) return null;
    return expensesSubreport.totals.amounts[0].filter((amount) => Number.parseFloat(amount.quantity) !== 0);
  };

  const netWorthAmounts = getNetWorth();
  const lastMonthExpenses = getLastMonthExpenses();
  const previousMonthExpenses = getPreviousMonthExpenses();

  // Get last month name for display
  const getLastMonthName = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  // Get previous month name for display
  const getPreviousMonthName = () => {
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return prevMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : netWorthAmounts && netWorthAmounts.length > 0 ? (
              <div className="space-y-1">
                {netWorthAmounts.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Month's Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{getLastMonthName()}</div>
            {expensesLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : lastMonthExpenses && lastMonthExpenses.length > 0 ? (
              <div className="space-y-1">
                {lastMonthExpenses.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous Month's Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{getPreviousMonthName()}</div>
            {prevExpensesLoading ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : previousMonthExpenses && previousMonthExpenses.length > 0 ? (
              <div className="space-y-1">
                {previousMonthExpenses.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
