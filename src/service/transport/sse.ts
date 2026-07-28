import type { SseFrame, SseFrameHandler } from "./sse.types";

const normalizeNewlines = (value: string, final: boolean): string => {
  // A network chunk can split a CRLF pair between "\r" and "\n".
  const preserveTrailingCarriageReturn = !final && value.endsWith("\r");
  const content = preserveTrailingCarriageReturn
    ? value.slice(0, -1)
    : value;

  const normalized = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  return preserveTrailingCarriageReturn ? `${normalized}\r` : normalized;
};

const parseSseBlock = (block: string): SseFrame | null => {
  if (block.trim().length === 0) {
    return null;
  }

  let id: string | null = null;
  let event: string | null = null;
  let retry: number | null = null;
  const dataLines: string[] = [];

  for (const line of block.split("\n")) {
    // Comment-only frames are heartbeats and intentionally ignored.
    if (line.length === 0 || line.startsWith(":")) {
      continue;
    }

    const separatorIndex = line.indexOf(":");
    const field = separatorIndex < 0 ? line : line.slice(0, separatorIndex);
    let value = separatorIndex < 0 ? "" : line.slice(separatorIndex + 1);

    if (value.startsWith(" ")) {
      value = value.slice(1);
    }

    switch (field) {
      case "id":
        if (!value.includes("\0")) {
          id = value;
        }
        break;
      case "event":
        event = value;
        break;
      case "data":
        dataLines.push(value);
        break;
      case "retry": {
        const parsedRetry = Number(value);
        if (Number.isInteger(parsedRetry) && parsedRetry >= 0) {
          retry = parsedRetry;
        }
        break;
      }
      default:
        // Unknown SSE fields are ignored according to the SSE format.
        break;
    }
  }

  if (dataLines.length === 0) {
    return null;
  }

  return {
    id,
    event,
    data: dataLines.join("\n"),
    retry,
  };
};

export const consumeSseStream = async (
  body: ReadableStream<Uint8Array>,
  onFrame: SseFrameHandler,
): Promise<void> => {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buffer = "";

  const emitAvailableBlocks = async (): Promise<void> => {
    let boundaryIndex = buffer.indexOf("\n\n");

    while (boundaryIndex >= 0) {
      const block = buffer.slice(0, boundaryIndex);
      buffer = buffer.slice(boundaryIndex + 2);

      const frame = parseSseBlock(block);
      if (frame !== null) {
        await onFrame(frame);
      }

      boundaryIndex = buffer.indexOf("\n\n");
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (value !== undefined) {
        buffer += decoder.decode(value, { stream: !done });
      }

      buffer = normalizeNewlines(buffer, done);
      await emitAvailableBlocks();

      if (done) {
        const trailingBlock = buffer.trim();
        if (trailingBlock.length > 0) {
          const trailingFrame = parseSseBlock(trailingBlock);
          if (trailingFrame !== null) {
            await onFrame(trailingFrame);
          }
        }
        return;
      }
    }
  } catch (error: unknown) {
    // Stop consuming the browser response when parsing, validation, or a
    // consumer callback fails. This does not cancel server-side generation.
    try {
      await reader.cancel(error);
    } catch {
      // Preserve the original error.
    }
    throw error;
  } finally {
    reader.releaseLock();
  }
};
