import { useStreaming } from "../context/StreamingContext";

export function useWebSocket() {
  const { connectionStatus, reconnect } = useStreaming();
  return {
    status: connectionStatus,
    isConnected: connectionStatus === "CONNECTED",
    isReconnecting: connectionStatus === "RECONNECTING",
    isConnecting: connectionStatus === "CONNECTING",
    isDisconnected: connectionStatus === "DISCONNECTED",
    reconnect,
  };
}
