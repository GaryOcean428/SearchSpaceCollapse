import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/ocean-consciousness.css";

if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason?.message?.includes("Failed to construct 'WebSocket'") ||
        reason?.message?.includes('localhost:undefined')) {
      console.debug('[Vite HMR] WebSocket unavailable - continuing without hot reload');
      event.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
