import { load } from "@tauri-apps/plugin-store";

interface JournalStore {
  journalFiles: string[];
  lastSelectedJournalFile: string | null;
}

const STORE_FILE = "journal-files.json";

export async function loadJournalStore(): Promise<JournalStore> {
  const store = await load(STORE_FILE, { autoSave: true });

  const journalFiles = (await store.get<string[]>("journalFiles")) || [];
  const lastSelectedJournalFile = (await store.get<string | null>("lastSelectedJournalFile")) || null;

  console.log("Loaded from store:", { journalFiles, lastSelectedJournalFile });

  return { journalFiles, lastSelectedJournalFile };
}

export async function saveJournalFiles(files: string[]): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: true });
  await store.set("journalFiles", files);
  console.log("Saved journal files:", files);
}

export async function saveLastSelectedFile(file: string): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: true });
  await store.set("lastSelectedJournalFile", file);
  console.log("Saved last selected file:", file);
}

export async function removeJournalFile(fileToRemove: string): Promise<string[]> {
  const store = await load(STORE_FILE, { autoSave: true });
  const currentFiles = (await store.get<string[]>("journalFiles")) || [];
  const updatedFiles = currentFiles.filter((file) => file !== fileToRemove);
  await store.set("journalFiles", updatedFiles);
  console.log("Removed file:", fileToRemove, "Updated files:", updatedFiles);
  return updatedFiles;
}
