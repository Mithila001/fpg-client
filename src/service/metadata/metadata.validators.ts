import { createPrimitiveValidators } from "../validation";
import type { ValidationFailure } from "../validation";
import { MetadataServiceError } from "./metadata.errors";
import type { MetadataApiResponse } from "./metadata.api.types";

const fail: ValidationFailure = (_target, path, reason): never => {
  throw new MetadataServiceError({
    kind: "invalid_response",
    message: `Invalid metadata response at ${path}: ${reason}`,
  });
};

const {
  asRecord,
  asArray,
  asBoolean,
  asString,
  asFiniteNumber,
  asNonNegativeNumber,
  asNonNegativeInteger,
  asEnumValue,
} = createPrimitiveValidators(fail);

const ROAD_TYPES = ["main_road", "private_road"] as const;
const MATCH_POLICIES = ["and", "or"] as const;
const STRENGTHS = ["hard", "soft"] as const;

export const parseMetadataResponse = (value: unknown): MetadataApiResponse => {
  const root = asRecord(value, "metadata", "response");
  const schemaVersion = asFiniteNumber(
    root.schema_version,
    "metadata.schema_version",
    "response",
  );
  if (schemaVersion !== 1) {
    fail("response", "metadata.schema_version", `unsupported version ${schemaVersion}`);
  }

  const referenceData = asRecord(
    root.generation_reference_data,
    "metadata.generation_reference_data",
    "response",
  );
  const buffers = asRecord(root.buffers, "metadata.buffers", "response");

  const roomSizes = asArray(
    referenceData.room_sizes,
    "metadata.generation_reference_data.room_sizes",
    "response",
  ).map((item, index) => {
    const path = `metadata.generation_reference_data.room_sizes[${index}]`;
    const record = asRecord(item, path, "response");
    return {
      room_type: asString(record.room_type, `${path}.room_type`, "response"),
      size: asString(record.size, `${path}.size`, "response"),
      min_width: asNonNegativeNumber(record.min_width, `${path}.min_width`, "response"),
      max_width: asNonNegativeNumber(record.max_width, `${path}.max_width`, "response"),
      min_area: asNonNegativeNumber(record.min_area, `${path}.min_area`, "response"),
      max_area: asNonNegativeNumber(record.max_area, `${path}.max_area`, "response"),
    };
  });

  const roomRelations = asArray(
    referenceData.room_relations,
    "metadata.generation_reference_data.room_relations",
    "response",
  ).map((item, index) => {
    const path = `metadata.generation_reference_data.room_relations[${index}]`;
    const record = asRecord(item, path, "response");
    return {
      source_room_type: asString(record.source_room_type, `${path}.source_room_type`, "response"),
      target_room_types: asArray(record.target_room_types, `${path}.target_room_types`, "response")
        .map((target, targetIndex) =>
          asString(target, `${path}.target_room_types[${targetIndex}]`, "response"),
        ),
      match_policy: asEnumValue(record.match_policy, MATCH_POLICIES, `${path}.match_policy`, "response"),
      strength: asEnumValue(record.strength, STRENGTHS, `${path}.strength`, "response"),
      required: asBoolean(record.required, `${path}.required`, "response"),
    };
  });

  const roadTypes = asArray(root.road_types, "metadata.road_types", "response")
    .map((item, index) => {
      const path = `metadata.road_types[${index}]`;
      const record = asRecord(item, path, "response");
      return {
        value: asEnumValue(record.value, ROAD_TYPES, `${path}.value`, "response"),
        name: asString(record.name, `${path}.name`, "response"),
        display_name: asString(record.display_name, `${path}.display_name`, "response"),
      };
    });

  const roomRequirements = asArray(
    root.room_requirements,
    "metadata.room_requirements",
    "response",
  ).map((item, index) => {
    const path = `metadata.room_requirements[${index}]`;
    const record = asRecord(item, path, "response");
    const minCount = asNonNegativeInteger(record.min_count, `${path}.min_count`, "response");
    const maxCount = asNonNegativeInteger(record.max_count, `${path}.max_count`, "response");
    if (maxCount < minCount) {
      fail("response", `${path}.max_count`, "must be greater than or equal to min_count");
    }
    return {
      room_type: asString(record.room_type, `${path}.room_type`, "response"),
      name: asString(record.name, `${path}.name`, "response"),
      min_count: minCount,
      max_count: maxCount,
      client_selectable: asBoolean(record.client_selectable, `${path}.client_selectable`, "response"),
    };
  });

  const compatibleAspectRatios = asArray(
    root.compatible_aspect_ratios,
    "metadata.compatible_aspect_ratios",
    "response",
  ).map((item, index) => {
    const path = `metadata.compatible_aspect_ratios[${index}]`;
    const record = asRecord(item, path, "response");
    return {
      label: asString(record.label, `${path}.label`, "response"),
      value: asFiniteNumber(record.value, `${path}.value`, "response"),
    };
  });

  if (roadTypes.length === 0 || roomRequirements.length === 0 || compatibleAspectRatios.length === 0) {
    fail("response", "metadata", "road types, room requirements, and aspect ratios cannot be empty");
  }

  return {
    schema_version: 1,
    generation_reference_data: {
      room_sizes: roomSizes,
      room_relations: roomRelations,
    },
    road_types: roadTypes,
    room_requirements: roomRequirements,
    compatible_aspect_ratios: compatibleAspectRatios,
    buffers: {
      hallway_area: asNonNegativeNumber(buffers.hallway_area, "metadata.buffers.hallway_area", "response"),
      floor_area: asNonNegativeNumber(buffers.floor_area, "metadata.buffers.floor_area", "response"),
      unit: asEnumValue(buffers.unit, ["square_project_units"] as const, "metadata.buffers.unit", "response"),
    },
  };
};
