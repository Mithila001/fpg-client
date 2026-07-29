import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { PROJECT_UNITS_PER_METER } from "../../../measurement";
import {
  ROOM_TYPES,
  type RoomType,
  type WorkspaceMetadata,
} from "../../../types";
import type {
  FloorPlanRequirements,
  RoomRequirementSelection,
} from "../workflow.types";

interface EditableRoomSelection extends RoomRequirementSelection {
  enabled: boolean;
}

interface RoomRequirementsDialogProps {
  open: boolean;
  metadata: WorkspaceMetadata;
  maxWidth: number;
  maxLength: number;
  initialValue: FloorPlanRequirements | null;
  onClose: () => void;
  onSave: (requirements: FloorPlanRequirements) => void;
}

const toMetersInput = (projectLength: number): string =>
  (projectLength / PROJECT_UNITS_PER_METER).toFixed(2);

const parseMeters = (value: string): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed * PROJECT_UNITS_PER_METER;
};

const roomLabel = (roomType: string): string => {
  const words = roomType.replaceAll("_", " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
};

export const RoomRequirementsDialog = ({
  open,
  metadata,
  maxWidth,
  maxLength,
  initialValue,
  onClose,
  onSave,
}: RoomRequirementsDialogProps) => {
  const roomCatalog = useMemo(() => {
    const supportedTypes = new Set<string>(ROOM_TYPES);
    return metadata.roomRequirements
      .filter(
        (requirement) =>
          requirement.clientSelectable &&
          supportedTypes.has(requirement.roomType),
      )
      .map((requirement) => ({
        roomType: requirement.roomType as RoomType,
        name: requirement.name,
        minCount: requirement.minCount,
        maxCount: requirement.maxCount,
        sizes: metadata.roomSizes
          .filter((size) => size.roomType === requirement.roomType)
          .map((size) => size.size),
        relations: metadata.roomRelations.filter(
          (relation) => relation.sourceRoomType === requirement.roomType,
        ),
      }))
      .filter((room) => room.sizes.length > 0);
  }, [metadata]);

  const [widthInput, setWidthInput] = useState("");
  const [lengthInput, setLengthInput] = useState("");
  const [rooms, setRooms] = useState<EditableRoomSelection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    setWidthInput(toMetersInput(initialValue?.floorWidth ?? maxWidth));
    setLengthInput(toMetersInput(initialValue?.floorLength ?? maxLength));

    const previous = new Map(
      initialValue?.selections.map((selection) => [
        selection.roomType,
        selection,
      ]) ?? [],
    );

    setRooms(
      roomCatalog.map(({ roomType, sizes, minCount }) => {
        const existing = previous.get(roomType);
        const mandatory = minCount > 0;
        return {
          roomType,
          count: existing?.count ?? minCount,
          size:
            existing && sizes.includes(existing.size)
              ? existing.size
              : (sizes[0] ?? ""),
          enabled: mandatory || existing !== undefined,
        };
      }),
    );
    setError(null);
  }, [initialValue, maxLength, maxWidth, open, roomCatalog]);

  const floorWidth = parseMeters(widthInput);
  const floorLength = parseMeters(lengthInput);

  const feasibility = useMemo(() => {
    if (floorWidth === null || floorLength === null) return "unknown" as const;

    const lookup = new Map(
      metadata.roomSizes.map((constraint) => [
        `${constraint.roomType}:${constraint.size}`,
        constraint.minArea,
      ]),
    );
    const selected = rooms.filter((room) => room.enabled && room.count > 0);
    if (selected.length === 0) return "unknown" as const;

    const minimumArea =
      selected.reduce(
      (sum, room) =>
        sum +
        (lookup.get(`${room.roomType}:${room.size}`) ?? 0) * room.count,
      0,
      ) +
      metadata.buffers.hallwayArea +
      metadata.buffers.floorArea;
    const availableArea = floorWidth * floorLength;
    if (minimumArea > availableArea) return "impossible" as const;
    if (minimumArea > availableArea * 0.75) return "tight" as const;
    return "good" as const;
  }, [floorLength, floorWidth, metadata, rooms]);

  if (!open) return null;

  const updateRoom = (
    roomType: RoomType,
    patch: Partial<EditableRoomSelection>,
  ) => {
    setRooms((current) =>
      current.map((room) =>
        room.roomType === roomType ? { ...room, ...patch } : room,
      ),
    );
  };

  const submit = () => {
    if (floorWidth === null || floorLength === null) {
      setError("Enter valid positive floor dimensions.");
      return;
    }
    if (floorWidth > maxWidth + 0.001 || floorLength > maxLength + 0.001) {
      setError("Floor dimensions cannot exceed the usable rectangle.");
      return;
    }

    const selected = rooms.filter(
      (room) => room.enabled && room.count > 0 && room.size.length > 0,
    );
    const invalidCount = roomCatalog.find((catalogRoom) => {
      const selectedRoom = rooms.find(
        (room) => room.roomType === catalogRoom.roomType,
      );
      const count = selectedRoom?.enabled ? selectedRoom.count : 0;
      return count < catalogRoom.minCount || count > catalogRoom.maxCount;
    });
    if (invalidCount) {
      setError(
        `${roomLabel(invalidCount.roomType)} count must be between ${invalidCount.minCount} and ${invalidCount.maxCount}.`,
      );
      return;
    }

    const bedroomCount =
      selected.find((room) => room.roomType === "bedroom")?.count ?? 0;
    const attachedBathroomCount =
      selected.find((room) => room.roomType === "attached_bathroom")?.count ??
      0;
    if (attachedBathroomCount > bedroomCount) {
      setError("Attached bathrooms cannot exceed the bedroom count.");
      return;
    }
    if (feasibility === "impossible") {
      setError("The selected rooms cannot fit within these floor dimensions.");
      return;
    }

    const generationRooms = selected.flatMap((selection) =>
      Array.from({ length: selection.count }, (_, index) => ({
        id: `${selection.roomType}_${index + 1}`,
        roomType: selection.roomType,
        name: `${roomLabel(selection.roomType)} ${index + 1}`,
        requestedSize: selection.size,
      })),
    );

    const summary = selected
      .map(
        (selection) =>
          `${roomLabel(selection.roomType)} × ${selection.count} (${selection.size})`,
      )
      .join(" · ");

    onSave({
      floorWidth,
      floorLength,
      rooms: generationRooms,
      selections: selected.map((selection) => ({
        roomType: selection.roomType,
        count: selection.count,
        size: selection.size,
      })),
      summary,
    });
  };

  const feasibilityClass =
    feasibility === "good"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : feasibility === "tight"
        ? "border-amber-200 bg-amber-50 text-amber-700"
        : feasibility === "impossible"
          ? "border-rose-200 bg-rose-50 text-rose-700"
          : "border-slate-200 bg-slate-50 text-slate-500";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="room-requirements-title"
        className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-600">
              Generation requirements
            </p>
            <h2
              id="room-requirements-title"
              className="mt-1 text-xl font-bold text-slate-950"
            >
              Configure rooms
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Room types and sizes come from the running server.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </header>

        <div className="max-h-[calc(92vh-150px)] space-y-5 overflow-y-auto px-6 py-5">
          <section className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
            <label className="text-sm font-semibold text-slate-700">
              Floor width (m)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={widthInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setWidthInput(event.target.value)
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Maximum {toMetersInput(maxWidth)} m
              </span>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Floor length (m)
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={lengthInput}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setLengthInput(event.target.value)
                }
                className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-slate-950 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <span className="mt-1 block text-xs font-normal text-slate-500">
                Maximum {toMetersInput(maxLength)} m
              </span>
            </label>
          </section>

          <div
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${feasibilityClass}`}
          >
            Estimated fit: {feasibility}
          </div>

          <section className="space-y-2">
            {rooms.map((room) => {
              const catalogEntry = roomCatalog.find(
                (item) => item.roomType === room.roomType,
              );
              const sizes = catalogEntry?.sizes ?? [];
              const mandatory = (catalogEntry?.minCount ?? 0) > 0;

              return (
                <div
                  key={room.roomType}
                  className="grid items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_100px_150px]"
                >
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={room.enabled}
                      disabled={mandatory}
                      onChange={(event: ChangeEvent<HTMLInputElement>) =>
                        updateRoom(room.roomType, {
                          enabled: event.target.checked,
                          count: event.target.checked
                            ? Math.max(catalogEntry?.minCount ?? 1, room.count)
                            : 0,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300 text-indigo-600"
                    />
                    <span>
                      <span className="block text-sm font-semibold text-slate-800">
                        {roomLabel(room.roomType)}
                      </span>
                      <span className="text-xs text-slate-500">
                        {mandatory
                          ? `Required · ${catalogEntry?.minCount}–${catalogEntry?.maxCount}`
                          : `Optional · maximum ${catalogEntry?.maxCount}`}
                      </span>
                      {(catalogEntry?.relations.length ?? 0) > 0 && (
                        <span className="mt-1 block text-xs text-slate-400">
                          {catalogEntry?.relations
                            .map(
                              (relation) =>
                                `${relation.strength === "hard" ? "Connects" : "Prefers"} ${relation.targetRoomTypes.map(roomLabel).join(relation.matchPolicy === "and" ? " and " : " or ")}`,
                            )
                            .join(" · ")}
                        </span>
                      )}
                    </span>
                  </label>

                  <input
                    aria-label={`${roomLabel(room.roomType)} count`}
                    type="number"
                    min={catalogEntry?.minCount ?? 0}
                    max={catalogEntry?.maxCount ?? 1}
                    value={room.count}
                    disabled={!room.enabled}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      updateRoom(room.roomType, {
                        count: Math.min(
                          catalogEntry?.maxCount ?? 1,
                          Math.max(
                            catalogEntry?.minCount ?? 0,
                            Number.parseInt(event.target.value, 10) || 1,
                          ),
                        ),
                      })
                    }
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
                  />

                  <select
                    aria-label={`${roomLabel(room.roomType)} size`}
                    value={room.size}
                    disabled={!room.enabled}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      updateRoom(room.roomType, { size: event.target.value })
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm capitalize disabled:bg-slate-100"
                  >
                    {sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })}
          </section>

          {error && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </div>
          )}
        </div>

        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={roomCatalog.length === 0}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Save requirements
          </button>
        </footer>
      </div>
    </div>
  );
};
