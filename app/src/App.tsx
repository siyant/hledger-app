import { AccountsTab } from "@/components/AccountsTab";
import { BalancesTab } from "@/components/BalancesTab";
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

  return (
    <div className="min-h-screen bg-background">
      <FiltersSidebar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedJournalFile={selectedJournalFile}
        onJournalFileChange={setSelectedJournalFile}
      />

      {/* Main Content */}
      <div className="ml-80 p-8">
        <div className="max-w-5xl mx-auto w-full">
          <Tabs>
            <TabList aria-label="hledger data views" className="w-fit">
              <Tab id="accounts">Accounts</Tab>
              <Tab id="balances">Balances</Tab>
              <Tab id="balancesheet">Balance Sheet</Tab>
              <Tab id="incomestatement">Income Statement</Tab>
            </TabList>

            <TabPanel id="accounts">
              <AccountsTab searchQuery={searchQuery} dateRange={dateRange} selectedJournalFile={selectedJournalFile} />
            </TabPanel>

            <TabPanel id="balances">
              <BalancesTab searchQuery={searchQuery} dateRange={dateRange} selectedJournalFile={selectedJournalFile} />
            </TabPanel>

            <TabPanel id="balancesheet">
              <BalanceSheetTab
                searchQuery={searchQuery}
                dateRange={dateRange}
                selectedJournalFile={selectedJournalFile}
              />
            </TabPanel>

            <TabPanel id="incomestatement">
              <IncomeStatementTab
                searchQuery={searchQuery}
                dateRange={dateRange}
                selectedJournalFile={selectedJournalFile}
              />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
