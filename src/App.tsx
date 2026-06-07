import { useEffect, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AssistiveTouch } from "./components/AssistiveTouch";
import { Dashboard } from "./components/Dashboard";
import { Note } from "./components/Note";
import "./App.css";

function App() {
  const [windowLabel, setWindowLabel] = useState<string | null>(null);

  useEffect(() => {
    setWindowLabel(getCurrentWindow().label);
  }, []);

  if (!windowLabel) return null;

  if (windowLabel === "dashboard") {
    return <Dashboard />;
  }

  if (windowLabel === "note") {
    return <Note />;
  }

  return (
    <div className="w-screen h-screen bg-transparent select-none overflow-hidden text-white font-sans">
      <AssistiveTouch />
    </div>
  );
}

export default App;
