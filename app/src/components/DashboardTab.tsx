import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  type BalanceSheetReport,
  type IncomeStatementReport,
  createDefaultBalanceSheetOptions,
  createDefaultIncomeStatementOptions,
} from "@/types/hledger.types";
import type { DateValue } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, LabelList, ReferenceLine, XAxis } from "recharts";

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

    // Set date range for last 12 months
    const today = new Date();
    const twelveMonthsAgo = new Date(today.getFullYear(), today.getMonth() - 11, 1);

    // Format dates as YYYY-MM-DD
    const formatDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };

    options.begin = formatDate(twelveMonthsAgo);
    // Add 1 day to make end date inclusive for user but exclusive for hledger
    const todayPlusOne = new Date(today);
    todayPlusOne.setDate(todayPlusOne.getDate() + 1);
    options.end = formatDate(todayPlusOne);

    // Set monthly period to get data for each month
    options.monthly = true;

    // Set depth to 2 to get expense categories
    options.depth = 2;

    // Drop 1 level to remove the "expenses" parent
    options.drop = 1;

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
      console.error("Failed to fetch last 12 months expenses:", error);
      setYearlyExpensesData(null);
    }
  }, [selectedJournalFile]);

  const fetchHistoricalNetWorth = useCallback(async () => {
    const options = createDefaultBalanceSheetOptions();

    // No date range - get all historical data
    // Set monthly period to get data for each month
    options.monthly = true;

    // Set depth to 2 for assets/liabilities breakdown
    options.depth = 2;

    // Drop 1 level to remove the "assets" or "liabilities" parent
    options.drop = 1;

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

  // Extract yearly monthly expenses from income statement data with categories
  const getYearlyMonthlyExpenses = () => {
    if (!yearlyExpensesData?.subreports) return [];

    // Find the expenses subreport
    const expensesSubreport = yearlyExpensesData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "expenses",
    );

    if (!expensesSubreport?.rows || !yearlyExpensesData.dates) return [];

    // Map each month's data with month name and category breakdowns
    return yearlyExpensesData.dates.map((date, index) => {
      const monthDate = new Date(date.start);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
      });

      // Extract categories and their amounts for this month
      const categories: { [key: string]: number } = {};

      expensesSubreport.rows.forEach((row) => {
        let categoryName = row.display_name || row.account || "Unknown";

        // Remove "expenses:" prefix if present
        if (categoryName.startsWith("expenses:")) {
          categoryName = categoryName.substring(9);
        }

        const amounts = row.amounts[index] || [];
        const primaryAmount = amounts.find((amount) => Number.parseFloat(amount.quantity) !== 0);
        if (primaryAmount) {
          categories[categoryName] = Math.round(Number.parseFloat(primaryAmount.quantity));
        }
      });

      // Get total expenses for this month from the subreport totals
      const totalAmounts = expensesSubreport.totals?.amounts?.[index] || [];
      const totalExpenseAmount = totalAmounts.find((amount) => Number.parseFloat(amount.quantity) !== 0);
      const totalExpense = totalExpenseAmount ? Math.round(Number.parseFloat(totalExpenseAmount.quantity)) : 0;

      return {
        month: monthName,
        categories,
        totalExpense,
        date: date.start,
      };
    });
  };

  // Extract historical net worth from balance sheet data with assets/liabilities breakdown
  const getHistoricalNetWorth = () => {
    if (!historicalNetWorthData?.subreports || !historicalNetWorthData.dates) return [];

    // Find assets and liabilities subreports
    const assetsSubreport = historicalNetWorthData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "assets",
    );
    const liabilitiesSubreport = historicalNetWorthData.subreports.find(
      (subreport) => subreport.name.toLowerCase() === "liabilities",
    );

    if (!assetsSubreport && !liabilitiesSubreport) return [];

    // Map each month's data with month name and account breakdowns
    return historicalNetWorthData.dates.map((date, index) => {
      const monthDate = new Date(date.start);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // Extract assets categories and their amounts for this month
      const assetCategories: { [key: string]: number } = {};
      if (assetsSubreport?.rows) {
        assetsSubreport.rows.forEach((row) => {
          let categoryName = row.display_name || row.account || "Unknown";

          // Remove "assets:" prefix if present
          if (categoryName.startsWith("assets:")) {
            categoryName = categoryName.substring(7);
          }

          const amounts = row.amounts[index] || [];
          const primaryAmount = amounts.find((amount) => Number.parseFloat(amount.quantity) !== 0);
          if (primaryAmount) {
            assetCategories[categoryName] = Math.round(Number.parseFloat(primaryAmount.quantity));
          }
        });
      }

      // Extract liabilities categories and their amounts for this month
      const liabilityCategories: { [key: string]: number } = {};
      if (liabilitiesSubreport?.rows) {
        liabilitiesSubreport.rows.forEach((row) => {
          let categoryName = row.display_name || row.account || "Unknown";

          // Remove "liabilities:" prefix if present
          if (categoryName.startsWith("liabilities:")) {
            categoryName = categoryName.substring(12);
          }

          const amounts = row.amounts[index] || [];
          const primaryAmount = amounts.find((amount) => Number.parseFloat(amount.quantity) !== 0);
          if (primaryAmount) {
            // Balance sheet shows liabilities as positive, but we need them negative for displaying
            liabilityCategories[categoryName] = -Math.round(Number.parseFloat(primaryAmount.quantity));
          }
        });
      }

      // Get net worth total
      const totalAmounts = historicalNetWorthData.totals?.amounts?.[index] || [];
      const totalAmount = totalAmounts.find((amount) => Number.parseFloat(amount.quantity) !== 0);
      const netWorth = totalAmount ? Math.round(Number.parseFloat(totalAmount.quantity)) : 0;

      return {
        month: monthName,
        assetCategories,
        liabilityCategories,
        netWorth,
        date: date.start,
      };
    });
  };

  const netWorthAmounts = getNetWorth();
  const lastMonthExpenses = getLastMonthExpenses();
  const previousMonthExpenses = getPreviousMonthExpenses();
  const yearlyMonthlyExpenses = getYearlyMonthlyExpenses();
  const historicalNetWorth = getHistoricalNetWorth();

  // Get all unique expense categories for chart configuration
  const getAllExpenseCategories = () => {
    const categories = new Set<string>();
    yearlyMonthlyExpenses.forEach((monthData) => {
      Object.keys(monthData.categories || {}).forEach((category) => {
        categories.add(category);
      });
    });
    return Array.from(categories);
  };

  const expenseCategories = getAllExpenseCategories();

  // Get all unique asset and liability categories for chart configuration
  const getAllAssetCategories = () => {
    const categories = new Set<string>();
    historicalNetWorth.forEach((monthData) => {
      Object.keys(monthData.assetCategories || {}).forEach((category) => {
        categories.add(category);
      });
    });
    return Array.from(categories).sort();
  };

  const getAllLiabilityCategories = () => {
    const categories = new Set<string>();
    historicalNetWorth.forEach((monthData) => {
      Object.keys(monthData.liabilityCategories || {}).forEach((category) => {
        categories.add(category);
      });
    });
    return Array.from(categories).sort();
  };

  const assetCategories = getAllAssetCategories();
  const liabilityCategories = getAllLiabilityCategories();

  // Sanitize category names for CSS variables
  const sanitizeCategoryName = (category: string) => {
    return category.replace(/[^a-zA-Z0-9]/g, "_");
  };

  // Dynamic chart configuration for expense categories
  const monthlyExpensesChartConfig = expenseCategories.reduce((config, category, index) => {
    const chartNumber = (index % 5) + 1;
    const sanitizedName = sanitizeCategoryName(category);
    config[sanitizedName] = {
      label: category,
      color: `var(--chart-${chartNumber})`,
    };
    return config;
  }, {} as ChartConfig);

  // Chart configuration for historical net worth with assets and liabilities
  const historicalNetWorthChartConfig = (() => {
    const config: ChartConfig = {};

    // Add asset categories (using green-ish colors)
    assetCategories.forEach((category, index) => {
      const sanitizedName = `asset_${sanitizeCategoryName(category)}`;
      const chartNumber = (index % 5) + 1;
      config[sanitizedName] = {
        label: category,
        color: `var(--chart-${chartNumber})`,
      };
    });

    // Add liability categories (using red-ish colors)
    liabilityCategories.forEach((category, index) => {
      const sanitizedName = `liability_${sanitizeCategoryName(category)}`;
      const chartNumber = (index % 5) + 1;
      config[sanitizedName] = {
        label: `liabilities:${category}`,
        color: `var(--chart-${chartNumber})`,
      };
    });

    return config;
  })();

  // Transform yearly monthly expenses data for stacked chart
  const getMonthlyExpensesChartData = () => {
    return yearlyMonthlyExpenses.map((monthData) => {
      // Parse the date to get proper month/year display
      const monthDate = new Date(monthData.date);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "short",
      });
      const fullMonthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // Create chart data with all categories
      const chartData: any = {
        month: monthName,
        fullMonth: fullMonthName,
        totalExpense: monthData.totalExpense || 0,
      };

      // Add each category as a separate property using sanitized names
      expenseCategories.forEach((category) => {
        const sanitizedName = sanitizeCategoryName(category);
        chartData[sanitizedName] = monthData.categories?.[category] || 0;
      });

      return chartData;
    });
  };

  const monthlyExpensesChartData = getMonthlyExpensesChartData();

  // Transform historical net worth data for the stacked chart
  const getHistoricalNetWorthChartData = () => {
    return historicalNetWorth.map((monthData) => {
      // Parse the date to get proper month/year display
      const monthDate = new Date(monthData.date);
      const monthName = monthDate.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      });
      const fullMonthName = monthDate.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      // Create chart data with all categories
      const chartData: any = {
        month: monthName,
        fullMonth: fullMonthName,
        netWorth: monthData.netWorth || 0,
      };

      // Add each asset category as a separate property
      assetCategories.forEach((category) => {
        const sanitizedName = `asset_${sanitizeCategoryName(category)}`;
        chartData[sanitizedName] = monthData.assetCategories?.[category] || 0;
      });

      // Add each liability category as a separate property (as negative values for proper stacking)
      liabilityCategories.forEach((category) => {
        const sanitizedName = `liability_${sanitizeCategoryName(category)}`;
        chartData[sanitizedName] = monthData.liabilityCategories?.[category] || 0;
      });

      return chartData;
    });
  };

  const historicalNetWorthChartData = getHistoricalNetWorthChartData();

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
            <CardTitle>Monthly Expenses (Last 12 Months)</CardTitle>
          </CardHeader>
          <CardContent>
            {monthlyExpensesChartData.length > 0 && expenseCategories.length > 0 ? (
              <ChartContainer config={monthlyExpensesChartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={monthlyExpensesChartData} reverseStackOrder>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => {
                          const item = monthlyExpensesChartData.find((d) => d.month === value);
                          const totalExpense = item?.totalExpense ? Number(item.totalExpense).toLocaleString() : "";
                          return (
                            <div className="flex justify-between gap-2">
                              <span>{item?.fullMonth || value}</span>
                              {totalExpense && (
                                <span className="font-mono font-medium tabular-nums">${totalExpense}</span>
                              )}
                            </div>
                          );
                        }}
                        contentClassName="flex flex-col-reverse"
                      />
                    }
                  />
                  <ChartLegend
                    content={<ChartLegendContent className="flex-col-reverse items-start gap-1" />}
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ paddingLeft: "20px" }}
                  />
                  {expenseCategories.map((category, index) => {
                    const sanitizedName = sanitizeCategoryName(category);
                    return (
                      <Bar
                        key={category}
                        dataKey={sanitizedName}
                        stackId="expenses"
                        fill={`var(--color-${sanitizedName})`}
                      >
                        {index === 0 && (
                          <LabelList
                            position="top"
                            offset={12}
                            className="fill-foreground font-mono"
                            fontSize={12}
                            dataKey="totalExpense"
                            formatter={(value) => `$${Number(value).toLocaleString()}`}
                          />
                        )}
                      </Bar>
                    );
                  })}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No expense data available</div>
            )}
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-3">
          <CardHeader>
            <CardTitle>Historical Net Worth</CardTitle>
          </CardHeader>
          <CardContent>
            {historicalNetWorthChartData.length > 0 &&
            (assetCategories.length > 0 || liabilityCategories.length > 0) ? (
              <ChartContainer config={historicalNetWorthChartConfig} className="min-h-[300px] w-full">
                <BarChart accessibilityLayer data={historicalNetWorthChartData} stackOffset="sign" reverseStackOrder>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        labelFormatter={(value) => {
                          const item = historicalNetWorthChartData.find((d) => d.month === value);
                          const netWorth = item?.netWorth ? Number(item.netWorth).toLocaleString() : "";
                          return (
                            <div className="flex justify-between gap-2">
                              <span>{item?.fullMonth || value}</span>
                              {netWorth && <span className="font-mono font-medium tabular-nums">${netWorth}</span>}
                            </div>
                          );
                        }}
                        contentClassName="flex flex-col-reverse"
                      />
                    }
                  />
                  <ChartLegend
                    content={<ChartLegendContent className="flex-col-reverse items-start gap-1" />}
                    verticalAlign="middle"
                    align="right"
                    layout="vertical"
                    wrapperStyle={{ paddingLeft: "20px" }}
                  />
                  <ReferenceLine y={0} stroke="#000" />
                  {/* Render asset categories */}
                  {assetCategories.map((category, index) => {
                    const sanitizedName = `asset_${sanitizeCategoryName(category)}`;
                    return (
                      <Bar
                        key={sanitizedName}
                        dataKey={sanitizedName}
                        stackId="networth"
                        fill={`var(--color-${sanitizedName})`}
                      >
                        {/* Add label on the first asset category (topmost positive bar) - only if 12 months or less */}
                        {index === 0 && historicalNetWorthChartData.length <= 12 && (
                          <LabelList
                            position="top"
                            offset={12}
                            className="fill-foreground font-mono"
                            fontSize={12}
                            dataKey="netWorth"
                            formatter={(value) => `$${Number(value).toLocaleString()}`}
                          />
                        )}
                      </Bar>
                    );
                  })}
                  {/* Render liability categories */}
                  {liabilityCategories.map((category, index) => {
                    const sanitizedName = `liability_${sanitizeCategoryName(category)}`;
                    return (
                      <Bar
                        key={sanitizedName}
                        dataKey={sanitizedName}
                        stackId="networth"
                        fill={`var(--color-${sanitizedName})`}
                      />
                    );
                  })}
                </BarChart>
              </ChartContainer>
            ) : (
              <div className="text-sm text-muted-foreground">No net worth data available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
