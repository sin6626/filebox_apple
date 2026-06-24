import { useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { invoke } from "@tauri-apps/api/core";

export function TrayMenu() {
  const win = getCurrentWindow();

  useEffect(() => {
    // Listen for Tauri window focus change
    const unlisten = win.onFocusChanged(({ payload: focused }) => {
      if (!focused) {
        void win.hide();
      }
    });

    // Fallback standard DOM blur
    const handleBlur = () => {
      void win.hide();
    };
    window.addEventListener("blur", handleBlur);

    return () => {
      void unlisten.then((f) => f());
      window.removeEventListener("blur", handleBlur);
    };
  }, [win]);

  const handleShowDashboard = async () => {
    try {
      await invoke("show_dashboard");
    } catch (e) {
      console.error("Failed to show dashboard", e);
    } finally {
      void win.hide();
    }
  };

  const handleQuit = async () => {
    void win.hide();
    await invoke("quit_app");
  };

  const Separator = () => <div className="w-full h-[1px] bg-[#333333]" />;

  const MenuItem = ({ children, onClick, className = "" }: { children: React.ReactNode, onClick?: () => void, className?: string }) => (
    <div 
      onClick={onClick}
      className={`px-4 py-2 hover:bg-[#2d2d2d] cursor-pointer text-[#eeeeee] text-[14px] transition-colors flex items-center justify-between ${className}`}
    >
      {children}
    </div>
  );

  return (
    <div className="w-full h-full bg-[#1e1e1e] rounded-lg shadow-2xl flex flex-col box-border font-sans select-none overflow-hidden border border-[#333333]" data-tauri-drag-region>
      <div className="py-1">
        <MenuItem onClick={handleShowDashboard}>
          Open FileBox
        </MenuItem>

        <Separator />

        <MenuItem onClick={handleQuit}>
          Exit
        </MenuItem>
      </div>
    </div>
  );
}
