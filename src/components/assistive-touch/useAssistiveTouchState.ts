import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, PhysicalPosition, PhysicalSize } from "@tauri-apps/api/window";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  assignAppsToGrid,
  buildLauncherApps,
  moveAppToGrid,
  normalizeApps,
  type LauncherApp,
  type ScreenRecorderApp,
} from "../../features/apps/appLauncher";
import { importSelectedFiles } from "../../features/files/fileLibrary";
import { emitFilesAdded, openDashboard, openNoteWindow } from "../../features/windows/windowManager";

type MenuName = "main" | "apps";

const APPS_STORAGE_KEY = "filebox-apps";
const RECORDER_STORAGE_KEY = "filebox-screen-recorder";

export function useAssistiveTouchState() {
  const [isIdle, setIsIdle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [currentMenu, setCurrentMenu] = useState<MenuName>("main");
  const [apps, setApps] = useState<LauncherApp[]>([]);
  const [screenRecorderApp, setScreenRecorderApp] = useState<ScreenRecorderApp | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [newlyAddedAppIds, setNewlyAddedAppIds] = useState<number[]>([]);
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPointerDown, setIsPointerDown] = useState(false);

  const pointerDownPos = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const dragAppIdRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const idleTimeoutRef = useRef<number | null>(null);

  const triggerToast = (message: string) => {
    setShowToast(message);
    setTimeout(() => setShowToast(null), 3000);
  };

  const persistApps = (nextApps: LauncherApp[]) => {
    setApps(nextApps);
    localStorage.setItem(APPS_STORAGE_KEY, JSON.stringify(nextApps));
  };

  const resolveAppIcon = async (path: string) => {
    try {
      const base64 = await invoke<string>("get_app_icon", { path });
      return base64 ? `data:image/png;base64,${base64}` : undefined;
    } catch {
      return undefined;
    }
  };

  const toggleExpand = async () => {
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const scaleFactor = await win.scaleFactor();
    const offset = Math.round(110 * scaleFactor);

    if (isExpanded) {
      setIsExpanded(false);
      setNewlyAddedAppIds([]);
      setTimeout(async () => {
        await win.setSize(new PhysicalSize(Math.round(80 * scaleFactor), Math.round(80 * scaleFactor)));
        await win.setPosition(new PhysicalPosition(pos.x + offset, pos.y + offset));
        setCurrentMenu("main");
      }, 300);
      return;
    }

    setIsIdle(false);
    await win.setPosition(new PhysicalPosition(pos.x - offset, pos.y - offset));
    await win.setSize(new PhysicalSize(Math.round(300 * scaleFactor), Math.round(300 * scaleFactor)));
    setIsExpanded(true);
  };

  const resetIdleTimer = () => {
    setIsIdle(false);
    if (idleTimeoutRef.current) {
      window.clearTimeout(idleTimeoutRef.current);
    }
    idleTimeoutRef.current = window.setTimeout(() => {
      if (!isExpanded) setIsIdle(true);
    }, 3000);
  };

  useEffect(() => {
    const savedApps = localStorage.getItem(APPS_STORAGE_KEY);
    if (savedApps) {
      try {
        setApps(normalizeApps(JSON.parse(savedApps) as LauncherApp[]));
      } catch {
        setApps([]);
      }
    }

    const savedRecorder = localStorage.getItem(RECORDER_STORAGE_KEY);
    if (savedRecorder) {
      try {
        setScreenRecorderApp(JSON.parse(savedRecorder) as ScreenRecorderApp);
      } catch {
        setScreenRecorderApp(null);
      }
    }
  }, []);

  useEffect(() => {
    resetIdleTimer();
    return () => {
      if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    };
  }, [isExpanded]);

  useEffect(() => {
    if (newlyAddedAppIds.length === 0) return;
    const timer = window.setTimeout(() => {
      setNewlyAddedAppIds([]);
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [newlyAddedAppIds]);

  useEffect(() => {
    const unlistenDrop = listen<{ paths: string[]; position: { x: number; y: number } }>("tauri://drag-drop", async (event) => {
      if (currentMenu !== "apps") return;

      const selected = event.payload.paths.filter((path) => path.toLowerCase().endsWith(".exe") || path.toLowerCase().endsWith(".lnk"));
      if (selected.length === 0) {
        triggerToast("请拖入 .exe 或 .lnk 文件");
        return;
      }

      let targetIndex: number | undefined;
      if (event.payload.position) {
        const size = await getCurrentWindow().innerSize();
        const col = Math.floor(Math.max(0, Math.min(2, event.payload.position.x / (size.width / 3))));
        const row = Math.floor(Math.max(0, Math.min(2, event.payload.position.y / (size.height / 3))));
        targetIndex = row * 3 + col;
      }

      const newApps = await buildLauncherApps(selected, resolveAppIcon);
      setNewlyAddedAppIds((prev) => [...prev, ...newApps.map((app) => app.id)]);
      persistApps(assignAppsToGrid(apps, newApps, targetIndex));
      triggerToast(`已添加 ${selected.length} 个应用`);
    });

    return () => {
      void unlistenDrop.then((unlisten) => unlisten());
    };
  }, [apps, currentMenu]);

  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0 || isExpanded) return;
    setIsPointerDown(true);
    pointerDownPos.current = { x: event.clientX, y: event.clientY };
    resetIdleTimer();
  };

  const handlePointerMove = (event: PointerEvent) => {
    resetIdleTimer();
    if (isPointerDown && !isExpanded) {
      const dx = Math.abs(event.clientX - pointerDownPos.current.x);
      const dy = Math.abs(event.clientY - pointerDownPos.current.y);
      if (dx > 3 || dy > 3) {
        setIsPointerDown(false);
        void getCurrentWindow().startDragging();
      }
    }
  };

  const handlePointerUp = () => {
    if (isPointerDown && !isExpanded) {
      setIsPointerDown(false);
      void toggleExpand();
    }
  };

  const handleOpenDashboard = async (tab: string) => {
    await toggleExpand();
    await openDashboard(tab);
  };

  const handleOpenNote = async () => {
    await toggleExpand();
    await openNoteWindow();
  };

  const handleSetScreenRecorder = async () => {
    try {
      if (isExpanded) await toggleExpand();
      const selected = await openDialog({
        multiple: false,
        title: "选择关联的录屏软件",
        filters: [{ name: "应用", extensions: ["exe", "lnk"] }],
      });
      if (!selected) return;

      const path = Array.isArray(selected) ? selected[0] : selected;
      const icon = await resolveAppIcon(path);
      const app = { name: path.split(/[\\/]/).pop()?.split(".")[0] ?? "未知", path, icon };
      setScreenRecorderApp(app);
      localStorage.setItem(RECORDER_STORAGE_KEY, JSON.stringify(app));
      triggerToast(`已关联录屏软件: ${app.name}`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleRecordScreen = async () => {
    if (!screenRecorderApp) {
      await handleSetScreenRecorder();
      return;
    }

    try {
      if (isExpanded) await toggleExpand();
      await invoke("run_app", { path: screenRecorderApp.path });
    } catch (error) {
      console.error(error);
      triggerToast("无法启动录屏程序");
    }
  };

  const handleAddFile = async () => {
    try {
      await toggleExpand();
      const selected = await openDialog({
        multiple: true,
        title: "选择文件添加到 FileBox",
      });
      if (!selected || selected.length === 0) return;

      const fileItems = await importSelectedFiles(selected);
      await emitFilesAdded(fileItems);
      triggerToast(`成功添加 ${selected.length} 个文件`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAddApp = async (targetIndex?: number) => {
    try {
      if (isExpanded) await toggleExpand();
      const selected = await openDialog({
        multiple: true,
        title: "选择应用程序 (.exe, .lnk)",
        filters: [{ name: "应用", extensions: ["exe", "lnk"] }],
      });
      if (!selected || selected.length === 0) return;

      const newApps = await buildLauncherApps(selected, resolveAppIcon);
      setNewlyAddedAppIds((prev) => [...prev, ...newApps.map((app) => app.id)]);
      persistApps(assignAppsToGrid(apps, newApps, targetIndex));
      triggerToast(`成功添加 ${selected.length} 个应用`);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLaunchApp = async (path: string) => {
    try {
      if (isExpanded) await toggleExpand();
      await invoke("run_app", { path });
    } catch (error) {
      console.error(error);
      triggerToast("无法启动该程序");
    }
  };

  const handleRemoveApp = (event: MouseEvent, id: number) => {
    event.preventDefault();
    event.stopPropagation();
    persistApps(apps.filter((app) => app.id !== id));
  };

  const handleAppGridBack = () => {
    if (isEditMode) {
      setIsEditMode(false);
      return;
    }
    setCurrentMenu("main");
    setNewlyAddedAppIds([]);
  };

  const handleAppPointerDown = (event: PointerEvent, app: LauncherApp) => {
    if ((event.target as HTMLElement).closest("[data-delete-btn]")) return;
    if (event.button !== 0) return;

    if (!isEditMode) {
      longPressTimerRef.current = window.setTimeout(() => {
        setIsEditMode(true);
      }, 500);
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartPos.current = { x: event.clientX, y: event.clientY };
    dragAppIdRef.current = app.id;
    setDraggedAppId(app.id);
    setDragOffset({ x: 0, y: 0 });
  };

  const handleAppPointerMove = (event: PointerEvent, app: LauncherApp) => {
    if (dragAppIdRef.current !== app.id || !dragStartPos.current) return;
    setDragOffset({
      x: event.clientX - dragStartPos.current.x,
      y: event.clientY - dragStartPos.current.y,
    });
  };

  const handleAppPointerUp = (event: PointerEvent, app: LauncherApp) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (dragAppIdRef.current !== app.id) return;

    const gridElement = event.currentTarget.parentElement;
    if (gridElement) {
      const rect = gridElement.getBoundingClientRect();
      const relX = event.clientX - rect.left;
      const relY = event.clientY - rect.top;
      const col = Math.floor(Math.max(0, Math.min(2, relX / (rect.width / 3))));
      const row = Math.floor(Math.max(0, Math.min(2, relY / (rect.height / 3))));
      const targetIndex = row * 3 + col;

      if (targetIndex !== 4 && targetIndex >= 0 && targetIndex <= 8) {
        persistApps(moveAppToGrid(apps, app.id, targetIndex));
      }
    }

    dragAppIdRef.current = null;
    setDraggedAppId(null);
    setDragOffset({ x: 0, y: 0 });
    dragStartPos.current = null;
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  return {
    apps,
    currentMenu,
    dragOffset,
    draggedAppId,
    isEditMode,
    isExpanded,
    isIdle,
    newlyAddedAppIds,
    showToast,
    setCurrentMenu,
    setIsEditMode,
    toggleExpand,
    handleAddApp,
    handleAddFile,
    handleAppGridBack,
    handleAppPointerDown,
    handleAppPointerMove,
    handleAppPointerUp,
    handleLaunchApp,
    handleOpenDashboard,
    handleOpenNote,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    handleRecordScreen,
    handleRemoveApp,
    handleSetScreenRecorder,
    clearLongPress,
  };
}
