import { useState } from "react";
import { Tab, TabList, TabPanel, Tabs } from "@/components/ui/tabs";
import { DateValue } from "@internationalized/date";
import { FiltersSidebar } from "@/components/FiltersSidebar";
import { AccountsTab } from "@/components/AccountsTab";
import { BalancesTab } from "@/components/BalancesTab";

function App() {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<{
    start: DateValue;
    end: DateValue;
  } | null>(null);




  return (
    <div className="min-h-screen bg-background">
      <FiltersSidebar
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
      />

      {/* Main Content */}
      <div className="ml-80 p-8">
        <div className="max-w-5xl mx-auto w-full">
          <Tabs>
            <TabList aria-label="hledger data views" className="w-fit">
              <Tab id="accounts">Accounts</Tab>
              <Tab id="balances">Balances</Tab>
            </TabList>

            <TabPanel id="accounts">
              <AccountsTab 
                searchQuery={searchQuery}
                dateRange={dateRange}
              />
            </TabPanel>

            <TabPanel id="balances">
              <BalancesTab 
                searchQuery={searchQuery}
                dateRange={dateRange}
              />
            </TabPanel>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

export default App;
