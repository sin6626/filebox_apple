import { AnimatePresence, motion } from "framer-motion";
import { Clock, FileText, Folder, Image, LayoutGrid, Minimize2, Plus, StickyNote, Video } from "lucide-react";
import { AppGrid } from "./assistive-touch/AppGrid";
import { LauncherMenu, type LauncherMenuItem } from "./assistive-touch/LauncherMenu";
import { AssistiveTouchToast } from "./assistive-touch/AssistiveTouchToast";
import { useAssistiveTouchState } from "./assistive-touch/useAssistiveTouchState";

export function AssistiveTouch() {
  const state = useAssistiveTouchState();

  const mainMenuItems: LauncherMenuItem[] = [
    { icon: <Clock size={28} strokeWidth={1.5} />, label: "最近文件", onClick: () => void state.handleOpenDashboard("最近文件") },
    { icon: <Folder size={28} strokeWidth={1.5} />, label: "所有文件", onClick: () => void state.handleOpenDashboard("所有文件") },
    { icon: <Plus size={28} strokeWidth={1.5} />, label: "添加文件", onClick: () => void state.handleAddFile() },
    { icon: <Image size={28} strokeWidth={1.5} />, label: "图片", onClick: () => void state.handleOpenDashboard("图片") },
    { icon: <Minimize2 size={28} strokeWidth={1.5} />, label: "收起", isCenter: true, onClick: () => void state.toggleExpand() },
    { icon: <FileText size={28} strokeWidth={1.5} />, label: "文档", onClick: () => void state.handleOpenDashboard("文档") },
    {
      icon: <Video size={28} strokeWidth={1.5} />,
      label: "录制屏幕",
      onClick: () => void state.handleRecordScreen(),
      onContextMenu: () => void state.handleSetScreenRecorder(),
    },
    { icon: <LayoutGrid size={28} strokeWidth={1.5} />, label: "我的应用", onClick: () => state.setCurrentMenu("apps") },
    { icon: <StickyNote size={28} strokeWidth={1.5} />, label: "便签", onClick: () => void state.handleOpenNote() },
  ];

  return (
    <div className="w-full h-full flex items-center justify-center box-border bg-transparent relative">
      <AssistiveTouchToast message={state.showToast} />

      <motion.div
        animate={{
          width: state.isExpanded ? 280 : 72,
          height: state.isExpanded ? 280 : 72,
          borderRadius: state.isExpanded ? 32 : 36,
          opacity: state.isExpanded ? 1 : state.isIdle ? 0.35 : 1,
          backgroundColor: state.isExpanded ? "rgba(30,30,30,0.85)" : "rgba(28,28,30,0.95)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
        onPointerMove={state.handlePointerMove}
        onPointerDown={state.handlePointerDown}
        onPointerUp={state.handlePointerUp}
        className={`flex items-center justify-center overflow-hidden ${
          state.isExpanded ? "backdrop-blur-2xl border border-[rgba(255,255,255,0.08)]" : "border-none"
        } ${!state.isExpanded ? "cursor-pointer" : ""}`}
        style={{
          touchAction: "none",
          filter: "none",
          boxShadow: state.isExpanded
            ? "inset 0 1px 3px rgba(255,255,255,0.15), inset 0 -1px 3px rgba(0,0,0,0.4)"
            : "inset 0 1px 2px rgba(255,255,255,0.15), inset 0 -1px 2px rgba(0,0,0,0.5)",
        }}
      >
        <AnimatePresence mode="wait">
          {!state.isExpanded ? (
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
                  <div className="w-[32px] h-[32px] rounded-full bg-[#ffffff] shadow-sm flex items-center justify-center" />
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
                if (state.isEditMode) state.setIsEditMode(false);
              }}
              className="w-full h-full grid grid-cols-3 grid-rows-3 gap-2 p-4 select-none"
            >
              {state.currentMenu === "main" ? (
                <LauncherMenu items={mainMenuItems} />
              ) : (
                <AppGrid
                  apps={state.apps}
                  draggedAppId={state.draggedAppId}
                  dragOffset={state.dragOffset}
                  isEditMode={state.isEditMode}
                  newlyAddedAppIds={state.newlyAddedAppIds}
                  onAddApp={(targetIndex) => void state.handleAddApp(targetIndex)}
                  onBack={state.handleAppGridBack}
                  onDeleteApp={state.handleRemoveApp}
                  onLaunchApp={(path) => void state.handleLaunchApp(path)}
                  onStartDrag={state.handleAppPointerDown}
                  onMoveDrag={state.handleAppPointerMove}
                  onEndDrag={state.handleAppPointerUp}
                  onPointerLeave={state.clearLongPress}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
