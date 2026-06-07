import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow, PhysicalSize, PhysicalPosition, Window } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";
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
  const [apps, setApps] = useState<{id: number; name: string; path: string; icon?: string}[]>([]);

  useEffect(() => {
    const savedApps = localStorage.getItem("filebox-apps");
    if (savedApps) {
      try {
        setApps(JSON.parse(savedApps));
      } catch (e) {}
    }
  }, []);

  const saveApps = (newApps: {id: number; name: string; path: string; icon?: string}[]) => {
    setApps(newApps);
    localStorage.setItem("filebox-apps", JSON.stringify(newApps));
  };

  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

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
    
    // If recording, tapping the ball stops it
    if (isRecording) {
      handleRecordScreen();
      return;
    }

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
    if (isPointerDown && !isExpanded && !isRecording) {
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
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      if (isExpanded) toggleExpand();
      
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        try {
          const { BaseDirectory, writeFile } = await import('@tauri-apps/plugin-fs');
          const arrayBuffer = await blob.arrayBuffer();
          const fileName = `ScreenRecord_${new Date().getTime()}.webm`;
          await writeFile(fileName, new Uint8Array(arrayBuffer), { baseDir: BaseDirectory.Video });
          triggerToast("录像已存入视频库");
        } catch (e) {
          console.error("Failed to save", e);
          triggerToast("保存录像失败");
        }
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      triggerToast("正在录制屏幕 (再次点击悬浮球停止)");
    } catch (e) {
      console.error(e);
      triggerToast("已取消录像");
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

  const handleAddApp = async () => {
    try {
      if (isExpanded) toggleExpand();
      const selected = await openDialog({
        multiple: true,
        title: "选择应用程序 (.exe, .lnk)",
        filters: [{ name: "应用", extensions: ["exe", "lnk"] }]
      });
      if (selected && selected.length > 0) {
        const newApps = [];
        for (let i = 0; i < selected.length; i++) {
          const filePath = selected[i];
          const name = filePath.split(/[\\/]/).pop()?.split('.')[0] ?? "未知";
          const id = Date.now() + i;
          let icon = undefined;
          try {
            const b64 = await invoke<string>("get_app_icon", { path: filePath });
            if (b64) icon = `data:image/png;base64,${b64}`;
          } catch (e) {
            console.error("Failed to get icon", e);
          }
          newApps.push({ id, name, path: filePath, icon });
        }
        saveApps([...apps, ...newApps]);
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
    { icon: <Video size={28} strokeWidth={1.5} />, label: "录制屏幕", onClick: handleRecordScreen },
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
        className={`backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden border border-[rgba(255,255,255,0.05)] ${
          !isExpanded ? "cursor-pointer" : ""
        }`}
        style={{ touchAction: "none" }}
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
                    {isRecording && (
                      <motion.div 
                        animate={{ opacity: [1, 0.2, 1] }} 
                        transition={{ repeat: Infinity, duration: 1.5 }} 
                        className="w-4 h-4 rounded-full bg-red-500" 
                      />
                    )}
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
                    className={`flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
                      item.isCenter ? "bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]" : "hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
                    }`}
                  >
                    <div className={`mb-1 transition-colors ${item.isCenter ? "text-white" : "text-gray-300 hover:text-white"} ${item.label === "录制屏幕" && isRecording ? "text-red-400" : ""}`}>
                      {item.icon}
                    </div>
                    <span className={`text-[11px] font-medium tracking-wide transition-colors ${item.isCenter ? "text-white" : "text-gray-400"}`}>
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
                          setCurrentMenu('main');
                        }}
                        className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]"
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
                  
                  const appIndex = index > 4 ? index - 1 : index;
                  const app = apps[appIndex];

                  if (app) {
                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLaunchApp(app.path);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleLaunchApp(app.path);
                        }}
                        onContextMenu={(e) => handleRemoveApp(e, app.id)}
                        className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer hover:bg-[rgba(255,255,255,0.08)] active:scale-95 relative group"
                        title="右键移除"
                      >
                        <div className="mb-1 transition-colors text-blue-400 group-hover:text-blue-300 flex items-center justify-center">
                          {app.icon ? (
                            <img src={app.icon} alt={app.name} className="w-7 h-7 object-contain drop-shadow-md pointer-events-none" />
                          ) : (
                            <LayoutGrid size={28} strokeWidth={1.5} />
                          )}
                        </div>
                        <span className="text-[10px] font-medium tracking-wide transition-colors text-gray-300 w-full text-center px-1 truncate pointer-events-none">
                          {app.name}
                        </span>
                      </div>
                    );
                  } else {
                    return (
                      <div
                        key={index}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddApp();
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
