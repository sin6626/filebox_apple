import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getCurrentWindow, PhysicalSize, PhysicalPosition } from "@tauri-apps/api/window";
import { Folder, Image, FileText, Video, Minimize2, Clock, Clipboard, Settings, Trash2 } from "lucide-react";

export function AssistiveTouch() {
  const [isIdle, setIsIdle] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
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
    const offset = Math.round(110 * scaleFactor); // (300 - 80) / 2 = 110

    if (isExpanded) {
      setIsExpanded(false);
      setTimeout(async () => {
        await win.setSize(new PhysicalSize(Math.round(80 * scaleFactor), Math.round(80 * scaleFactor)));
        await win.setPosition(new PhysicalPosition(pos.x + offset, pos.y + offset));
      }, 300);
    } else {
      setIsIdle(false);
      await win.setPosition(new PhysicalPosition(pos.x - offset, pos.y - offset));
      await win.setSize(new PhysicalSize(Math.round(300 * scaleFactor), Math.round(300 * scaleFactor)));
      setIsExpanded(true);
    }
  };

  const menuItems = [
    { icon: <Clock size={28} strokeWidth={1.5} />, label: "最近文件" },
    { icon: <Image size={28} strokeWidth={1.5} />, label: "图片" },
    { icon: <FileText size={28} strokeWidth={1.5} />, label: "文档" },
    { icon: <Folder size={28} strokeWidth={1.5} />, label: "所有文件" },
    { icon: <Minimize2 size={28} strokeWidth={1.5} />, label: "收起", isCenter: true, onClick: toggleExpand },
    { icon: <Video size={28} strokeWidth={1.5} />, label: "视频" },
    { icon: <Clipboard size={28} strokeWidth={1.5} />, label: "剪贴板" },
    { icon: <Settings size={28} strokeWidth={1.5} />, label: "设置" },
    { icon: <Trash2 size={28} strokeWidth={1.5} />, label: "清空" },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center box-border bg-transparent">
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
        className={`backdrop-blur-2xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden ${
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
              className="w-full h-full flex items-center justify-center pointer-events-none"
            >
              <div className="w-[56px] h-[56px] rounded-full bg-[rgba(100,100,102,0.7)] flex items-center justify-center">
                <div className="w-[44px] h-[44px] rounded-full bg-[rgba(199,199,204,0.85)] flex items-center justify-center">
                  <div className="w-[32px] h-[32px] rounded-full bg-[#ffffff] shadow-sm" />
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
              {menuItems.map((item, index) => (
                <div
                  key={index}
                  onClick={item.onClick}
                  className={`flex flex-col items-center justify-center rounded-2xl transition-colors ${
                    item.isCenter ? "bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]" : "hover:bg-[rgba(255,255,255,0.05)]"
                  } ${item.onClick ? "cursor-pointer" : ""}`}
                >
                  <div className="text-white mb-1">{item.icon}</div>
                  <span className="text-white text-[11px] font-medium tracking-wide">{item.label}</span>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
