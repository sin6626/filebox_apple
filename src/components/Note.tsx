import { useState, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { X, Trash2 } from "lucide-react";
import { motion } from "framer-motion";

export function Note() {
  const [content, setContent] = useState("");
  const win = getCurrentWindow();

  // Load saved note if we had persistent storage
  useEffect(() => {
    const saved = localStorage.getItem("sticky-note");
    if (saved) setContent(saved);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
    localStorage.setItem("sticky-note", e.target.value);
  };

  const handleClear = () => {
    setContent("");
    localStorage.removeItem("sticky-note");
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="w-screen h-screen bg-[#FDF0A6] text-gray-800 flex flex-col rounded-xl overflow-hidden shadow-2xl border border-[#F5E68C]"
    >
      {/* Titlebar for dragging */}
      <div 
        data-tauri-drag-region 
        className="h-8 bg-[#F6E995] flex items-center justify-between px-2 cursor-move select-none shrink-0"
      >
        <div className="flex items-center gap-1 pointer-events-none">
          <div className="w-2 h-2 rounded-full bg-red-400" />
          <div className="w-2 h-2 rounded-full bg-yellow-400" />
          <div className="w-2 h-2 rounded-full bg-green-400" />
        </div>
        <div className="flex items-center gap-1">
          <button onClick={handleClear} className="p-1 hover:bg-[#EBDC7B] rounded transition-colors text-gray-600" title="清空便签">
            <Trash2 size={12} />
          </button>
          <button onClick={() => win.hide()} className="p-1 hover:bg-[#EBDC7B] rounded transition-colors text-gray-600" title="隐藏">
            <X size={12} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="随时记录灵感..."
        className="flex-1 w-full bg-transparent resize-none p-4 text-sm focus:outline-none placeholder-gray-500/50 custom-scrollbar leading-relaxed"
        style={{ fontFamily: "'Inter', sans-serif" }}
        spellCheck={false}
      />
    </motion.div>
  );
}
