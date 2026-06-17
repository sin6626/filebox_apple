import { copyFileToStorage, getFileType, type FileItem } from "../../utils/fileManager.ts";

export type FileLibraryTab = "最近文件" | "所有文件" | "图片" | "文档" | "视频";

const matchesTab = (file: FileItem, activeTab: FileLibraryTab) => {
  if (activeTab === "最近文件" || activeTab === "所有文件") return true;
  if (activeTab === "图片") return file.type === "image";
  if (activeTab === "文档") return file.type === "document";
  if (activeTab === "视频") return file.type === "video";
  return true;
};

export const getFilesForActiveTab = (files: FileItem[], activeTab: FileLibraryTab): FileItem[] =>
  files.filter((file) => matchesTab(file, activeTab));

export const buildImportedFileItem = (
  filePath: string,
  idBase: number,
  index: number,
  date: string,
): FileItem => {
  const name = filePath.split(/[\\/]/).pop() ?? filePath;

  return {
    id: idBase + index,
    name,
    path: filePath,
    internalName: name,
    type: getFileType(name),
    date,
    size: "",
  };
};

export const importSelectedFiles = async (
  selectedPaths: string[],
  copyFile: (srcPath: string, destFilename: string) => Promise<string> = copyFileToStorage,
  date: string = new Date().toISOString().slice(0, 10),
  idBase: number = Date.now(),
): Promise<FileItem[]> => {
  const items: FileItem[] = [];

  for (const [index, filePath] of selectedPaths.entries()) {
    const item = buildImportedFileItem(filePath, idBase, index, date);
    await copyFile(filePath, item.internalName);
    items.push(item);
  }

  return items;
};

export const getDisplayFiles = (files: FileItem[], activeTab: FileLibraryTab): FileItem[] => {
  const displayFiles = getFilesForActiveTab(files, activeTab).sort((left, right) => right.id - left.id);

  if (activeTab === "最近文件") {
    return displayFiles.slice(0, 20);
  }

  return displayFiles;
};
