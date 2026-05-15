# User Guide: Phase-by-Phase Floor Plan Generation

This guide explains how to use the client interface to generate a floor plan in a clear sequence. The workspace is designed to support gradual refinement, so each stage should be completed before moving to the next.

## 1. Start the workspace

Open the application from the landing page and enter the main workspace. The interface introduces the project and provides access to the drawing area where the canvas is prepared.

## 2. Define the land boundary

Use the canvas to shape the site boundary. The plot is represented as a polygon, and the user may adjust the visible corner points until the land outline matches the intended site. This stage establishes the geometric basis for all later calculations.

## 3. Match the target area

Enter the desired land area and apply the scaling step. The client adjusts the boundary proportionally so that the plot aligns with the requested size. This helps ensure that the design begins from a realistic spatial framework.

## 4. Place the road connection

If the site requires access from a road, activate road placement and position the connection along the plot edge. This step is important because it influences the usable portion of the land and the eventual arrangement of the building footprint.

## 5. Generate usable land

After the boundary and access point are set, request the buildable-space calculation. The client communicates with the server and returns a usable rectangle together with the adjusted boundary. These results indicate where construction is feasible within the plot.

## 6. Configure the rooms

Open the room configuration panel and select the required interior spaces. Specify the overall floor dimensions and review the feasibility feedback before submission. This stage helps confirm that the requested layout can fit within the available area.

## 7. Generate and review the floor plan

Submit the configuration to begin the floor-plan generation process. The interface displays progress while the system works. When the result is ready, the plan appears in preview form with walls, room labels, openings, and related spatial details. Users may then inspect the layout and return to earlier stages if changes are needed.

## 8. Refine and repeat when necessary

Floor-plan generation is best treated as an iterative process rather than a one-time submission. If the preview does not satisfy the design goal, adjust the land shape, revise the usable area, or modify the room selection and generate again. The client preserves a smooth flow between stages, so corrections can be made without restarting the entire task. This makes the workspace suitable for careful comparison of alternatives and for progressive design improvement.
