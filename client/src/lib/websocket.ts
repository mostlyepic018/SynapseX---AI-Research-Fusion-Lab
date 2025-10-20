// Following javascript_websocket blueprint
import { useEffect, useRef, useState } from "react";

export interface WebSocketMessage {
  type: string;
  data: any;
  senderId?: string;
  timestamp?: number;
}

export function useWebSocket(onMessage?: (message: WebSocketMessage) => void, opts?: { workspaceId?: string }) {
  const ws = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    const connect = () => {
      const env: any = (import.meta as any)?.env || {};
      const base = env.VITE_WS_BASE || env.VITE_API_BASE || '';
      let wsUrl = '';
      if (base) {
        try {
          const u = new URL(base);
          u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
          u.pathname = '/ws';
          wsUrl = u.toString();
        } catch {
          // fallback to window
        }
      }
      if (!wsUrl) {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${protocol}//${window.location.host}/ws`;
      }

      try {
        ws.current = new WebSocket(wsUrl);

        ws.current.onopen = () => {
          console.log("WebSocket connected");
          setIsConnected(true);
          reconnectAttempts.current = 0;
          // Join workspace if provided
          if (opts?.workspaceId) {
            try {
              ws.current?.send(JSON.stringify({ type: 'join_workspace', workspaceId: opts.workspaceId }));
            } catch (e) {
              console.warn('Failed to send join_workspace');
            }
          }
        };

        ws.current.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            if (onMessage) {
              onMessage(message);
            }
          } catch (error) {
            console.error("Failed to parse WebSocket message:", error);
          }
        };

        ws.current.onclose = () => {
          console.log("WebSocket disconnected");
          setIsConnected(false);

          // Attempt to reconnect
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(connect, Math.min(1000 * reconnectAttempts.current, 5000));
          }
        };

        ws.current.onerror = (error) => {
          console.error("WebSocket error:", error);
        };
      } catch (error) {
        console.error("Failed to create WebSocket:", error);
      }
    };

    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [onMessage]);

  const sendMessage = (message: WebSocketMessage) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  const joinWorkspace = (workspaceId: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: 'join_workspace', workspaceId }));
    }
  };

  return { sendMessage, joinWorkspace, isConnected };
}
