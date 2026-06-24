import assert from "node:assert/strict";
import test from "node:test";
import { type FileItem } from "../../utils/fileManager.ts";
import { buildImportedFileItem, getDisplayFiles, getFilesForActiveTab, importSelectedFiles } from "./fileLibrary.ts";

const createFile = (id: number, type: FileItem["type"]): FileItem => ({
  id,
  name: `${id}.${type}`,
  path: `C:/Files/${id}.${type}`,
  internalName: `${id}.${type}`,
  type,
  date: "2026-06-17",
  size: "",
});

test("buildImportedFileItem maps selected paths into stored file metadata", () => {
  const item = buildImportedFileItem("C:/Files/report.pdf", 1000, 2, "2026-06-17");

  assert.deepEqual(item, {
    id: 1002,
    name: "report.pdf",
    path: "C:/Files/report.pdf",
    internalName: "report.pdf",
    type: "document",
    date: "2026-06-17",
    size: "",
  });
});

test("getDisplayFiles sorts newest files first and limits the recent view to 20 items", () => {
  const files = Array.from({ length: 25 }, (_, index) => createFile(index + 1, "other"));

  const display = getDisplayFiles(files, "最近文件");

  assert.equal(display.length, 20);
  assert.equal(display[0]?.id, 25);
  assert.equal(display[display.length - 1]?.id, 6);
});

test("getDisplayFiles filters files by the active tab", () => {
  const files = [
    createFile(1, "image"),
    createFile(2, "document"),
    createFile(3, "video"),
    createFile(4, "other"),
  ];

  assert.deepEqual(
    getDisplayFiles(files, "图片").map((file) => file.id),
    [1],
  );
  assert.deepEqual(
    getDisplayFiles(files, "文档").map((file) => file.id),
    [2],
  );
  assert.deepEqual(
    getDisplayFiles(files, "视频").map((file) => file.id),
    [3],
  );
  assert.deepEqual(
    getDisplayFiles(files, "所有文件").map((file) => file.id),
    [4, 3, 2, 1],
  );
});

test("getDisplayFiles filters by currentFolderId when activeTab is 所有文件", () => {
  const files = [
    { ...createFile(1, "image"), folderId: "f1" },
    { ...createFile(2, "document"), folderId: "f1" },
    { ...createFile(3, "video"), folderId: "f2" },
    createFile(4, "other"),
  ];

  assert.deepEqual(
    getDisplayFiles(files, "所有文件", "f1").map((file) => file.id),
    [2, 1],
  );

  assert.deepEqual(
    getDisplayFiles(files, "所有文件", "f2").map((file) => file.id),
    [3],
  );

  assert.deepEqual(
    getDisplayFiles(files, "所有文件", undefined).map((file) => file.id),
    [4],
  );
});

test("importSelectedFiles copies every file and returns matching metadata entries", async () => {
  const copied: Array<{ srcPath: string; destFilename: string }> = [];

  const files = await importSelectedFiles(
    ["C:/Files/report.pdf", "C:/Files/photo.png"],
    async (srcPath, destFilename) => {
      copied.push({ srcPath, destFilename });
      return `Storage/${destFilename}`;
    },
    "2026-06-17",
    5000,
  );

  assert.deepEqual(copied, [
    { srcPath: "C:/Files/report.pdf", destFilename: "report.pdf" },
    { srcPath: "C:/Files/photo.png", destFilename: "photo.png" },
  ]);
  assert.deepEqual(
    files.map((file) => ({ id: file.id, name: file.name, type: file.type })),
    [
      { id: 5000, name: "report.pdf", type: "document" },
      { id: 5001, name: "photo.png", type: "image" },
    ],
  );
});

test("getFilesForActiveTab keeps all matching files for bulk actions", () => {
  const files = [
    createFile(1, "image"),
    createFile(2, "document"),
    createFile(3, "image"),
  ];

  assert.deepEqual(
    getFilesForActiveTab(files, "最近文件").map((file) => file.id),
    [1, 2, 3],
  );
  assert.deepEqual(
    getFilesForActiveTab(files, "图片").map((file) => file.id),
    [1, 3],
  );
});
