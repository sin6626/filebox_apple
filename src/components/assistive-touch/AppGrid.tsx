import type { MouseEvent, PointerEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LayoutGrid, Minimize2, Plus } from "lucide-react";
import type { LauncherApp } from "../../features/apps/appLauncher";

interface AppGridProps {
  apps: LauncherApp[];
  draggedAppId: number | null;
  dragOffset: { x: number; y: number };
  isEditMode: boolean;
  newlyAddedAppIds: number[];
  onAddApp: (targetIndex: number) => void;
  onBack: () => void;
  onDeleteApp: (event: MouseEvent, id: number) => void;
  onLaunchApp: (path: string) => void;
  onStartDrag: (event: PointerEvent, app: LauncherApp) => void;
  onMoveDrag: (event: PointerEvent, app: LauncherApp) => void;
  onEndDrag: (event: PointerEvent, app: LauncherApp) => void;
  onPointerLeave: () => void;
}

export function AppGrid({
  apps,
  draggedAppId,
  dragOffset,
  isEditMode,
  newlyAddedAppIds,
  onAddApp,
  onBack,
  onDeleteApp,
  onLaunchApp,
  onStartDrag,
  onMoveDrag,
  onEndDrag,
  onPointerLeave,
}: AppGridProps) {
  return Array.from({ length: 9 }).map((_, index) => {
    if (index === 4) {
      return (
        <div
          key="back"
          onClick={(event) => {
            event.stopPropagation();
            onBack();
          }}
          className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)] relative z-0"
        >
          <div className="mb-1 transition-colors text-white">
            <Minimize2 size={28} strokeWidth={1.5} className="rotate-180" />
          </div>
          <span className="text-[11px] font-medium tracking-wide transition-colors text-white">返回</span>
        </div>
      );
    }

    const app = apps.find((item) => item.gridIndex === index);

    if (!app) {
      return (
        <div
          key={`empty-${index}`}
          onClick={(event) => {
            event.stopPropagation();
            onAddApp(index);
          }}
          className="flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer hover:bg-[rgba(255,255,255,0.05)] text-[rgba(255,255,255,0.2)] hover:text-[rgba(255,255,255,0.5)] border border-dashed border-[rgba(255,255,255,0.1)] hover:border-[rgba(255,255,255,0.3)] m-1"
        >
          <Plus size={20} strokeWidth={2} />
        </div>
      );
    }

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
          position: "relative",
          pointerEvents: "auto",
          filter: isDragging ? "drop-shadow(0 8px 12px rgba(0, 0, 0, 0.55))" : "none",
        }}
        onPointerDown={(event) => onStartDrag(event, app)}
        onPointerMove={(event) => onMoveDrag(event, app)}
        onPointerUp={(event) => onEndDrag(event, app)}
        onPointerLeave={onPointerLeave}
        onClick={(event) => {
          event.stopPropagation();
          if (!isEditMode) onLaunchApp(app.path);
        }}
        onDoubleClick={(event) => {
          event.stopPropagation();
          if (!isEditMode) onLaunchApp(app.path);
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
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDeleteApp(event, app.id);
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
  });
}
