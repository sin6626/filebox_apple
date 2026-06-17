import type { ReactNode } from "react";

export interface LauncherMenuItem {
  icon: ReactNode;
  label: string;
  isCenter?: boolean;
  onClick: () => void;
  onContextMenu?: () => void;
}

interface LauncherMenuProps {
  items: LauncherMenuItem[];
}

export function LauncherMenu({ items }: LauncherMenuProps) {
  return items.map((item, index) => (
    <div
      key={`${item.label}-${index}`}
      onClick={(event) => {
        event.stopPropagation();
        item.onClick();
      }}
      onContextMenu={(event) => {
        if (!item.onContextMenu) return;
        event.preventDefault();
        event.stopPropagation();
        item.onContextMenu();
      }}
      className={`flex flex-col items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer ${
        item.isCenter ? "bg-[rgba(255,255,255,0.1)] hover:bg-[rgba(255,255,255,0.2)]" : "hover:bg-[rgba(255,255,255,0.08)] active:scale-95"
      }`}
    >
      <div className={`mb-1 transition-colors ${item.isCenter ? "text-white" : "text-gray-300 hover:text-white"}`}>
        {item.icon}
      </div>
      <span
        className={`text-[11px] font-medium tracking-wide transition-colors ${
          item.isCenter ? "text-white" : "text-gray-400"
        } max-w-[70px] truncate`}
      >
        {item.label}
      </span>
    </div>
  ));
}
