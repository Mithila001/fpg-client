import { describe, expect, it } from "vitest";
import { parseMetadataResponse } from "./metadata.validators";

describe("metadata v2 parser", () => {
  it("accepts the documented catalog and preserves non-selectable rooms", () => {
    const metadata = parseMetadataResponse({
      schema_version: 2, project_units_per_meter: 10, front_axis: "-Y",
      road_types: [{ value: "main_road", name: "MAIN_ROAD", display_name: "Main Road" }],
      room_requirements: [
        { room_type: "bedroom", min_count: 1, max_count: 4, client_selectable: true },
        { room_type: "hallway", min_count: 1, max_count: 1, client_selectable: false },
      ],
      room_sizes: [{ room_type: "bedroom", size: "regular", min_width: 30, max_width: 42, min_area: 900, max_area: 1764 }],
      compatible_aspect_ratios: [{ label: "1:1", value: 1 }],
    });
    expect(metadata.schema_version).toBe(2);
    expect(metadata.room_requirements[1]?.client_selectable).toBe(false);
  });

  it("rejects the retired metadata schema", () => {
    expect(() => parseMetadataResponse({ schema_version: 1 })).toThrow(/schema_version/);
  });
});
