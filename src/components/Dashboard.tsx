import { convertFileSrc } from "@tauri-apps/api/core";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Clock, FileText, Folder, FolderPlus, Edit3, Image as ImageIcon, Inbox, Maximize, Minimize, Plus, Search, Settings, Video, X } from "lucide-react";
import { DASHBOARD_TABS } from "./dashboard/dashboardTabs";
import { useDashboardState } from "./dashboard/useDashboardState";

export function Dashboard() {
  const {
    activeTab,
    displayedFiles,
    displayedFolders,
    folders,
    currentFolderId,
    folderPath,
    movingFile,
    isMaximized,
    searchQuery,
    previewFile,
    storageDir,
    setActiveTab,
    setSearchQuery,
    setPreviewFile,
    setMovingFile,
    handleAddFile,
    handleClearDirectory,
    handleDeleteSingleFile,
    handleOpenFile,
    handleCreateFolder,
    handleOpenFolder,
    handleRenameFolder,
    handleDeleteFolder,
    handleMoveFileToFolder,
    win,
  } = useDashboardState();

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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
              onClick={() => {
                setActiveTab(tab);
                handleOpenFolder(undefined); // 切换标签时回到根目录
              }}
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
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight text-white/90">{activeTab}</h1>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">共 {displayedFiles.length + displayedFolders.length} 个项目</span>
              {activeTab === "所有文件" && (
                <button
                  onClick={() => void handleCreateFolder()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 transition-colors text-sm font-medium border border-emerald-500/20"
                >
                  <FolderPlus size={14} />
                  新建文件夹
                </button>
              )}
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

          {/* 面包屑导航 */}
          {activeTab === "所有文件" && (
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-6 py-1 px-2.5 bg-white/5 rounded-md w-fit border border-white/5 shadow-inner">
              <button onClick={() => handleOpenFolder(undefined)} className="hover:text-white transition-colors">
                根目录
              </button>
              {folderPath.map((folder, idx) => (
                <div key={folder.id} className="flex items-center gap-2">
                  <span className="text-gray-600">/</span>
                  <button
                    onClick={() => handleOpenFolder(folder.id)}
                    className={`hover:text-white transition-colors ${idx === folderPath.length - 1 ? "text-white font-medium" : ""}`}
                  >
                    {folder.name}
                  </button>
                </div>
              ))}
            </div>
          )}

          {displayedFiles.length === 0 && displayedFolders.length === 0 ? (
            <motion.div
              key={`${activeTab}-${currentFolderId}-empty`}
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
              <div className="flex gap-3 justify-center">
                {currentFolderId && (
                  <button
                    onClick={() => handleOpenFolder(folderPath[folderPath.length - 2]?.id)}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-500/15 text-gray-300 hover:bg-gray-500/25 hover:text-white transition-colors text-sm font-medium border border-gray-500/25"
                  >
                    返回上一级
                  </button>
                )}
                <button
                  onClick={() => void handleAddFile()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-500/15 text-blue-400 hover:bg-blue-500/25 hover:text-blue-300 transition-colors text-sm font-medium border border-blue-500/25"
                >
                  <Plus size={16} />
                  添加文件
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key={`${activeTab}-${currentFolderId}`} variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {/* 渲染文件夹 */}
              {displayedFolders.map((folder) => (
                <motion.div
                  key={folder.id}
                  variants={itemVariants}
                  onDoubleClick={() => handleOpenFolder(folder.id)}
                  className="group relative flex flex-col items-center justify-center p-4 rounded-2xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.05)] hover:bg-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.15)] transition-all duration-300 cursor-pointer"
                >
                  <div className="w-16 h-16 mb-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-transparent flex items-center justify-center text-amber-400 group-hover:scale-110 group-hover:text-amber-300 transition-transform duration-300">
                    <Folder size={32} strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-gray-300 truncate w-full text-center group-hover:text-white transition-colors">{folder.name}</span>
                  <span className="text-[10px] text-gray-500 mt-1">文件夹</span>

                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 ring-1 ring-white/10 ring-inset pointer-events-none transition-opacity duration-300 shadow-[0_0_15px_rgba(255,255,255,0.05)]" />

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      onClick={(e) => void handleRenameFolder(folder, e)}
                      className="p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-blue-500/85 hover:text-white transition-all duration-200"
                      title="重命名文件夹"
                    >
                      <Edit3 size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={(e) => void handleDeleteFolder(folder, e)}
                      className="p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-red-500/80 hover:text-white transition-all duration-200"
                      title="删除文件夹"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              ))}

              {/* 渲染文件 */}
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

                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                    <button
                      onClick={(event) => {
                        event.stopPropagation();
                        setMovingFile(file);
                      }}
                      className="p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-blue-500/85 hover:text-white transition-all duration-200"
                      title="移动文件"
                    >
                      <Folder size={12} strokeWidth={2.5} />
                    </button>
                    <button
                      onClick={(event) => void handleDeleteSingleFile(event, file)}
                      className="p-1.5 rounded-full bg-black/40 text-gray-400 hover:bg-red-500/80 hover:text-white transition-all duration-200"
                      title="删除文件"
                    >
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* 文件预览 Modal */}
      <AnimatePresence>
        {previewFile && storageDir && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8"
          >
            <button
              onClick={() => setPreviewFile(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              <X size={24} />
            </button>
            <div className="absolute top-6 left-6 text-white font-medium text-lg tracking-wide drop-shadow-md">
              {previewFile.name}
            </div>

            {previewFile.type === "image" && (
              <motion.img
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                src={convertFileSrc(`${storageDir}\\${previewFile.internalName}`)}
                alt={previewFile.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
            )}
            {previewFile.type === "video" && (
              <motion.video
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                src={convertFileSrc(`${storageDir}\\${previewFile.internalName}`)}
                controls
                autoPlay
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl bg-black/50"
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 移动文件 Modal */}
      <AnimatePresence>
        {movingFile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[rgba(30,30,30,0.95)] border border-white/10 rounded-2xl p-6 w-96 max-h-[80%] flex flex-col shadow-2xl text-left"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-base text-white">移动文件到</h3>
                <button
                  onClick={() => setMovingFile(null)}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-white"
                >
                  <X size={16} />
                </button>
              </div>
              
              <p className="text-xs text-gray-400 mb-4 truncate">
                正在移动: <span className="text-gray-200 font-medium">{movingFile.name}</span>
              </p>

              <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col gap-1.5 pr-1">
                {/* 移到根目录选项 */}
                {movingFile.folderId !== undefined && (
                  <button
                    onClick={() => handleMoveFileToFolder(movingFile, undefined)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-sm text-gray-300 hover:text-white transition-all font-medium border border-transparent hover:border-white/5"
                  >
                    <Folder size={16} className="text-blue-400" />
                    根目录
                  </button>
                )}
                
                {/* 其它文件夹选项 */}
                {folders
                  .filter((f) => f.id !== movingFile.folderId)
                  .map((folder) => (
                    <button
                      key={folder.id}
                      onClick={() => handleMoveFileToFolder(movingFile, folder.id)}
                      className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-white/5 text-left text-sm text-gray-300 hover:text-white transition-all font-medium border border-transparent hover:border-white/5"
                    >
                      <Folder size={16} className="text-amber-400" />
                      {folder.name}
                    </button>
                  ))}
                  
                {folders.filter((f) => f.id !== movingFile.folderId).length === 0 && movingFile.folderId === undefined && (
                  <div className="text-center py-6 text-xs text-gray-500">
                    暂无可用的其它文件夹，请先创建。
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
