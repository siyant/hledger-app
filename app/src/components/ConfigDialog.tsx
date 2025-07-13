import { invoke } from "@tauri-apps/api/core";
import { CheckCircle, Loader2, Plus, Trash2, XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadConfig, removeJournalFile, saveHledgerPath, saveJournalFiles } from "@/utils/configStore";

interface ConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedJournalFile: string;
  onJournalFileChange: (file: string) => void;
  journalFiles: string[];
  onJournalFilesChange: (files: string[]) => void;
}

export function ConfigDialog({
  open,
  onOpenChange,
  selectedJournalFile,
  onJournalFileChange,
  journalFiles,
  onJournalFilesChange,
}: ConfigDialogProps) {
  const [hledgerPath, setHledgerPath] = useState("");
  const [isTestingPath, setIsTestingPath] = useState(false);
  const [hledgerVersion, setHledgerVersion] = useState<string | null>(null);
  const [pathError, setPathError] = useState<string | null>(null);

  // Load hledger path from store when dialog opens
  useEffect(() => {
    if (open) {
      async function loadHledgerPathFromStore() {
        try {
          const store = await loadConfig();
          setHledgerPath(store.hledgerPath || "");
        } catch (error) {
          console.error("Failed to load hledger path from store:", error);
          setHledgerPath("");
        }
      }
      loadHledgerPathFromStore();
    }
  }, [open]);

  // Test hledger path functionality
  const testHledgerPath = async (path: string) => {
    if (!path.trim()) {
      setPathError("Please enter a path");
      setHledgerVersion(null);
      return;
    }

    setIsTestingPath(true);
    setPathError(null);
    setHledgerVersion(null);

    try {
      const version = await invoke<string>("test_hledger_path", { path });
      setHledgerVersion(version);
      setPathError(null);

      // Sync to Tauri backend state
      await invoke("set_hledger_path", { path });
    } catch (error) {
      setPathError(error as string);
      setHledgerVersion(null);
    } finally {
      setIsTestingPath(false);
    }
  };

  // Handle hledger path change
  const handleHledgerPathChange = async (value: string) => {
    setHledgerPath(value);
    // Clear previous test results when path changes
    setHledgerVersion(null);
    setPathError(null);

    try {
      await saveHledgerPath(value);
    } catch (error) {
      console.error("Failed to save hledger path:", error);
    }
  };

  // Helper function to get just the filename from a full path
  const getFileName = (filePath: string) => {
    return filePath.split("/").pop() || filePath;
  };

  // Function to handle adding files
  const handleAddFiles = async () => {
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

        // Update parent state
        onJournalFilesChange(updatedFiles);

        // If no file is currently selected, select the first file from the updated list
        if (!selectedJournalFile && updatedFiles.length > 0) {
          onJournalFileChange(updatedFiles[0]);
        }
      }
    } catch (error) {
      console.error("Failed to select files:", error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Welcome to Hledger GUI!</DialogTitle>
          <DialogDescription>
            This app works with your existing hledger cli installation and journal files. Configure them to get started.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* hledger Binary Path Section */}
          <div className="grid gap-2">
            <Label htmlFor="hledgerPath">hledger binary path</Label>
            <div className="flex gap-2">
              <Input
                id="hledgerPath"
                value={hledgerPath}
                onChange={(e) => handleHledgerPathChange(e.target.value)}
                placeholder="e.g., /usr/local/bin/hledger"
                className="flex-1"
              />
              <Button
                onClick={() => testHledgerPath(hledgerPath)}
                disabled={isTestingPath || !hledgerPath.trim()}
                variant="outline"
                size="default"
              >
                {isTestingPath ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  "Test"
                )}
              </Button>
            </div>

            {/* Helper Text */}
            {!hledgerVersion && !pathError && (
              <p className="text-xs text-muted-foreground">
                Specify the full path to your hledger binary. Run `which hledger` to find it
              </p>
            )}

            {/* Test Result Display */}
            {hledgerVersion && (
              <div className="flex items-center gap-2 text-sm text-green-600">
                <CheckCircle className="h-4 w-4" />
                <span>{hledgerVersion}</span>
              </div>
            )}

            {pathError && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <XCircle className="h-4 w-4" />
                <span>{pathError}</span>
              </div>
            )}
          </div>

          {/* Journal Files Section */}
          <div className="grid gap-2">
            <Label className="">Journal files</Label>
            {journalFiles.length > 0 ? (
              <div className="space-y-2">
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {journalFiles.map((file) => (
                    <div key={file} className="flex items-center justify-between px-3 py-2 border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={file}>
                          {getFileName(file)}
                        </p>
                        <p className="text-xs text-muted-foreground truncate" title={file}>
                          {file}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="ml-2 text-destructive hover:text-destructive"
                        onClick={async () => {
                          try {
                            const updatedFiles = await removeJournalFile(file);
                            onJournalFilesChange(updatedFiles);

                            // If the removed file was selected, select another one
                            if (selectedJournalFile === file) {
                              if (updatedFiles.length > 0) {
                                onJournalFileChange(updatedFiles[0]);
                              } else {
                                onJournalFileChange("");
                              }
                            }
                            // If no file is selected and there are files available, select the first one
                            else if (!selectedJournalFile && updatedFiles.length > 0) {
                              onJournalFileChange(updatedFiles[0]);
                            }
                          } catch (error) {
                            console.error("Failed to remove file:", error);
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No files configured</p>
              </div>
            )}

            <Button onClick={handleAddFiles}>
              <Plus className="h-4 w-4 mr-2" />
              Add files
            </Button>
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
