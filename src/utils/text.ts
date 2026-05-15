/**
 * Formats room names and types for display in the UI.
 * 
 * Rules:
 * 1. type === "attachedBathroom" -> "Attached\nBathroom"
 * 2. name starts with "hallway" -> "Hallway"
 * 3. Normalize "exampleName1", "ExampleName 1", "example_name_1" -> "Example Name 1"
 */
export const formatRoomName = (name: string, type?: string): string => {
  // 1. Specific room type "attachedBathroom"
  if (type === "attachedBathroom") {
    return "Attached\nBathroom";
  }

  // 2. Hallway prefix (case insensitive)
  if (name.toLowerCase().startsWith("hallway")) {
    return "Hallway";
  }

  // 3. Normalization logic
  // Replace underscores with spaces
  let formatted = name.replace(/_/g, " ");

  // Add space before uppercase letters (CamelCase to spaces)
  // e.g., "exampleName" -> "example Name"
  formatted = formatted.replace(/([a-z])([A-Z])/g, "$1 $2");

  // Add space before numbers if not already there
  // e.g., "name1" -> "name 1"
  formatted = formatted.replace(/([a-zA-Z])(\d)/g, "$1 $2");

  // Clean up multiple spaces
  formatted = formatted.replace(/\s+/g, " ");

  // Title Case: Capitalize first letter of each word
  return formatted
    .trim()
    .split(" ")
    .map((word) => {
      if (!word) return "";
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
};
