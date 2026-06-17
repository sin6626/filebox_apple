import { Window } from "@tauri-apps/api/window";
import type { FileItem } from "../../utils/fileManager.ts";

const DASHBOARD_LABEL = "dashboard";
const NOTE_LABEL = "note";

const dashboardOptions = {
  title: "FileBox Dashboard",
  width: 1000,
  height: 700,
  decorations: false,
  transparent: true,
  center: true,
} as const;

const noteOptions = {
  title: "Sticky Note",
  width: 280,
  height: 280,
  decorations: false,
  transparent: true,
  alwaysOnTop: true,
} as const;

export const ensureDashboardWindow = async () => {
  let dashboard = await Window.getByLabel(DASHBOARD_LABEL);
  if (!dashboard) {
    dashboard = new Window(DASHBOARD_LABEL, dashboardOptions);
  }
  return dashboard;
};

export const ensureNoteWindow = async () => {
  let noteWindow = await Window.getByLabel(NOTE_LABEL);
  if (!noteWindow) {
    noteWindow = new Window(NOTE_LABEL, noteOptions);
  }
  return noteWindow;
};

export const openDashboard = async (tab?: string) => {
  const dashboard = await ensureDashboardWindow();
  await dashboard.show();
  await dashboard.setFocus();

  if (tab) {
    setTimeout(async () => {
      await dashboard.emit("switch-tab", tab);
    }, 100);
  }

  return dashboard;
};

export const emitFilesAdded = async (fileItems: FileItem[]) => {
  const dashboard = await ensureDashboardWindow();
  await dashboard.show();
  await dashboard.setFocus();

  setTimeout(async () => {
    await dashboard.emit("files-added", fileItems);
  }, 150);

  return dashboard;
};

export const openNoteWindow = async () => {
  const noteWindow = await ensureNoteWindow();
  await noteWindow.show();
  await noteWindow.setFocus();
  return noteWindow;
};
