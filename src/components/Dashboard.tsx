import { motion, type Variants } from "framer-motion";
import { Clock, FileText, Folder, Image as ImageIcon, Inbox, Maximize, Minimize, Plus, Search, Settings, Video, X } from "lucide-react";
import { DASHBOARD_TABS } from "./dashboard/dashboardTabs";
import { useDashboardState } from "./dashboard/useDashboardState";

export function Dashboard() {
  const { activeTab, displayedFiles, isMaximized, setActiveTab, handleAddFile, handleClearDirectory, handleDeleteSingleFile, handleOpenFile, win } =
    useDashboardState();

  const iconMap = {
    最近文件: <Clock size={20} />,
    所有文件: <Folder size={20} />,
    图片: <ImageIcon size={20} />,
    文档: <FileText size={20} />,
    视频: <Video size={20} />,
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } },
  };

  return (
    <div className="w-screen h-screen flex flex-col overflow-hidden bg-[rgba(28,28,30,0.85)] backdrop-blur-3xl text-white font-sans rounded-xl border border-[rgba(255,255,255,0.1)] shadow-2xl box-border">
      <div data-tauri-drag-region className="h-12 flex items-center justify-between px-4 border-b border-[rgba(255,255,255,0.05)] select-none shrink-0">
        <div className="flex items-center gap-3 pointer-events-none">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
            <Folder size={16} className="text-white" />
          </div>
          <span className="font-semibold text-sm tracking-wide">FileBox</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="搜索..."
              className="bg-[rgba(0,0,0,0.2)] border border-[rgba(255,255,255,0.05)] rounded-full py-1.5 pl-8 pr-4 text-xs focus:outline-none focus:border-[rgba(255,255,255,0.2)] transition-colors w-48 text-white placeholder-gray-400"
            />
          </div>
          <button onClick={() => void win.minimize()} className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-md transition-colors text-gray-400 hover:text-white">
            <Minimize size={14} />
          </button>
          <button
            onClick={() => void win.toggleMaximize()}
            className="p-2 hover:bg-[rgba(255,255,255,0.1)] rounded-md transition-colors text-gray-400 hover:text-white"
          >
            {isMaximized ? <Minimize size={14} /> : <Maximize size={14} />}
          </button>
          <button onClick={() => void win.hide()} className="p-2 hover:bg-red-500/80 rounded-md transition-colors text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-48 border-r border-[rgba(255,255,255,0.05)] p-3 flex flex-col gap-1 shrink-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3 mt-2">视图</div>
          {DASHBOARD_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab ? "bg-[rgba(255,255,255,0.15)] text-white shadow-inner" : "text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-gray-200"
              }`}
            >
              {iconMap[tab]}
              {tab}
            </button>
          ))}

          <div className="mt-auto">
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-[rgba(255,255,255,0.05)] hover:text-gray-200 transition-all">
              <Settings size={20} />
              设置
            </button>
          </div>
        </div>

        <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-white/90">{activeTab}</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">共 {displayedFiles.length} 个项目</span>
              <button
                onClick={() => void handleAddFile()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 hover:text-blue-300 transition-colors text-sm font-medium border border-blue-500/20"
              >
                <Plus size={14} />
                添加文件
              </button>
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-colors text-sm font-medium border border-red-500/20"
                onClick={() => void handleClearDirectory()}
              >
                <X size={14} />
                清空当前目录
              </button>
            </div>
          </div>

          {displayedFiles.length === 0 ? (
            <motion.div
              key={`${activeTab}-empty`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="w-20 h-20 mb-6 rounded-2xl bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] flex items-center justify-center">
                <Inbox size={40} strokeWidth={1.2} className="text-gray-500" />
              </div>
              <p className="text-lg font-semibold text-gray-400 mb-2">暂无文件</p>
              <p className="text-sm text-gray-500 max-w-xs mb-6">点击右上角「添加文件」或通过悬浮球导入文件</p>
              <button
                onClick={() => void handleAddFile()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300 transition-colors text-sm font-medium border border-blue-500/25"
              >
                <Plus size={16} />
                添加文件
              </button>
            </motion.div>
          ) : (
            <motion.div key={activeTab} variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {displayedFiles.map((file) => (
                <motion.div
                  key={file.id}
                  variants={itemVariants}
                  onDoubleClick={() => void handleOpenFile(file)}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
                >
                  <div className="w-16 h-16 mb-3 rounded-xl bg-gradient-to-br from-[rgba(255,255,255,0.1)] to-transparent flex items-center justify-center text-blue-400 group-hover:scale-110 group-hover:text-blue-300 transition-transform duration-300">
                    {file.type === "image" ? (
                      <ImageIcon size={32} strokeWidth={1.5} />
                    ) : file.type === "document" ? (
                      <FileText size={32} strokeWidth={1.5} />
                    ) : file.type === "video" ? (
                      <Video size={32} strokeWidth={1.5} />
                    ) : (
                      <Folder size={32} strokeWidth={1.5} />
                    )}
                  </div>
                  <span className="text-xs font-medium text-gray-300 truncate w-full text-center group-hover:text-white transition-colors">{file.name}</span>
                  <span className="text-[10px] text-gray-500 mt-1">{file.size || file.type}</span>

                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 ring-1 ring-white/10 ring-inset pointer-events-none transition-opacity duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />

                  <button
                    onClick={(event) => void handleDeleteSingleFile(event, file)}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/40 text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/80 hover:text-white transition-all duration-200 z-10"
                    title="删除文件"
                  >
                    <X size={12} strokeWidth={2.5} />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
