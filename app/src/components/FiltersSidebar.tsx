import { Button } from "@/components/ui/button";
import { JollyDateRangePicker } from "@/components/ui/date-picker";
import { JollySearchField } from "@/components/ui/searchfield";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { type DateValue, getLocalTimeZone, today } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { X } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";

interface FiltersSidebarProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  dateRange: { start: DateValue; end: DateValue } | null;
  onDateRangeChange: (range: { start: DateValue; end: DateValue } | null) => void;
  selectedJournalFile: string;
  onJournalFileChange: (file: string) => void;
}

// Date range utilities
function getDateRange(preset: string): { begin: DateValue; end: DateValue } | null {
  const now = today(getLocalTimeZone());

  switch (preset) {
    case "this-month": {
      const startOfMonth = now.set({ day: 1 });
      // Get last day of current month
      const endOfMonth = now.add({ months: 1 }).set({ day: 1 }).subtract({ days: 1 });
      return {
        begin: startOfMonth,
        end: endOfMonth,
      };
    }
    case "last-month": {
      const startOfLastMonth = now.subtract({ months: 1 }).set({ day: 1 });
      // Get last day of last month (which is the day before first day of current month)
      const endOfLastMonth = now.set({ day: 1 }).subtract({ days: 1 });
      return {
        begin: startOfLastMonth,
        end: endOfLastMonth,
      };
    }
    case "this-year": {
      const startOfYear = now.set({ month: 1, day: 1 });
      const endOfYear = now.set({ month: 12, day: 31 });
      return {
        begin: startOfYear,
        end: endOfYear,
      };
    }
    case "last-year": {
      const startOfLastYear = now.subtract({ years: 1 }).set({ month: 1, day: 1 });
      const endOfLastYear = now.subtract({ years: 1 }).set({ month: 12, day: 31 });
      return {
        begin: startOfLastYear,
        end: endOfLastYear,
      };
    }
    default:
      return null;
  }
}

export function FiltersSidebar({
  searchQuery,
  onSearchQueryChange,
  dateRange,
  onDateRangeChange,
  selectedJournalFile,
  onJournalFileChange,
}: FiltersSidebarProps) {
  const [selectedDateRange, setSelectedDateRange] = useState<string>("");
  const [journalFiles, setJournalFiles] = useState<string[]>([]);

  // Load journal files from environment variable on mount
  useEffect(() => {
    async function loadJournalFiles() {
      try {
        const files = await invoke<string[]>("get_journal_files");
        setJournalFiles(files);
        // If no journal file is selected and files are available, select the first one
        if (!selectedJournalFile && files.length > 0) {
          onJournalFileChange(files[0]);
        }
      } catch (error) {
        console.error("Failed to load journal files:", error);
        setJournalFiles([]);
      }
    }
    loadJournalFiles();
  }, [selectedJournalFile, onJournalFileChange]);

  // Helper function to get just the filename from a full path
  const getFileName = (filePath: string) => {
    return filePath.split("/").pop() || filePath;
  };

  // Clear search query
  const clearSearch = () => {
    onSearchQueryChange("");
  };

  // Clear date range
  const clearDateRange = () => {
    setSelectedDateRange("");
    onDateRangeChange(null);
  };

  // Handle preset toggle selection
  const handlePresetSelection = (keys: Set<React.Key>) => {
    const selected = Array.from(keys)[0] as string;
    if (selected) {
      setSelectedDateRange(selected);

      // Convert preset to date range
      const dates = getDateRange(selected);
      if (dates) {
        onDateRangeChange({
          start: dates.begin,
          end: dates.end,
        });
      }
    }
  };

  // Handle custom date range selection
  const handleCustomDateRange = (range: { start: DateValue; end: DateValue } | null) => {
    if (range) {
      onDateRangeChange(range);
      setSelectedDateRange(""); // Clear preset when custom is selected manually
    } else {
      onDateRangeChange(null);
    }
  };
  return (
    <div className="fixed left-0 top-0 w-80 h-screen bg-muted/30 border-r border-border p-6 overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold mb-3">Filters & Options</h2>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Journal File</label>
              {journalFiles.length === 0 && (
                <div className="mb-2">
                  <p className="text-sm text-red-500">Please set HLEDGER_JOURNAL_FILES or LEDGER_FILE</p>
                </div>
              )}
              <Select value={selectedJournalFile} onValueChange={onJournalFileChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a journal file">
                    {selectedJournalFile ? getFileName(selectedJournalFile) : "Select a journal file"}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {journalFiles.length > 0 ? (
                    journalFiles.map((file) => (
                      <SelectItem key={file} value={file}>
                        {getFileName(file)}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_files__" disabled>
                      No journal files available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-muted-foreground mb-2 block">Search Accounts</label>
              <JollySearchField value={searchQuery} onChange={onSearchQueryChange} onClear={clearSearch} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">Date Range</label>
                {(selectedDateRange || dateRange) && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-muted-foreground"
                    onClick={clearDateRange}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="space-y-0">
                <ToggleButtonGroup
                  selectedKeys={selectedDateRange ? [selectedDateRange] : []}
                  onSelectionChange={handlePresetSelection}
                >
                  <Toggle id="this-month" size="sm" className="text-xs font-normal">
                    This Month
                  </Toggle>
                  <Toggle id="last-month" size="sm" className="text-xs font-normal">
                    Last Month
                  </Toggle>
                  <Toggle id="this-year" size="sm" className="text-xs font-normal">
                    This Year
                  </Toggle>
                </ToggleButtonGroup>

                <JollyDateRangePicker className="w-full" value={dateRange} onChange={handleCustomDateRange} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
