import React, { useEffect, useMemo, useState } from "react";
import type { FormatV2Request } from "../api/floorPlan";
import type { RoomSizeConstraint } from "../api/algorithms";
import { formatLengthFromCm, parseMetersInputToCm } from "../utils/units";

type ConfigurableRoomType =
  | "bedroom"
  | "kitchen"
  | "bathroom"
  | "diningRoom"
  | "garage"
  | "veranda"
  | "attachedBathroom";

const roomLabels: Record<ConfigurableRoomType, string> = {
  bedroom: "Bedroom",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  diningRoom: "Dining Room",
  garage: "Garage",
  veranda: "Veranda",
  attachedBathroom: "Attached Bathroom",
};

const roomSizes: Record<ConfigurableRoomType, string> = {
  bedroom: "regular",
  kitchen: "regular",
  bathroom: "small",
  diningRoom: "regular",
  garage: "regular",
  veranda: "small",
  attachedBathroom: "small",
};

const mandatoryRooms: ConfigurableRoomType[] = ["bedroom", "kitchen", "bathroom", "veranda"];

type FeasibilityTag = "good" | "tight" | "impossible" | "unknown";

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
  aspectRatio: string;
  roomSizeConstraints: RoomSizeConstraint[];
  onClose: () => void;
  onSubmit: (requirements: SubmittedRoomRequirements) => void;
}

const ConfigureRoomsModal: React.FC<ConfigureRoomsModalProps> = ({
  isOpen,
  maxUsableWidth,
  maxUsableHeight,
  initialRequirements,
  aspectRatio,
  roomSizeConstraints,
  onClose,
  onSubmit,
}) => {
  const [selectedRooms, setSelectedRooms] = useState<Record<ConfigurableRoomType, boolean>>({
    bedroom: true,
    kitchen: true,
    bathroom: true,
    veranda: true,
    diningRoom: false,
    garage: false,
    attachedBathroom: false,
  });
  const [roomCounts, setRoomCounts] = useState<Record<ConfigurableRoomType, number>>({
    bedroom: 1,
    kitchen: 1,
    bathroom: 1,
    veranda: 1,
    diningRoom: 0,
    garage: 0,
    attachedBathroom: 0,
  });
  const [floorWidthInput, setFloorWidthInput] = useState<string>("");
  const [floorHeightInput, setFloorHeightInput] = useState<string>("");
  const [globalRoomSize, setGlobalRoomSize] = useState<string>("regular");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const formatMetersFloor = (cmValue: number): string => {
    const meters = cmValue / 100;
    const flooredMeters = Math.floor(meters * 100) / 100;
    return flooredMeters.toFixed(2);
  };

  useEffect(() => {
    if (!isOpen) return;

    if (!initialRequirements) {
      setSelectedRooms({
        bedroom: true,
        kitchen: true,
        bathroom: true,
        veranda: true,
        diningRoom: false,
        garage: false,
        attachedBathroom: false,
      });
      setRoomCounts({
        bedroom: 1,
        kitchen: 1,
        bathroom: 1,
        veranda: 1,
        diningRoom: 0,
        garage: 0,
        attachedBathroom: 0,
      });
      // Step A: auto-populate floor dimensions from buildable rectangle
      setFloorWidthInput(maxUsableWidth !== null ? formatMetersFloor(maxUsableWidth) : "");
      setFloorHeightInput(maxUsableHeight !== null ? formatMetersFloor(maxUsableHeight) : "");
      setSubmitStatus(null);
      return;
    }

    const entries = initialRequirements.payload.room_template.data;
    const nextSelected: Record<ConfigurableRoomType, boolean> = {
      bedroom: false,
      kitchen: false,
      bathroom: false,
      veranda: false,
      diningRoom: false,
      garage: false,
      attachedBathroom: false,
    };
    const nextCounts: Record<ConfigurableRoomType, number> = {
      bedroom: 0,
      kitchen: 0,
      bathroom: 0,
      veranda: 0,
      diningRoom: 0,
      garage: 0,
      attachedBathroom: 0,
    };

    for (const item of entries) {
      const normalized = item.type.trim() as ConfigurableRoomType;
      if (!(normalized in roomLabels)) continue;

      nextSelected[normalized] = true;
      nextCounts[normalized] += 1;
    }

    // Ensure mandatory rooms are at least 1
    mandatoryRooms.forEach((room) => {
      nextSelected[room] = true;
      if (nextCounts[room] < 1) {
        nextCounts[room] = 1;
      }
    });

    setSelectedRooms(nextSelected);
    setRoomCounts(nextCounts);
    setFloorWidthInput((initialRequirements.floorWidthCm / 100).toString());
    setFloorHeightInput((initialRequirements.floorHeightCm / 100).toString());
    setSubmitStatus(null);
  }, [isOpen, initialRequirements]);

  const hasValidLimits = maxUsableWidth !== null && maxUsableHeight !== null;

  // ─── Feasibility ────────────────────────────────────────────────────────────
  // API unit convention: 10 API units = 1 metre, so 1 API unit = 10 cm.
  // Therefore: 1 API_unit² = 100 cm²  →  min_area_cm² = min_area_api * 100
  // maxUsableWidth / maxUsableHeight arrive in cm from the buildable-space API.

  const feasibility = useMemo<FeasibilityTag>(() => {
    if (roomSizeConstraints.length === 0) return "unknown";

    const floorWidthCm = parseMetersInputToCm(floorWidthInput);
    const floorHeightCm = parseMetersInputToCm(floorHeightInput);
    if (!floorWidthCm || !floorHeightCm || floorWidthCm <= 0 || floorHeightCm <= 0)
      return "unknown";

    const buildableAreaCm2 = floorWidthCm * floorHeightCm;

    // Build a lookup: "type:size" -> min_area (in API units²)
    const lookup = new Map<string, number>();
    for (const c of roomSizeConstraints) {
      lookup.set(`${c.type}:${c.size}`, c.min_area);
    }

    // Server always adds 1 livingRoom — include it in the estimate
    const livingRoomApiMin = lookup.get(`livingRoom:${globalRoomSize}`) ?? 0;
    let totalApiUnits2 = livingRoomApiMin;

    // All selected (and mandatory) configurable rooms
    (Object.keys(roomLabels) as ConfigurableRoomType[]).forEach((roomType) => {
      if (!selectedRooms[roomType]) return;
      const count = roomCounts[roomType];
      if (count <= 0) return;
      const roomApiMin = lookup.get(`${roomType}:${globalRoomSize}`) ?? 0;
      totalApiUnits2 += roomApiMin * count;
    });

    // Convert API units² → cm²
    const totalMinAreaCm2 = totalApiUnits2 * 100;

    if (totalMinAreaCm2 > buildableAreaCm2) return "impossible";
    if (totalMinAreaCm2 > buildableAreaCm2 * 0.75) return "tight";
    return "good";
  }, [
    roomSizeConstraints,
    selectedRooms,
    roomCounts,
    globalRoomSize,
    floorWidthInput,
    floorHeightInput,
  ]);

  const feasibilityConfig: Record<
    FeasibilityTag,
    { label: string; pillClass: string; dotClass: string }
  > = {
    good: {
      label: "Good",
      pillClass: "bg-emerald-50 border-emerald-200 text-emerald-800",
      dotClass: "bg-emerald-500",
    },
    tight: {
      label: "Tight",
      pillClass: "bg-amber-50 border-amber-200 text-amber-800",
      dotClass: "bg-amber-500",
    },
    impossible: {
      label: "Impossible",
      pillClass: "bg-red-50 border-red-200 text-red-700",
      dotClass: "bg-red-500",
    },
    unknown: {
      label: "Unknown",
      pillClass: "bg-slate-50 border-slate-200 text-slate-500",
      dotClass: "bg-slate-400",
    },
  };
  // ─────────────────────────────────────────────────────────────────────────────

  const selectedRoomSummary = useMemo(() => {
    const picked = (Object.keys(roomLabels) as ConfigurableRoomType[])
      .filter((roomType) => selectedRooms[roomType])
      .map((roomType) => `${roomLabels[roomType]}: ${roomCounts[roomType]}`);

    if (picked.length === 0) {
      return "No optional rooms selected yet.";
    }

    return picked.join(" | ");
  }, [selectedRooms, roomCounts]);

  const handleToggleRoom = (roomType: ConfigurableRoomType) => {
    if (mandatoryRooms.includes(roomType)) return;

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

  const handleCountChange = (roomType: ConfigurableRoomType, nextValue: string) => {
    const parsed = Number.parseInt(nextValue, 10);
    const isMandatory = mandatoryRooms.includes(roomType);

    if (!Number.isFinite(parsed)) {
      setRoomCounts((prev) => ({ ...prev, [roomType]: isMandatory ? 1 : 0 }));
      return;
    }

    const minCount = isMandatory ? 1 : 0;
    const bounded = Math.min(10, Math.max(minCount, parsed));
    setRoomCounts((prev) => ({ ...prev, [roomType]: bounded }));
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidLimits || maxUsableWidth === null || maxUsableHeight === null) {
      setSubmitStatus("Run Step A algorithm first to get max usable dimensions.");
      return;
    }

    const floorWidthCm = parseMetersInputToCm(floorWidthInput);
    const floorHeightCm = parseMetersInputToCm(floorHeightInput);

    if (floorWidthCm === null || floorWidthCm <= 0) {
      setSubmitStatus("Enter a valid positive floor width.");
      return;
    }

    if (floorHeightCm === null || floorHeightCm <= 0) {
      setSubmitStatus("Enter a valid positive floor height.");
      return;
    }

    const toleranceCm = 0.01;
    if (
      floorWidthCm - maxUsableWidth > toleranceCm ||
      floorHeightCm - maxUsableHeight > toleranceCm
    ) {
      setSubmitStatus("Floor dimensions cannot exceed max usable width/height.");
      return;
    }

    const roomData: Array<{ type: string; size: string; name?: string }> = [];

    (Object.keys(roomLabels) as ConfigurableRoomType[]).forEach((roomType) => {
      if (!selectedRooms[roomType]) return;
      const count = Math.max(mandatoryRooms.includes(roomType) ? 1 : 0, roomCounts[roomType]);
      for (let i = 1; i <= count; i += 1) {
        roomData.push({
          type: roomType,
          size: globalRoomSize,
          name: `${roomLabels[roomType]} ${i}`,
        });
      }
    });

    const payload: FormatV2Request = {
      floor_width: floorWidthCm,
      floor_height: floorHeightCm,
      aspect_ratio: aspectRatio,
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

            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <span className="text-sm text-slate-700">Global Room Size</span>
              <select
                value={globalRoomSize}
                onChange={(e) => setGlobalRoomSize(e.target.value)}
                className="rounded border border-slate-300 px-3 py-1.5 text-sm bg-white"
              >
                <option value="small">Small</option>
                <option value="regular">Regular</option>
                <option value="large">Large</option>
              </select>
            </div>

            {/* Living Room (Static, Grayed Out) */}
            <div className="grid grid-cols-[1fr_130px] items-center gap-3 border-b border-slate-100 py-2">
              <label className="flex items-center gap-2 text-sm text-slate-400 cursor-not-allowed">
                <input
                  type="checkbox"
                  checked={true}
                  disabled={true}
                  className="h-4 w-4 opacity-50 cursor-not-allowed"
                />
                Living Room <span className="text-xs text-slate-400">(Default)</span>
              </label>

              <input
                type="number"
                value={1}
                disabled={true}
                className="rounded border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-400 cursor-not-allowed"
              />
            </div>

            {(Object.keys(roomLabels) as ConfigurableRoomType[]).map((roomType) => {
              const isMandatory = mandatoryRooms.includes(roomType);
              return (
                <div
                  key={roomType}
                  className="grid grid-cols-[1fr_130px] items-center gap-3 border-b border-slate-100 py-2 last:border-b-0"
                >
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedRooms[roomType]}
                      onChange={() => !isMandatory && handleToggleRoom(roomType)}
                      disabled={isMandatory}
                      className={`h-4 w-4 ${isMandatory ? "opacity-50 cursor-not-allowed" : ""}`}
                    />
                    {roomLabels[roomType]}{" "}
                    {isMandatory && <span className="text-xs text-amber-600">(Req)</span>}
                  </label>

                  <input
                    type="number"
                    min={isMandatory ? 1 : 0}
                    max={10}
                    step={1}
                    value={roomCounts[roomType]}
                    onChange={(e) => handleCountChange(roomType, e.target.value)}
                    disabled={!selectedRooms[roomType]}
                    className="rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              );
            })}
            <div className="mt-2 text-xs text-slate-600">
              Living room is added by the server automatically. Required rooms must have at least 1.
            </div>
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
              Max usable size:{" "}
              {maxUsableWidth !== null ? formatLengthFromCm(maxUsableWidth, 2) : "N/A"} x{" "}
              {maxUsableHeight !== null ? formatLengthFromCm(maxUsableHeight, 2) : "N/A"}
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-medium text-slate-800">Room Summary</div>
            <div>{selectedRoomSummary}</div>
          </div>

          {submitStatus && <div className="text-sm text-indigo-700">{submitStatus}</div>}

          {/* ── Feasibility badge ──────────────────────────────────── */}
          <div
            className="flex items-center justify-between rounded-md border px-4 py-3"
            style={{ borderColor: "inherit" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-700">Feasibility</span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                  feasibilityConfig[feasibility].pillClass
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${feasibilityConfig[feasibility].dotClass}`}
                />
                {feasibilityConfig[feasibility].label}
              </span>
            </div>
            {feasibility === "impossible" && (
              <span className="text-xs text-red-600">
                Room areas exceed floor space — reduce rooms or increase floor size.
              </span>
            )}
            {feasibility === "tight" && (
              <span className="text-xs text-amber-700">
                Floor space is very tight — generation may struggle.
              </span>
            )}
          </div>

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
              disabled={!hasValidLimits || feasibility === "impossible"}
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
