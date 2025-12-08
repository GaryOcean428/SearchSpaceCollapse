import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/ocean-consciousness.css";

if (import.meta.env.DEV) {
  // Suppress Vite HMR WebSocket errors
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    if (reason?.message?.includes("Failed to construct 'WebSocket'") ||
        reason?.message?.includes('localhost:undefined') ||
        reason?.message?.includes('WebSocket connection')) {
      console.debug('[Vite HMR] WebSocket unavailable - continuing without hot reload');
      event.preventDefault();
    }
  });
  
  // Block invalid Vite HMR WebSocket URLs
  const originalWebSocket = window.WebSocket;
  const WebSocketWrapper = function(this: WebSocket, url: string | URL, protocols?: string | string[]) {
    const urlStr = url.toString();
    // Block malformed Replit WebSocket URLs
    if (urlStr.includes('picard.replit.dev') || urlStr.includes('undefined')) {
      console.debug('[Vite HMR Fix] Blocking invalid WebSocket URL');
      throw new Error('Invalid WebSocket URL blocked');
    }
    return new originalWebSocket(url, protocols);
  } as unknown as typeof WebSocket;
  WebSocketWrapper.prototype = originalWebSocket.prototype;
  Object.assign(WebSocketWrapper, originalWebSocket);
  window.WebSocket = WebSocketWrapper;
}

createRoot(document.getElementById("root")!).render(<App />);
