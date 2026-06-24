import { invoke } from "@tauri-apps/api/core";

export interface FileItem {
  id: number;
  name: string;      // original name
  path: string;      // original path
  internalName: string; // name in storage
  type: string;
  date: string;
  size: string;
  folderId?: string;  // ID of the folder it belongs to
}

export interface FolderItem {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
}

export const loadMetadata = async (): Promise<FileItem[]> => {
  try {
    const data = await invoke<string>("load_metadata");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load metadata", e);
    return [];
  }
};

export const saveMetadata = async (files: FileItem[]): Promise<void> => {
  try {
    await invoke("save_metadata", { data: JSON.stringify(files) });
  } catch (e) {
    console.error("Failed to save metadata", e);
  }
};

export const loadFolders = async (): Promise<FolderItem[]> => {
  try {
    const data = await invoke<string>("load_folders");
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load folders", e);
    return [];
  }
};

export const saveFolders = async (folders: FolderItem[]): Promise<void> => {
  try {
    await invoke("save_folders", { data: JSON.stringify(folders) });
  } catch (e) {
    console.error("Failed to save folders", e);
  }
};

export const copyFileToStorage = async (srcPath: string, destFilename: string): Promise<string> => {
  return await invoke<string>("copy_file_to_storage", { srcPath, destFilename });
};

export const deleteFileFromStorage = async (filename: string): Promise<void> => {
  try {
    await invoke("delete_file", { filename });
  } catch (e) {
    console.error("Failed to delete file", e);
  }
};

export const getStorageDirPath = async (): Promise<string> => {
  return await invoke<string>("get_storage_dir_path");
};

export const openFileInSystem = async (filename: string): Promise<void> => {
  try {
    await invoke("open_file", { filename });
  } catch (e) {
    console.error("Failed to open file", e);
  }
};

export const getFileType = (name: string): string => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"].includes(ext)) return "image";
  if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext)) return "video";
  if (["doc", "docx", "pdf", "txt", "md", "xls", "xlsx", "ppt", "pptx"].includes(ext)) return "document";
  return "other";
};
