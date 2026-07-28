export interface SseFrame {
  id: string | null;
  event: string | null;
  data: string;
  retry: number | null;
}

export type SseFrameHandler = (
  frame: SseFrame,
) => void | Promise<void>;
