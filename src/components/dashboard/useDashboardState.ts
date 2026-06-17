import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  copyFileToStorage,
  deleteFileFromStorage,
  loadMetadata,
  openFileInSystem,
  saveMetadata,
  type FileItem,
} from "../../utils/fileManager";
import { getDisplayFiles, importSelectedFiles, type FileLibraryTab } from "../../features/files/fileLibrary";

export function useDashboardState() {
  const [activeTab, setActiveTab] = useState<FileLibraryTab>("最近文件");
  const [isMaximized, setIsMaximized] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const win = getCurrentWindow();

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

      setFiles((prev) => {
        const existingIds = new Set(prev.map((file) => file.id));
        const nextFiles = [...prev, ...event.payload.filter((file) => !existingIds.has(file.id))];
        void saveMetadata(nextFiles);
        return nextFiles;
      });
      setActiveTab("最近文件");
    });
    return () => {
      void unlisten.then((cleanup) => cleanup());
    };
  }, [win]);

  const displayedFiles = useMemo(() => getDisplayFiles(files, activeTab), [files, activeTab]);

  const handleAddFile = async () => {
    try {
      const selected = await openDialog({ multiple: true, title: "选择文件添加到 FileBox" });
      if (!selected || selected.length === 0) return;

      const importedFiles = await importSelectedFiles(selected, copyFileToStorage);
      setFiles((prev) => {
        const existingIds = new Set(prev.map((file) => file.id));
        const nextFiles = [...prev, ...importedFiles.filter((file) => !existingIds.has(file.id))];
        void saveMetadata(nextFiles);
        return nextFiles;
      });
      setActiveTab("最近文件");
    } catch (error) {
      console.error(error);
    }
  };

  const handleClearDirectory = async () => {
    const filesToDelete = getDisplayFiles(files, activeTab);

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
    try {
      await openFileInSystem(file.internalName);
    } catch (error) {
      console.error("Failed to open file:", error);
    }
  };

  return {
    activeTab,
    displayedFiles,
    files,
    isMaximized,
    setActiveTab,
    handleAddFile,
    handleClearDirectory,
    handleDeleteSingleFile,
    handleOpenFile,
    win,
  };
}
