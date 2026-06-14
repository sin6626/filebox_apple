import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow, PhysicalSize, PhysicalPosition, Window } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Folder, Image, FileText, Video, Minimize2, Clock, Plus, LayoutGrid, CheckCircle2, StickyNote } from "lucide-react";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath as openAppPath } from "@tauri-apps/plugin-opener";
import { FileItem, copyFileToStorage, getFileType } from "../utils/fileManager";

export function AssistiveTouch() {
  const [isIdle, setIsIdle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  
  // App Launcher state
  const [currentMenu, setCurrentMenu] = useState<'main' | 'apps'>('main');
  const [apps, setApps] = useState<{id: number; name: string; path: string; icon?: string; gridIndex?: number}[]>([]);

  // Screen Recorder shortcut
  const [screenRecorderApp, setScreenRecorderApp] = useState<{name: string; path: string; icon?: string} | null>(null);

  const [isEditMode, setIsEditMode] = useState(false);
  const [newlyAddedAppIds, setNewlyAddedAppIds] = useState<number[]>([]);
  const [draggedAppId, setDraggedAppId] = useState<number | null>(null);

  // 自动清理新添加的 app 动画 ID，防止入场动画在退出重进时二次播放
  useEffect(() => {
    if (newlyAddedAppIds.length > 0) {
      const timer = setTimeout(() => {
        setNewlyAddedAppIds([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [newlyAddedAppIds]);
  const [dragOffset, setDragOffset] = useState<{x: number; y: number}>({x: 0, y: 0});
  const dragStartPos = useRef<{x: number; y: number} | null>(null);
  const dragAppIdRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const savedApps = localStorage.getItem("filebox-apps");
    if (savedApps) {
      try {
        const parsed = JSON.parse(savedApps);
        let availableSlots = [0,1,2,3,5,6,7,8];
        parsed.forEach((app: any) => {
          if (app.gridIndex !== undefined) {
            availableSlots = availableSlots.filter(s => s !== app.gridIndex);
          }
        });
        parsed.forEach((app: any) => {
          if (app.gridIndex === undefined) {
            app.gridIndex = availableSlots.shift();
          }
        });
        setApps(parsed);
      } catch (e) {}
    }
    const savedRecorder = localStorage.getItem("filebox-screen-recorder");
    if (savedRecorder) {
      try {
        setScreenRecorderApp(JSON.parse(savedRecorder));
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    let unlistenDrop: Promise<() => void>;

    // Handle drag and drop for apps
    unlistenDrop = listen<{ paths: string[], position: { x: number, y: number } }>("tauri://drag-drop", async (event) => {
      // Only process drops if we are in the apps menu
      if (currentMenu !== 'apps') return;

      const { paths, position } = event.payload;
      
      let targetIndex = -1;
      if (position) {
        const size = await getCurrentWindow().innerSize();
        const col = Math.floor(Math.max(0, Math.min(2, position.x / (size.width / 3))));
        const row = Math.floor(Math.max(0, Math.min(2, position.y / (size.height / 3))));
        targetIndex = row * 3 + col;
      }

      if (paths && paths.length > 0) {
        const selected = paths.filter(p => p.toLowerCase().endsWith('.exe') || p.toLowerCase().endsWith('.lnk'));
        if (selected.length > 0) {
          const newApps: any[] = [];
          for (let i = 0; i < selected.length; i++) {
            const filePath = selected[i];
            const name = filePath.split(/[\\/]/).pop()?.split('.')[0] ?? "未知";
            const id = Date.now() + i;
            let icon: string | undefined;
            try {
              const b64 = await invoke<string>("get_app_icon", { path: filePath });
              if (b64) icon = `data:image/png;base64,${b64}`;
            } catch (e) {}
            newApps.push({ id, name, path: filePath, icon });
          }
          
          const addedIds = newApps.map(a => a.id);
          setNewlyAddedAppIds(prev => [...prev, ...addedIds]);
          
          setApps(prevApps => {
            let currentIdx = targetIndex;
            if (currentIdx === 4) currentIdx = -1;
            
            const updatedApps = [...prevApps];
            newApps.forEach(newApp => {
              if (currentIdx !== -1 && !updatedApps.some(a => a.gridIndex === currentIdx)) {
                newApp.gridIndex = currentIdx;
                currentIdx = -1; 
              } else {
                const avail = [0,1,2,3,5,6,7,8].find(i => !updatedApps.some(a => a.gridIndex === i));
                if (avail !== undefined) newApp.gridIndex = avail;
              }
              if (newApp.gridIndex !== undefined) {
                updatedApps.push(newApp);
              }
            });
            localStorage.setItem("filebox-apps", JSON.stringify(updatedApps));
            return updatedApps;
          });
          triggerToast(`已添加 ${selected.length} 个应用`);
        } else {
          triggerToast("请拖入 .exe 或 .lnk 文件");
        }
      }
    });

    return () => {
      unlistenDrop.then(f => f());
    };
  }, [currentMenu]);

  const saveApps = (newApps: {id: number; name: string; path: string; icon?: string}[]) => {
    setApps(newApps);
    localStorage.setItem("filebox-apps", JSON.stringify(newApps));
  };

  const idleTimeoutRef = useRef<number | null>(null);

  // Drag logic
  const [isPointerDown, setIsPointerDown] = useState(false);
  const pointerDownPos = useRef({ x: 0, y: 0 });

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
    resetIdleTimer();
    return () => {
      if (idleTimeoutRef.current) window.clearTimeout(idleTimeoutRef.current);
    };
  }, [isExpanded]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || isExpanded) return;

    setIsPointerDown(true);
    pointerDownPos.current = { x: e.clientX, y: e.clientY };
    resetIdleTimer();
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    resetIdleTimer();
    if (isPointerDown && !isExpanded) {
      const dx = Math.abs(e.clientX - pointerDownPos.current.x);
      const dy = Math.abs(e.clientY - pointerDownPos.current.y);
      if (dx > 3 || dy > 3) {
        setIsPointerDown(false);
        getCurrentWindow().startDragging();
      }
    }
  };

  const handlePointerUp = () => {
    if (isPointerDown && !isExpanded) {
      setIsPointerDown(false);
      toggleExpand();
    }
  };

  const toggleExpand = async () => {
    const win = getCurrentWindow();
    const pos = await win.outerPosition();
    const scaleFactor = await win.scaleFactor();
    const offset = Math.round(110 * scaleFactor);

    if (isExpanded) {
      setIsExpanded(false);
      setNewlyAddedAppIds([]); // 收起时立刻清空新应用 ID 列表
      setTimeout(async () => {
        await win.setSize(new PhysicalSize(Math.round(80 * scaleFactor), Math.round(80 * scaleFactor)));
        await win.setPosition(new PhysicalPosition(pos.x + offset, pos.y + offset));
        setCurrentMenu('main');
      }, 300);
    } else {
      setIsIdle(false);
      await win.setPosition(new PhysicalPosition(pos.x - offset, pos.y - offset));
      await win.setSize(new PhysicalSize(Math.round(300 * scaleFactor), Math.round(300 * scaleFactor)));
      setIsExpanded(true);
    }
  };

  const openDashboard = async (tab: string) => {
    try {
      toggleExpand();
      let dashboard = await Window.getByLabel("dashboard");
      if (!dashboard) {
        dashboard = new Window("dashboard", {
          title: "FileBox Dashboard",
          width: 1000,
          height: 700,
          decorations: false,
          transparent: true,
          center: true,
        });
      }
      await dashboard.show();
      await dashboard.setFocus();
      setTimeout(async () => {
        await dashboard?.emit("switch-tab", tab);
      }, 100);
    } catch (e) {
      console.error("Failed to open dashboard:", e);
    }
  };

  const openNote = async () => {
    try {
      toggleExpand();
      let noteWin = await Window.getByLabel("note");
      if (!noteWin) {
        noteWin = new Window("note", {
          title: "Sticky Note",
          width: 280,
          height: 280,
          decorations: false,
          transparent: true,
          alwaysOnTop: true,
        });
      }
      await noteWin.show();
      await noteWin.setFocus();
    } catch (e) {
      console.error(e);
    }
  };

  const handleRecordScreen = async () => {
    if (screenRecorderApp) {
      // Already configured, launch it
      try {
        if (isExpanded) toggleExpand();
        await invoke("run_app", { path: screenRecorderApp.path });
      } catch (e) {
        console.error(e);
        triggerToast("无法启动录屏程序");
      }
    } else {
      // Not configured, let user pick one
      await handleSetScreenRecorder();
    }
  };

  const handleSetScreenRecorder = async () => {
    try {
      if (isExpanded) toggleExpand();
      const selected = await openDialog({
        multiple: false,
        title: "选择关联的录屏软件",
        filters: [{ name: "应用", extensions: ["exe", "lnk"] }]
      });
      if (selected) {
        const filePath = Array.isArray(selected) ? selected[0] : selected;
        const name = filePath.split(/[\\/]/).pop()?.split('.')[0] ?? "未知";
        let icon: string | undefined;
        try {
          const b64 = await invoke<string>("get_app_icon", { path: filePath });
          if (b64) icon = `data:image/png;base64,${b64}`;
        } catch (e) {}
        const app = { name, path: filePath, icon };
        setScreenRecorderApp(app);
        localStorage.setItem("filebox-screen-recorder", JSON.stringify(app));
        triggerToast(`已关联录屏软件: ${name}`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddFile = async () => {
    try {
      toggleExpand();
      const selected = await openDialog({
        multiple: true,
        title: "选择文件添加到 FileBox",
      });
      if (selected && selected.length > 0) {
        const fileItems: FileItem[] = [];
        for (let i = 0; i < selected.length; i++) {
          const filePath = selected[i];
          const name = filePath.split(/[\\/]/).pop() ?? filePath;
          const internalName = name;
          
          await copyFileToStorage(filePath, internalName);
          
          fileItems.push({
            id: Date.now() + i,
            name,
            path: filePath,
            internalName,
            type: getFileType(name),
            date: new Date().toISOString().slice(0, 10),
            size: "",
          });
        }

        // 确保 dashboard 已打开，再发送事件
        let dashboard = await Window.getByLabel("dashboard");
        if (!dashboard) {
          dashboard = new Window("dashboard", {
            title: "FileBox Dashboard",
            width: 1000,
            height: 700,
            decorations: false,
            transparent: true,
            center: true,
          });
        }
        await dashboard.show();
        await dashboard.setFocus();
        // 稍微延迟，确保 dashboard 窗口已渲染完毕再发事件
        setTimeout(async () => {
          await dashboard?.emit("files-added", fileItems);
        }, 150);

        triggerToast(`成功添加 ${selected.length} 个文件`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleAddApp = async (targetIndex?: number) => {
    try {
      if (isExpanded) toggleExpand();
      const selected = await openDialog({
        multiple: true,
        title: "选择应用程序 (.exe, .lnk)",
        filters: [{ name: "应用", extensions: ["exe", "lnk"] }]
      });
      if (selected && selected.length > 0) {
        const newApps: any[] = [];
        for (let i = 0; i < selected.length; i++) {
          const filePath = selected[i];
          const name = filePath.split(/[\\/]/).pop()?.split('.')[0] ?? "未知";
          const id = Date.now() + i;
          let icon = undefined;
          try {
            const b64 = await invoke<string>("get_app_icon", { path: filePath });
            if (b64) icon = `data:image/png;base64,${b64}`;
          } catch (e) {}
          newApps.push({ id, name, path: filePath, icon });
        }
        
        const addedIds = newApps.map(a => a.id);
        setNewlyAddedAppIds(prev => [...prev, ...addedIds]);
        
        setApps(prevApps => {
          const updatedApps = [...prevApps];
          let currentIdx = targetIndex;
          if (currentIdx === 4 || currentIdx === undefined) currentIdx = -1;

          newApps.forEach(newApp => {
            if (currentIdx !== -1 && !updatedApps.some(a => a.gridIndex === currentIdx)) {
              newApp.gridIndex = currentIdx;
              currentIdx = -1; 
            } else {
              const avail = [0,1,2,3,5,6,7,8].find(i => !updatedApps.some(a => a.gridIndex === i));
              if (avail !== undefined) newApp.gridIndex = avail;
            }
            if (newApp.gridIndex !== undefined) {
              updatedApps.push(newApp);
            }
          });
          localStorage.setItem("filebox-apps", JSON.stringify(updatedApps));
          return updatedApps;
        });
        
        triggerToast(`成功添加 ${selected.length} 个应用`);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleLaunchApp = async (path: string) => {
    try {
      if (isExpanded) toggleExpand();
      await invoke("run_app", { path });
    } catch (e) {
      console.error(e);
      triggerToast("无法启动该程序");
    }
  };

  const handleRemoveApp = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    saveApps(apps.filter(app => app.id !== id));
  };

  const triggerToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => {
      setShowToast(null);
    }, 3000);
  };

  const mainMenuItems = [
    { icon: <Clock size={28} strokeWidth={1.5} />, label: "最近文件", onClick: () => openDashboard("最近文件") },
    { icon: <Folder size={28} strokeWidth={1.5} />, label: "所有文件", onClick: () => openDashboard("所有文件") },
    { icon: <Plus size={28} strokeWidth={1.5} />, label: "添加文件", onClick: handleAddFile },
    { icon: <Image size={28} strokeWidth={1.5} />, label: "图片", onClick: () => openDashboard("图片") },
    { icon: <Minimize2 size={28} strokeWidth={1.5} />, label: "收起", isCenter: true, onClick: toggleExpand },
    { icon: <FileText size={28} strokeWidth={1.5} />, label: "文档", onClick: () => openDashboard("文档") },
    { icon: <Video size={28} strokeWidth={1.5} />, label: "录制屏幕", onClick: handleRecordScreen, onContextMenu: handleSetScreenRecorder },
    { icon: <LayoutGrid size={28} strokeWidth={1.5} />, label: "我的应用", onClick: () => setCurrentMenu('apps') },
    { icon: <StickyNote size={28} strokeWidth={1.5} />, label: "便签", onClick: openNote },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center box-border bg-transparent relative">
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: -40, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="absolute top-0 z-50 flex items-center gap-2 px-4 py-2 bg-[rgba(30,30,30,0.95)] backdrop-blur-md rounded-full shadow-lg border border-[rgba(255,255,255,0.1)] text-white text-xs font-medium whitespace-nowrap"
          >
            <CheckCircle2 size={14} className="text-green-400" />
            {showToast}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          width: isExpanded ? 280 : 72,
          height: isExpanded ? 280 : 72,
          borderRadius: isExpanded ? 32 : 36,
          opacity: isExpanded ? 1 : (isIdle ? 0.35 : 1),
          backgroundColor: isExpanded ? "rgba(30,30,30,0.85)" : "rgba(28,28,30,0.95)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onPointerMove={handlePointerMove}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        className={`flex items-center justify-center overflow-hidden ${
          isExpanded
            ? "backdrop-blur-2xl border border-[rgba(255,255,255,0.08)]"
            : "border-none"
        } ${!isExpanded ? "cursor-pointer" : ""}`}
        style={{
          touchAction: "none",
          filter: "none",
          boxShadow: isExpanded
            ? "inset 0 1px 3px rgba(255,255,255,0.15), inset 0 -1px 3px rgba(0,0,0,0.4)"
            : "inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.5)",
        }}
      >
        <AnimatePresence mode="wait">
          {!isExpanded ? (
            <motion.div
              key="collapsed-content"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              transition={{ duration: 0.15 }}
              className="w-full h-full flex items-center justify-center pointer-events-none relative"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-[rgba(100,100,102,0.7)] flex items-center justify-center">
                <div className="w-[44px] h-[44px] rounded-full bg-[rgba(199,199,204,0.85)] flex items-center justify-center">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#ffffff] shadow-sm flex items-center justify-center">
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="expanded-content"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2, delay: 0.1 }}
              onClick={() => {
                if (isEditMode) setIsEditMode(false);
              }}
              className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4 select-none"
            >
              {currentMenu === 'main' ? (
                mainMenuItems.map((item, index) => (
                  <div
                    key={index}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                    }}
                    onContextMenu={(e) => {
                      if (item.onContextMenu) {
                        e.preventDefault();
                        e.stopPropagation();
                        item.onContextMenu();
                      }
                    }}
                    className={`flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                      item.isCenter ? "bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]" : "hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
                    }`}
                  >
                    <div className={`mb-1 transition-colors ${item.isCenter ? "text-white" : "text-gray-300 hover:text-white"}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[11px] font-medium tracking-wide transition-colors ${item.isCenter ? "text-white" : "text-gray-400"} max-w-[70px] truncate`}>
                      {item.label}
                    </span>
                  </div>
                ))
              ) : (
                Array.from({ length: 9 }).map((_, index) => {
                  if (index === 4) {
                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditMode) { setIsEditMode(false); return; }
                          setCurrentMenu('main');
                          setNewlyAddedAppIds([]); // 切换回主菜单时清空新应用动画状态
                        }}
                        className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] relative z-0"
                      >
                        <div className="mb-1 transition-colors text-white">
                          <Minimize2 size={28} strokeWidth={1.5} className="rotate-180" />
                        </div>
                        <span className="text-[11px] font-medium tracking-wide transition-colors text-white">
                          返回
                        </span>
                      </div>
                    );
                  }
                  
                  const app = apps.find(a => a.gridIndex === index);

                  if (app) {
                    const isDragging = draggedAppId === app.id;
                    return (
                      <motion.div
                        layout={!isDragging}
                        key={app.id}
                        initial={newlyAddedAppIds.includes(app.id) ? { scale: 0.5, opacity: 0 } : false}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 28 }}
                        style={{
                          x: isDragging ? dragOffset.x : 0,
                          y: isDragging ? dragOffset.y : 0,
                          scale: isDragging ? 1.15 : 1,
                          zIndex: isDragging ? 999 : 10,
                          position: 'relative' as const,
                          pointerEvents: 'auto' as const,
                          filter: isDragging ? "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.55))" : "none",
                        }}
                        onPointerDown={(e) => {
                          if ((e.target as HTMLElement).closest('[data-delete-btn]')) return;
                          if (e.button !== 0) return;
                          if (!isEditMode) {
                            longPressTimerRef.current = window.setTimeout(() => {
                              setIsEditMode(true);
                            }, 500);
                          } else {
                            e.currentTarget.setPointerCapture(e.pointerId);
                            dragStartPos.current = { x: e.clientX, y: e.clientY };
                            dragAppIdRef.current = app.id;
                            setDraggedAppId(app.id);
                            setDragOffset({ x: 0, y: 0 });
                          }
                        }}
                        onPointerMove={(e) => {
                          if (dragAppIdRef.current === app.id && dragStartPos.current) {
                            setDragOffset({
                              x: e.clientX - dragStartPos.current.x,
                              y: e.clientY - dragStartPos.current.y,
                            });
                          }
                        }}
                        onPointerUp={(e) => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                          if (dragAppIdRef.current === app.id) {
                            const gridEl = e.currentTarget.parentElement;
                            if (gridEl) {
                              const rect = gridEl.getBoundingClientRect();
                              const relX = e.clientX - rect.left;
                              const relY = e.clientY - rect.top;
                              const col = Math.floor(Math.max(0, Math.min(2, relX / (rect.width / 3))));
                              const row = Math.floor(Math.max(0, Math.min(2, relY / (rect.height / 3))));
                              const targetIndex = row * 3 + col;

                              if (targetIndex !== 4 && targetIndex !== app.gridIndex && targetIndex >= 0 && targetIndex <= 8) {
                                setApps(prev => {
                                  const next = [...prev];
                                  const draggedIdx = next.findIndex(a => a.id === app.id);
                                  const targetIdx = next.findIndex(a => a.gridIndex === targetIndex);
                                  if (targetIdx !== -1) {
                                    next[targetIdx] = { ...next[targetIdx], gridIndex: app.gridIndex };
                                  }
                                  next[draggedIdx] = { ...next[draggedIdx], gridIndex: targetIndex };
                                  localStorage.setItem("filebox-apps", JSON.stringify(next));
                                  return next;
                                });
                              }
                            }
                            dragAppIdRef.current = null;
                            setDraggedAppId(null);
                            setDragOffset({ x: 0, y: 0 });
                            dragStartPos.current = null;
                          }
                        }}
                        onPointerLeave={() => {
                          if (longPressTimerRef.current) {
                            clearTimeout(longPressTimerRef.current);
                            longPressTimerRef.current = null;
                          }
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          if (isEditMode) return;
                          handleLaunchApp(app.path);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          if (isEditMode) return;
                          handleLaunchApp(app.path);
                        }}
                        className={`flex flex-col items-center justify-center rounded-2xl relative group w-full h-full select-none ${
                          isDragging
                            ? "cursor-grabbing opacity-90 shadow-xl"
                            : isEditMode
                              ? "cursor-grab hover:bg-[rgba(255,255,255,0.03)]"
                              : "cursor-pointer hover:bg-[rgba(255,255,255,0.08)] active:scale-95 transition-all duration-200"
                        }`}
                        title={isEditMode ? "拖拽重新排序" : "长按编辑"}
                      >
                        <div className="flex flex-col items-center justify-center w-full h-full relative">
                          <AnimatePresence>
                            {isEditMode && (
                              <motion.div
                                data-delete-btn
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0, opacity: 0 }}
                                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                                className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-red-500 rounded-full flex items-center justify-center text-white cursor-pointer z-50 shadow-md hover:bg-red-400"
                                onPointerDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveApp(e, app.id);
                                }}
                              >
                                <span className="text-[12px] leading-none mb-[2px] font-bold">&times;</span>
                              </motion.div>
                            )}
                          </AnimatePresence>
                          <div className="mb-1 transition-colors text-blue-400 group-hover:text-blue-300 flex items-center justify-center pointer-events-none">
                            {app.icon ? (
                              <img src={app.icon} alt={app.name} className="w-7 h-7 object-contain drop-shadow-md" />
                            ) : (
                              <LayoutGrid size={28} strokeWidth={1.5} />
                            )}
                          </div>
                          <span className="text-[10px] font-medium tracking-wide transition-colors text-gray-300 w-full text-center px-1 truncate pointer-events-none">
                            {app.name}
                          </span>
                        </div>
                      </motion.div>
                    );
                  } else {
                    return (
                      <div
                        key={`empty-${index}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddApp(index);
                        }}
                        className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.5)] border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)] m-1"
                      >
                        <Plus size={20} strokeWidth={2} />
                      </div>
                    );
                  }
                })
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
