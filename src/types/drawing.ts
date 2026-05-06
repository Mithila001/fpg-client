export type OpeningKind = "door" | "window";

export interface CanvasOpening {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: OpeningKind;
  openingType: string;
  side: string;
  roomName: string;
  roomType: string;
  connectedRoomName: string | null;
  connectedRoomType: string | null;
}
