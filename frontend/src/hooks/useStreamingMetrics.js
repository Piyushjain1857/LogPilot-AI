import { useStreaming } from "../context/StreamingContext";

export function useStreamingMetrics() {
  const { streamMetrics } = useStreaming();
  return streamMetrics;
}
