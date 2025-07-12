import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { invoke } from "@tauri-apps/api/core";
import { Plus, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { saveJournalFiles, removeJournalFile, loadConfig, saveHledgerPath } from "@/utils/configStore";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  // Handle hledger path change
  const handleHledgerPathChange = async (value: string) => {
    setHledgerPath(value);
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Manage Configuration</DialogTitle>
          <DialogDescription>Configure hledger settings and journal files</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* hledger Binary Path Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">hledger Binary Path</label>
            <Input
              value={hledgerPath}
              onChange={(e) => handleHledgerPathChange(e.target.value)}
              placeholder="Enter path to hledger binary (e.g., /usr/local/bin/hledger)"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Specify the full path to your hledger binary. Leave empty to use system PATH.
            </p>
          </div>

          {/* Journal Files Section */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Journal Files</label>
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
              <div className="text-center py-6 text-muted-foreground">
                <p className="text-sm">No journal files configured</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleAddFiles}>
            <Plus className="h-4 w-4 mr-2" />
            Select Files
          </Button>
          <DialogClose asChild>
            <Button variant="outline">Done</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}