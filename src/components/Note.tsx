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
      className="w-screen h-screen bg-gradient-to-br from-[rgba(24,24,28,0.85)] via-[rgba(32,32,38,0.9)] to-[rgba(18,18,22,0.95)] text-amber-100/90 flex flex-col rounded-2xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.65)] border border-white/10 backdrop-blur-2xl"
    >
      {/* Titlebar for dragging */}
      <div 
        data-tauri-drag-region 
        className="h-9 bg-white/5 flex items-center justify-between px-3 cursor-move select-none shrink-0 border-b border-white/5"
      >
        <div className="flex items-center gap-1.5 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.3)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.3)]" />
          <div className="w-2.5 h-2.5 rounded-full bg-[#27c93f] shadow-[inset_0_1px_2px_rgba(255,255,255,0.25),0_1px_2px_rgba(0,0,0,0.3)]" />
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={handleClear} 
            className="p-1.5 hover:bg-white/10 hover:text-amber-300 active:scale-90 rounded-lg transition-all text-amber-200/70 flex items-center justify-center" 
            title="清空便签"
          >
            <Trash2 size={13} />
          </button>
          <button 
            onClick={() => win.hide()} 
            className="p-1.5 hover:bg-white/10 hover:text-amber-300 active:scale-90 rounded-lg transition-all text-amber-200/70 flex items-center justify-center" 
            title="隐藏"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <textarea
        value={content}
        onChange={handleChange}
        placeholder="随时记录灵感..."
        className="flex-1 w-full bg-transparent resize-none p-5 text-sm font-light focus:outline-none placeholder-amber-200/20 text-amber-100/90 custom-scrollbar leading-relaxed"
        style={{ fontFamily: "'Inter', sans-serif" }}
        spellCheck={false}
      />
    </motion.div>
  );
}
