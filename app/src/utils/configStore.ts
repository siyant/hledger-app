import { load } from "@tauri-apps/plugin-store";

interface AppConfig {
  hledgerPath: string | null;
  journalFiles: string[];
  lastSelectedJournalFile: string | null;
}

const STORE_FILE = "config.json";  // Renamed from journal-files.json

export async function loadConfig(): Promise<AppConfig> {
  const store = await load(STORE_FILE, { autoSave: true });
  
  const hledgerPath = (await store.get<string | null>("hledgerPath")) || null;
  const journalFiles = (await store.get<string[]>("journalFiles")) || [];
  const lastSelectedJournalFile = (await store.get<string | null>("lastSelectedJournalFile")) || null;
  
  console.log("Loaded from config store:", { hledgerPath, journalFiles, lastSelectedJournalFile });
  
  return { hledgerPath, journalFiles, lastSelectedJournalFile };
}

export async function saveHledgerPath(path: string): Promise<void> {
  const store = await load(STORE_FILE, { autoSave: true });
  await store.set("hledgerPath", path);
  console.log("Saved hledger path:", path);
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