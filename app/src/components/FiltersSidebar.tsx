import { Button } from "@/components/ui/button";
import { JollyDateRangePicker } from "@/components/ui/date-picker";
import { JollySearchField } from "@/components/ui/searchfield";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Toggle, ToggleButtonGroup } from "@/components/ui/toggle";
import { type DateValue, getLocalTimeZone, today } from "@internationalized/date";
import { invoke } from "@tauri-apps/api/core";
import { X, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState, useEffect } from "react";
import { loadJournalStore, saveJournalFiles, saveLastSelectedFile, removeJournalFile } from "@/utils/journalStore";

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

  // Load journal files from store on mount
  useEffect(() => {
    async function loadJournalFilesFromStore() {
      try {
        const store = await loadJournalStore();
        setJournalFiles(store.journalFiles);

        // If no journal file is selected and we have a last selected file, use it
        if (!selectedJournalFile && store.lastSelectedJournalFile) {
          onJournalFileChange(store.lastSelectedJournalFile);
        }
        // Otherwise, if no journal file is selected but files are available, select the first one
        else if (!selectedJournalFile && store.journalFiles.length > 0) {
          onJournalFileChange(store.journalFiles[0]);
        }
      } catch (error) {
        console.error("Failed to load journal files from store:", error);
        setJournalFiles([]);
      }
    }
    loadJournalFilesFromStore();
  }, []); // Remove dependencies to only run once on mount

  // Save selected file to store when it changes
  useEffect(() => {
    if (selectedJournalFile) {
      saveLastSelectedFile(selectedJournalFile).catch(console.error);
    }
  }, [selectedJournalFile]);

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
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-muted-foreground">Journal Files</label>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={async () => {
                    try {
                      const files = await invoke<string[]>("select_journal_files");
                      console.log("Selected files:", files);

                      if (files && files.length > 0) {
                        // Merge new files with existing ones (avoid duplicates)
                        const existingFiles = new Set(journalFiles);
                        const newFiles = files.filter((file) => !existingFiles.has(file));
                        const updatedFiles = [...journalFiles, ...newFiles];

                        // Save the updated files to the store
                        await saveJournalFiles(updatedFiles);

                        // Update local state
                        setJournalFiles(updatedFiles);

                        // If no file is currently selected, select the first new file
                        if (!selectedJournalFile && newFiles.length > 0) {
                          onJournalFileChange(newFiles[0]);
                        }
                      }
                    } catch (error) {
                      console.error("Failed to select files:", error);
                    }
                  }}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Files
                </Button>
              </div>

              {journalFiles.length > 0 ? (
                <div className="space-y-2">
                  <Select value={selectedJournalFile} onValueChange={onJournalFileChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a journal file" />
                    </SelectTrigger>
                    <SelectContent>
                      {journalFiles.map((file) => (
                        <SelectItem key={file} value={file}>
                          {getFileName(file)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* File management */}
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {journalFiles.map((file) => (
                      <div
                        key={file}
                        className="flex items-center justify-between text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1"
                      >
                        <span className="truncate flex-1" title={file}>
                          {getFileName(file)}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 w-5 p-0 text-muted-foreground hover:text-destructive"
                          onClick={async () => {
                            try {
                              const updatedFiles = await removeJournalFile(file);
                              setJournalFiles(updatedFiles);

                              // If the removed file was selected, select another one
                              if (selectedJournalFile === file) {
                                if (updatedFiles.length > 0) {
                                  onJournalFileChange(updatedFiles[0]);
                                } else {
                                  onJournalFileChange("");
                                }
                              }
                            } catch (error) {
                              console.error("Failed to remove file:", error);
                            }
                          }}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p className="text-sm mb-2">No journal files configured</p>
                  <Button
                    size="sm"
                    onClick={async () => {
                      try {
                        const files = await invoke<string[]>("select_journal_files");
                        console.log("Selected files:", files);

                        if (files && files.length > 0) {
                          // Save the new files to the store
                          await saveJournalFiles(files);

                          // Update local state
                          setJournalFiles(files);

                          // Select the first file
                          onJournalFileChange(files[0]);
                        }
                      } catch (error) {
                        console.error("Failed to select files:", error);
                      }
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Your First Journal File
                  </Button>
                </div>
              )}
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
