import { DashboardTab } from "@/components/DashboardTab";
import VerificationTab from "@/components/VerificationTab";
import { AccountsTab } from "@/components/AccountsTab";
import { BalancesTab } from "@/components/BalancesTab";
import { PrintTab } from "@/components/PrintTab";
import { BalanceSheetTab } from "@/components/BalanceSheetTab";
import { IncomeStatementTab } from "@/components/IncomeStatementTab";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import type { DateValue } from "@internationalized/date";
import { useState } from "react";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    start: DateValue;
    end: DateValue;
  } | null>(null);
  const [selectedJournalFile, setSelectedJournalFile] = useState("");
  const [currencyMode, setCurrencyMode] = useState("original");

  return (
    <div className="min-h-screen bg-background">
      <FiltersSidebar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedJournalFile={selectedJournalFile}
        onJournalFileChange={setSelectedJournalFile}
        currencyMode={currencyMode}
        onCurrencyModeChange={setCurrencyMode}
      />

      {/* Main Content */}
      <div className="ml-80 p-8 pt-6">
        <div className="max-w-5xl mx-auto w-full">
          <Tabs>
            <TabList aria-label="hledger data views" className="w-fit">
              <Tab id="dashboard">Dashboard</Tab>
              <Tab id="verification">Verification</Tab>
              <Tab
                id="balancesheet"
                className="relative ml-4 before:content-[''] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-px before:h-6 before:bg-muted-foreground/10"
              >
                Balance Sheet
              </Tab>
              <Tab id="incomestatement">Income Statement</Tab>
              <Tab
                id="accounts"
                className="relative ml-4 before:content-[''] before:absolute before:-left-2 before:top-1/2 before:-translate-y-1/2 before:w-px before:h-6 before:bg-muted-foreground/10"
              >
                Accounts
              </Tab>
              <Tab id="balances">Balances</Tab>
              <Tab id="print">Print</Tab>
            </TabList>

            <TabPanel id="dashboard">
              <DashboardTab searchQuery={searchQuery} dateRange={dateRange} selectedJournalFile={selectedJournalFile} />
            </TabPanel>

            <TabPanel id="verification">
              <VerificationTab selectedJournalFile={selectedJournalFile} />
            </TabPanel>

            <TabPanel id="accounts">
              <AccountsTab searchQuery={searchQuery} dateRange={dateRange} selectedJournalFile={selectedJournalFile} />
            </TabPanel>

            <TabPanel id="balances">
              <BalancesTab
                searchQuery={searchQuery}
                dateRange={dateRange}
                selectedJournalFile={selectedJournalFile}
                currencyMode={currencyMode}
              />
            </TabPanel>

            <TabPanel id="balancesheet">
              <BalanceSheetTab
                searchQuery={searchQuery}
                dateRange={dateRange}
                selectedJournalFile={selectedJournalFile}
                currencyMode={currencyMode}
              />
            </TabPanel>

            <TabPanel id="incomestatement">
              <IncomeStatementTab
                searchQuery={searchQuery}
                dateRange={dateRange}
                selectedJournalFile={selectedJournalFile}
                currencyMode={currencyMode}
              />
            </TabPanel>

            <TabPanel id="print">
              <PrintTab searchQuery={searchQuery} dateRange={dateRange} selectedJournalFile={selectedJournalFile} />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
