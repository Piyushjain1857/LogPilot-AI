import { useState, useCallback } from "react";
import { useStreaming } from "../context/StreamingContext";

export function useStreamRecovery() {
  const { replayMissedEvents } = useStreaming();
  const [isReplaying, setIsReplaying] = useState(false);

  const recover = useCallback(
    async (afterSequence) => {
      setIsReplaying(true);
      try {
        await replayMissedEvents(afterSequence);
      } finally {
        setIsReplaying(false);
      }
    },
    [replayMissedEvents]
  );

  return { recover, isReplaying };
}
