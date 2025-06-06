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
  const [yearlyExpensesData, setYearlyExpensesData] = useState<IncomeStatementReport | null>(null);
  const [historicalNetWorthData, setHistoricalNetWorthData] = useState<BalanceSheetReport | null>(null);

  const fetchNetWorth = useCallback(async () => {
    const options = createDefaultBalanceSheetOptions();

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    // Convert to dollars
    options.exchange = "$";

    // Don't apply any filters - we want the total net worth

    try {
      const balanceSheetReport = await invoke<BalanceSheetReport>("get_balancesheet", {
        journalFile: selectedJournalFile,
        options,
      });

      setBalanceSheetData(balanceSheetReport);
    } catch (error) {
      console.error("Failed to fetch balance sheet:", error);
      setBalanceSheetData(null);
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
    // Add 1 day to make end date inclusive for user but exclusive for hledger
    const lastMonthEndPlusOne = new Date(lastMonthEnd);
    lastMonthEndPlusOne.setDate(lastMonthEndPlusOne.getDate() + 1);
    options.end = formatDate(lastMonthEndPlusOne);

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    try {
      const incomeStatementReport = await invoke<IncomeStatementReport>("get_incomestatement", {
        journalFile: selectedJournalFile,
        options,
      });

      setIncomeStatementData(incomeStatementReport);
    } catch (error) {
      console.error("Failed to fetch income statement:", error);
      setIncomeStatementData(null);
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
    // Add 1 day to make end date inclusive for user but exclusive for hledger
    const prevMonthEndPlusOne = new Date(prevMonthEnd);
    prevMonthEndPlusOne.setDate(prevMonthEndPlusOne.getDate() + 1);
    options.end = formatDate(prevMonthEndPlusOne);

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    try {
      const incomeStatementReport = await invoke<IncomeStatementReport>("get_incomestatement", {
        journalFile: selectedJournalFile,
        options,
      });

      setPrevIncomeStatementData(incomeStatementReport);
    } catch (error) {
      console.error("Failed to fetch previous month income statement:", error);
      setPrevIncomeStatementData(null);
    }
  }, [selectedJournalFile]);

  const fetchYearlyMonthlyExpenses = useCallback(async () => {
    const options = createDefaultIncomeStatementOptions();

    // Set date range for current year
    const currentYear = new Date().getFullYear();
    options.begin = `${currentYear}-01-01`;
    // Add 1 day to make end date inclusive for user but exclusive for hledger
    options.end = `${currentYear + 1}-01-01`;

    // Set monthly period to get data for each month
    options.monthly = true;

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    try {
      const incomeStatementReport = await invoke<IncomeStatementReport>("get_incomestatement", {
        journalFile: selectedJournalFile,
        options,
      });

      setYearlyExpensesData(incomeStatementReport);
    } catch (error) {
      console.error("Failed to fetch yearly monthly expenses:", error);
      setYearlyExpensesData(null);
    }
  }, [selectedJournalFile]);

  const fetchHistoricalNetWorth = useCallback(async () => {
    const options = createDefaultBalanceSheetOptions();

    // No date range - get all historical data
    // Set monthly period to get data for each month
    options.monthly = true;

    // Set depth to 1 for summary view
    options.depth = 1;

    // Keep it flat for simple display
    options.flat = true;
    options.tree = false;

    // Convert to dollars
    options.exchange = "$";

    try {
      const balanceSheetReport = await invoke<BalanceSheetReport>("get_balancesheet", {
        journalFile: selectedJournalFile,
        options,
      });

      setHistoricalNetWorthData(balanceSheetReport);
    } catch (error) {
      console.error("Failed to fetch historical net worth:", error);
      setHistoricalNetWorthData(null);
    }
  }, [selectedJournalFile]);

  // Fetch net worth and expenses only when journal file changes
  useEffect(() => {
    if (selectedJournalFile) {
      fetchNetWorth();
      fetchLastMonthExpenses();
      fetchPreviousMonthExpenses();
      fetchYearlyMonthlyExpenses();
      fetchHistoricalNetWorth();
    }
  }, [
    fetchNetWorth,
    fetchLastMonthExpenses,
    fetchPreviousMonthExpenses,
    fetchYearlyMonthlyExpenses,
    fetchHistoricalNetWorth,
    selectedJournalFile,
  ]);

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

  // Extract yearly monthly expenses from income statement data
  const getYearlyMonthlyExpenses = () => {
    if (!yearlyExpensesData?.subreports) return [];

    // Find the expenses subreport
    const expensesSubreport = yearlyExpensesData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "expenses",
    );

    if (!expensesSubreport?.totals?.amounts || !yearlyExpensesData.dates) return [];

    // Map each month's data with month name and total
    return yearlyExpensesData.dates.map((date, index) => {
      const monthDate = new Date(date.start);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
      });
      const amounts = expensesSubreport.totals.amounts[index] || [];
      const nonZeroAmounts = amounts.filter((amount) => Number.parseFloat(amount.quantity) !== 0);

      return {
        month: monthName,
        amounts: nonZeroAmounts,
        date: date.start,
      };
    });
  };

  // Extract historical net worth from balance sheet data
  const getHistoricalNetWorth = () => {
    if (!historicalNetWorthData?.totals?.amounts || !historicalNetWorthData.dates) return [];

    // Map each month's data with month name and net worth total
    return historicalNetWorthData.dates.map((date, index) => {
      const monthDate = new Date(date.start);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
      const amounts = historicalNetWorthData.totals.amounts[index] || [];
      const nonZeroAmounts = amounts.filter((amount) => Number.parseFloat(amount.quantity) !== 0);

      return {
        month: monthName,
        amounts: nonZeroAmounts,
        date: date.start,
      };
    });
  };

  const netWorthAmounts = getNetWorth();
  const lastMonthExpenses = getLastMonthExpenses();
  const previousMonthExpenses = getPreviousMonthExpenses();
  const yearlyMonthlyExpenses = getYearlyMonthlyExpenses();
  const historicalNetWorth = getHistoricalNetWorth();

  // Console logs for charting preparation
  if (yearlyMonthlyExpenses.length > 0) {
    console.log("Monthly Expenses Data for Charting:", yearlyMonthlyExpenses);
  }

  if (historicalNetWorth.length > 0) {
    console.log("Historical Net Worth Data for Charting:", historicalNetWorth);
  }

  // Get last month name for display
  const getLastMonthName = () => {
    const today = new Date();
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return lastMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  // Get previous month name for display
  const getPreviousMonthName = () => {
    const today = new Date();
    const prevMonth = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    return prevMonth.toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            {netWorthAmounts && netWorthAmounts.length > 0 ? (
              <div className="space-y-1">
                {netWorthAmounts.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Last Month's Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{getLastMonthName()}</div>
            {lastMonthExpenses && lastMonthExpenses.length > 0 ? (
              <div className="space-y-1">
                {lastMonthExpenses.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Previous Month's Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xs text-muted-foreground mb-2">{getPreviousMonthName()}</div>
            {previousMonthExpenses && previousMonthExpenses.length > 0 ? (
              <div className="space-y-1">
                {previousMonthExpenses.map((amount, index) => (
                  <div key={index} className="text-2xl font-bold font-mono">
                    {amount.commodity}
                    {amount.quantity}
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Monthly Expenses This Year</CardTitle>
          </CardHeader>
          <CardContent>
            {yearlyMonthlyExpenses.length > 0 ? (
              <div className="space-y-2">
                {yearlyMonthlyExpenses.map((monthData, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-muted">
                    <div className="font-medium">{monthData.month}</div>
                    <div className="space-y-1 text-right">
                      {monthData.amounts.length > 0 ? (
                        monthData.amounts.map((amount, amountIndex) => (
                          <div key={amountIndex} className="font-mono text-sm">
                            {amount.commodity}
                            {amount.quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No expenses</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Historical Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            {historicalNetWorth.length > 0 ? (
              <div className="space-y-2">
                {historicalNetWorth.map((monthData, index) => (
                  <div key={index} className="flex justify-between items-center py-2 border-b border-muted">
                    <div className="font-medium">{monthData.month}</div>
                    <div className="space-y-1 text-right">
                      {monthData.amounts.length > 0 ? (
                        monthData.amounts.map((amount, amountIndex) => (
                          <div key={amountIndex} className="font-mono text-sm">
                            {amount.commodity}
                            {amount.quantity}
                          </div>
                        ))
                      ) : (
                        <div className="text-sm text-muted-foreground">No data</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
