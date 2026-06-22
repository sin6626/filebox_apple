import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

interface AssistiveTouchToastProps {
  message: string | null;
}

export function AssistiveTouchToast({ message }: AssistiveTouchToastProps) {
  return (
    <AnimatePresence>
      {message && (
        <motion.div
          initial={{ opacity: 0, y: -20, scale: 0.9 }}
          animate={{ opacity: 1, y: -40, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="absolute top-0 z-50 flex items-center gap-2 px-4 py-2 bg-[rgba(30,30,30,0.95)] backdrop-blur-md rounded-full shadow-lg border border-[rgba(255,255,255,0.1)] text-white text-xs font-medium whitespace-nowrap"
        >
          <CheckCircle2 size={14} className="text-green-400" />
          {message}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
