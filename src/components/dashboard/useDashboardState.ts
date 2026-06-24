import { useEffect, useMemo, useState, useRef, type MouseEvent } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  copyFileToStorage,
  deleteFileFromStorage,
  loadMetadata,
  openFileInSystem,
  saveMetadata,
  loadFolders,
  saveFolders,
  type FileItem,
  type FolderItem,
} from "../../utils/fileManager";
import { getDisplayFiles, importSelectedFiles, type FileLibraryTab } from "../../features/files/fileLibrary";
import { listen } from "@tauri-apps/api/event";
import { getStorageDirPath } from "../../utils/fileManager";

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState<FileLibraryTab>("最近文件");
  const [isMaximized, setIsMaximized] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [storageDir, setStorageDir] = useState<string>("");
  
  // Folder states
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | undefined>(undefined);
  const [movingFile, setMovingFile] = useState<FileItem | null>(null);

  const currentFolderIdRef = useRef(currentFolderId);
  useEffect(() => {
    currentFolderIdRef.current = currentFolderId;
  }, [currentFolderId]);

  const win = getCurrentWindow();

  useEffect(() => {
    getStorageDirPath().then(setStorageDir);
  }, []);

  useEffect(() => {
    const unlisten = win.onResized(async () => {
      setIsMaximized(await win.isMaximized());
    });
    return () => {
      void unlisten.then((cleanup) => cleanup());
    };
  }, [win]);

  useEffect(() => {
    void loadMetadata().then((data) => {
      setFiles(data);
    });
    void loadFolders().then((data) => {
      setFolders(data);
    });
  }, []);

  useEffect(() => {
    const unlisten = win.listen("switch-tab", (event) => {
      if (typeof event.payload === "string") {
        setActiveTab(event.payload as FileLibraryTab);
      }
    });
    return () => {
      void unlisten.then((cleanup) => cleanup());
    };
  }, [win]);

  useEffect(() => {
    const unlisten = win.listen<FileItem[]>("files-added", (event) => {
      if (!Array.isArray(event.payload)) return;

      const folderId = currentFolderIdRef.current;
      setFiles((prev) => {
        const existingIds = new Set(prev.map((file) => file.id));
        const importedWithFolder = event.payload.map((file) => ({
          ...file,
          folderId: file.folderId !== undefined ? file.folderId : folderId,
        }));
        const nextFiles = [...prev, ...importedWithFolder.filter((file) => !existingIds.has(file.id))];
        void saveMetadata(nextFiles);
        return nextFiles;
      });
    });
    return () => {
      void unlisten.then((cleanup) => cleanup());
    };
  }, [win]);

  useEffect(() => {
    const unlistenDrop = listen<{ paths: string[] }>("tauri://drag-drop", async (event) => {
      if (!event.payload.paths || event.payload.paths.length === 0) return;
      try {
        const importedFiles = await importSelectedFiles(event.payload.paths, copyFileToStorage);
        const folderId = currentFolderIdRef.current;
        setFiles((prev) => {
          const existingIds = new Set(prev.map((file) => file.id));
          const importedWithFolder = importedFiles.map((file) => ({
            ...file,
            folderId,
          }));
          const nextFiles = [...prev, ...importedWithFolder.filter((file) => !existingIds.has(file.id))];
          void saveMetadata(nextFiles);
          return nextFiles;
        });
      } catch (error) {
        console.error("Failed to import dragged files", error);
      }
    });

    return () => {
      void unlistenDrop.then((unlisten) => unlisten());
    };
  }, []);

  const displayedFiles = useMemo(() => {
    let result = getDisplayFiles(files, activeTab, currentFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => f.name.toLowerCase().includes(q));
    }
    return result;
  }, [files, activeTab, searchQuery, currentFolderId]);

  const displayedFolders = useMemo(() => {
    if (activeTab !== "所有文件") return [];

    let result = folders.filter((f) => f.parentId === currentFolderId);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.name.toLowerCase().includes(q));
    }
    return result.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [folders, currentFolderId, activeTab, searchQuery]);

  const folderPath = useMemo(() => {
    const path: FolderItem[] = [];
    let currId = currentFolderId;
    while (currId) {
      const folder = folders.find((f) => f.id === currId);
      if (folder) {
        path.unshift(folder);
        currId = folder.parentId;
      } else {
        break;
      }
    }
    return path;
  }, [folders, currentFolderId]);

  const handleAddFile = async () => {
    try {
      let filters = undefined;
      if (activeTab === "图片") {
        filters = [{ name: "图片", extensions: ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico"] }];
      } else if (activeTab === "文档") {
        filters = [{ name: "文档", extensions: ["doc", "docx", "pdf", "txt", "md", "xls", "xlsx", "ppt", "pptx"] }];
      } else if (activeTab === "视频") {
        filters = [{ name: "视频", extensions: ["mp4", "webm", "mov", "avi", "mkv"] }];
      }

      const selected = await openDialog({ 
        multiple: true, 
        title: "选择文件添加到 FileBox",
        filters 
      });
      if (!selected || selected.length === 0) return;

      const importedFiles = await importSelectedFiles(selected, copyFileToStorage);
      setFiles((prev) => {
        const existingIds = new Set(prev.map((file) => file.id));
        const importedWithFolder = importedFiles.map((file) => ({
          ...file,
          folderId: currentFolderId,
        }));
        const nextFiles = [...prev, ...importedWithFolder.filter((file) => !existingIds.has(file.id))];
        void saveMetadata(nextFiles);
        return nextFiles;
      });
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearDirectory = async () => {
    const filesToDelete = getDisplayFiles(files, activeTab, currentFolderId);

    for (const file of filesToDelete) {
      await deleteFileFromStorage(file.internalName);
    }

    setFiles((prev) => {
      const removedIds = new Set(filesToDelete.map((file) => file.id));
      const nextFiles = prev.filter((file) => !removedIds.has(file.id));
      void saveMetadata(nextFiles);
      return nextFiles;
    });
  };

  const handleDeleteSingleFile = async (event: MouseEvent, file: FileItem) => {
    event.stopPropagation();
    await deleteFileFromStorage(file.internalName);
    setFiles((prev) => {
      const nextFiles = prev.filter((item) => item.id !== file.id);
      void saveMetadata(nextFiles);
      return nextFiles;
    });
  };

  const handleOpenFile = async (file: FileItem) => {
    if (file.type === "image" || file.type === "video") {
      setPreviewFile(file);
    } else {
      try {
        await openFileInSystem(file.internalName);
      } catch (error) {
        console.error("Failed to open file:", error);
      }
    }
  };

  const handleCreateFolder = async () => {
    const name = prompt("请输入文件夹名称：");
    if (!name || !name.trim()) return;
    const newFolder: FolderItem = {
      id: crypto.randomUUID(),
      name: name.trim(),
      parentId: currentFolderId,
      createdAt: new Date().toISOString(),
    };
    setFolders((prev) => {
      const next = [newFolder, ...prev];
      void saveFolders(next);
      return next;
    });
  };

  const handleOpenFolder = (folderId: string | undefined) => {
    setCurrentFolderId(folderId);
  };

  const handleRenameFolder = async (folder: FolderItem, event?: MouseEvent) => {
    if (event) event.stopPropagation();
    const newName = prompt("请输入新的文件夹名称：", folder.name);
    if (!newName || !newName.trim() || newName.trim() === folder.name) return;

    setFolders((prev) => {
      const next = prev.map((f) => (f.id === folder.id ? { ...f, name: newName.trim() } : f));
      void saveFolders(next);
      return next;
    });
  };

  const handleDeleteFolder = async (folder: FolderItem, event?: MouseEvent) => {
    if (event) event.stopPropagation();
    if (!confirm(`确定要删除文件夹 "${folder.name}" 吗？该文件夹下的文件将被移到上一级。`)) return;

    // 1. 将该文件夹内的文件的 folderId 设为 parentId
    setFiles((prev) => {
      const next = prev.map((file) => {
        if (file.folderId === folder.id) {
          return { ...file, folderId: folder.parentId };
        }
        return file;
      });
      void saveMetadata(next);
      return next;
    });

    // 2. 将子文件夹的 parentId 设为 parentId
    setFolders((prev) => {
      const nextFolders = prev
        .filter((f) => f.id !== folder.id)
        .map((f) => {
          if (f.parentId === folder.id) {
            return { ...f, parentId: folder.parentId };
          }
          return f;
        });
      void saveFolders(nextFolders);
      return nextFolders;
    });
  };

  const handleMoveFileToFolder = (file: FileItem, targetFolderId?: string) => {
    setFiles((prev) => {
      const next = prev.map((f) => (f.id === file.id ? { ...f, folderId: targetFolderId } : f));
      void saveMetadata(next);
      return next;
    });
    setMovingFile(null);
  };

  return {
    activeTab,
    displayedFiles,
    displayedFolders,
    folders,
    currentFolderId,
    folderPath,
    movingFile,
    files,
    isMaximized,
    searchQuery,
    previewFile,
    storageDir,
    setActiveTab,
    setSearchQuery,
    setPreviewFile,
    setMovingFile,
    handleAddFile,
    handleClearDirectory,
    handleDeleteSingleFile,
    handleOpenFile,
    handleCreateFolder,
    handleOpenFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveFileToFolder,
    win,
  };
}
