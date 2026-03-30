import React, { useEffect, useMemo, useState } from "react";
import type { FormatV2Request } from "../api/floorPlanFormatApi";
import {
  formatLengthFromCm,
  unitConverter_systemCmToMetersDisplay,
  unitConverter_userInputMetersToSystemCm,
} from "../utils/units";

type OptionalRoomType = "bathroom" | "bedroom" | "kitchen";

const roomLabels: Record<OptionalRoomType, string> = {
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
};

export interface SubmittedRoomRequirements {
  payload: FormatV2Request;
  roomSummary: string;
  floorWidthCm: number;
  floorHeightCm: number;
}

interface ConfigureRoomsModalProps {
  isOpen: boolean;
  maxUsableWidth: number | null;
  maxUsableHeight: number | null;
  initialRequirements?: SubmittedRoomRequirements | null;
  onClose: () => void;
  onSubmit: (requirements: SubmittedRoomRequirements) => void;
}

const ConfigureRoomsModal: React.FC<ConfigureRoomsModalProps> = ({
  isOpen,
  maxUsableWidth,
  maxUsableHeight,
  initialRequirements,
  onClose,
  onSubmit,
}) => {
  const [selectedRooms, setSelectedRooms] = useState<Record<OptionalRoomType, boolean>>({
    bathroom: false,
    bedroom: false,
    kitchen: false,
  });
  const [roomCounts, setRoomCounts] = useState<Record<OptionalRoomType, number>>({
    bathroom: 0,
    bedroom: 0,
    kitchen: 0,
  });
  const [floorWidthInput, setFloorWidthInput] = useState<string>("");
  const [floorHeightInput, setFloorHeightInput] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (!initialRequirements) {
      setSelectedRooms({ bathroom: false, bedroom: false, kitchen: false });
      setRoomCounts({ bathroom: 0, bedroom: 0, kitchen: 0 });
      setFloorWidthInput("");
      setFloorHeightInput("");
      setSubmitStatus(null);
      return;
    }

    const entries = initialRequirements.payload.room_template.data;
    const nextSelected: Record<OptionalRoomType, boolean> = {
      bathroom: false,
      bedroom: false,
      kitchen: false,
    };
    const nextCounts: Record<OptionalRoomType, number> = {
      bathroom: 0,
      bedroom: 0,
      kitchen: 0,
    };

    for (const item of entries) {
      const maybeType = item.type as OptionalRoomType;
      if (!(maybeType in roomLabels)) continue;

      nextSelected[maybeType] = true;
      nextCounts[maybeType] += 1;
    }

    setSelectedRooms(nextSelected);
    setRoomCounts(nextCounts);
    setFloorWidthInput(
      unitConverter_systemCmToMetersDisplay(initialRequirements.floorWidthCm, 2).replace(" m", ""),
    );
    setFloorHeightInput(
      unitConverter_systemCmToMetersDisplay(initialRequirements.floorHeightCm, 2).replace(" m", ""),
    );
    setSubmitStatus(null);
  }, [isOpen, initialRequirements]);

  const hasValidLimits = maxUsableWidth !== null && maxUsableHeight !== null;

  const selectedRoomSummary = useMemo(() => {
    const picked = (Object.keys(roomLabels) as OptionalRoomType[])
      .filter((roomType) => selectedRooms[roomType])
      .map((roomType) => `${roomLabels[roomType]}: ${roomCounts[roomType]}`);

    if (picked.length === 0) {
      return "No optional rooms selected yet.";
    }

    return picked.join(" | ");
  }, [selectedRooms, roomCounts]);

  const handleToggleRoom = (roomType: OptionalRoomType) => {
    setSelectedRooms((prev) => {
      const nextSelected = !prev[roomType];

      setRoomCounts((prevCounts) => ({
        ...prevCounts,
        [roomType]: nextSelected ? Math.max(prevCounts[roomType], 1) : 0,
      }));

      return {
        ...prev,
        [roomType]: nextSelected,
      };
    });
  };

  const handleCountChange = (roomType: OptionalRoomType, nextValue: string) => {
    const parsed = Number.parseInt(nextValue, 10);
    if (!Number.isFinite(parsed)) {
      setRoomCounts((prev) => ({ ...prev, [roomType]: 0 }));
      return;
    }

    const bounded = Math.min(10, Math.max(0, parsed));
    setRoomCounts((prev) => ({ ...prev, [roomType]: bounded }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidLimits || maxUsableWidth === null || maxUsableHeight === null) {
      setSubmitStatus("Run Step A algorithm first to get max usable dimensions.");
      return;
    }

    const floorWidthCm = unitConverter_userInputMetersToSystemCm(floorWidthInput);
    const floorHeightCm = unitConverter_userInputMetersToSystemCm(floorHeightInput);

    if (floorWidthCm === null || floorWidthCm <= 0) {
      setSubmitStatus("Enter a valid positive floor width.");
      return;
    }

    if (floorHeightCm === null || floorHeightCm <= 0) {
      setSubmitStatus("Enter a valid positive floor height.");
      return;
    }

    if (floorWidthCm > maxUsableWidth || floorHeightCm > maxUsableHeight) {
      setSubmitStatus("Floor dimensions cannot exceed max usable width/height.");
      return;
    }

    const roomData: Array<{ id: string; type: string }> = [];

    (Object.keys(roomLabels) as OptionalRoomType[]).forEach((roomType) => {
      if (!selectedRooms[roomType]) return;
      const count = Math.max(0, roomCounts[roomType]);
      for (let i = 1; i <= count; i += 1) {
        roomData.push({ id: `${roomType}${i}`, type: roomType });
      }
    });

    const payload: FormatV2Request = {
      floor_width: floorWidthCm,
      floor_height: floorHeightCm,
      room_template: {
        name: "Custom Layout",
        data: roomData,
      },
      should_optuna_run: true,
      optuna_trial_count: 20,
    };

    onSubmit({
      payload,
      roomSummary: selectedRoomSummary,
      floorWidthCm,
      floorHeightCm,
    });

    setSubmitStatus("Room requirements submitted.");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4 py-6">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-lg font-semibold text-slate-800">Configure Room Requirements</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-4 px-6 py-5">
          <div className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Room Requirements</h3>
            {(Object.keys(roomLabels) as OptionalRoomType[]).map((roomType) => (
              <div key={roomType} className="grid grid-cols-[1fr_130px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={selectedRooms[roomType]}
                    onChange={() => handleToggleRoom(roomType)}
                    className="h-4 w-4"
                  />
                  {roomLabels[roomType]}
                </label>

                <input
                  type="number"
                  min={0}
                  max={10}
                  step={1}
                  value={roomCounts[roomType]}
                  onChange={(e) => handleCountChange(roomType, e.target.value)}
                  disabled={!selectedRooms[roomType]}
                  className="rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                />
              </div>
            ))}
            <div className="mt-2 text-xs text-slate-600">Living room is always included by default.</div>
          </div>

          <div className="rounded-md border border-slate-200 p-3">
            <h3 className="mb-3 text-sm font-semibold text-slate-800">Floor Dimensions</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Floor Width (m)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={floorWidthInput}
                  onChange={(e) => setFloorWidthInput(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. 10"
                />
              </label>

              <label className="flex flex-col gap-1 text-sm text-slate-700">
                Floor Height (m)
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={floorHeightInput}
                  onChange={(e) => setFloorHeightInput(e.target.value)}
                  className="rounded border border-slate-300 px-3 py-2 text-sm"
                  placeholder="e.g. 8"
                />
              </label>
            </div>
            <div className="mt-3 text-xs text-slate-600">
              Max usable size: {maxUsableWidth !== null ? formatLengthFromCm(maxUsableWidth, 2) : "N/A"} x{" "}
              {maxUsableHeight !== null ? formatLengthFromCm(maxUsableHeight, 2) : "N/A"}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-medium text-slate-800">Room Summary</div>
            <div>{selectedRoomSummary}</div>
          </div>

          {submitStatus && <div className="text-sm text-indigo-700">{submitStatus}</div>}

          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!hasValidLimits}
              className="rounded bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit Room Requirements
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConfigureRoomsModal;
