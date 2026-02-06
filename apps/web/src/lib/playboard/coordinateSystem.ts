/**
 * Coordinate system utilities for the Playboard Composer.
 *
 * The playboard uses a world coordinate system in meters with the origin at
 * the center of the field. This allows plays to be stored device-agnostically
 * and rendered correctly on any screen size.
 */

export interface WorldCoords {
  x: number;  // meters from center (positive = right)
  y: number;  // meters from center (positive = down toward goal)
}

export interface ScreenCoords {
  x: number;  // pixels
  y: number;  // pixels
}

export interface ViewportTransform {
  scale: number;      // Zoom level (1 = fit to canvas)
  offsetX: number;    // Pan X in screen pixels
  offsetY: number;    // Pan Y in screen pixels
}

export interface FieldDimensions {
  length: number;     // meters (goal line to goal line, typically 100)
  width: number;      // meters (touchline to touchline, typically 64)
}

export interface CanvasSize {
  width: number;      // pixels
  height: number;     // pixels
}

/**
 * Calculate the base scale to fit the entire field in the canvas
 * while maintaining aspect ratio
 */
export function calculateBaseScale(
  field: FieldDimensions,
  canvas: CanvasSize,
  padding: number = 20
): number {
  const availableWidth = canvas.width - padding * 2;
  const availableHeight = canvas.height - padding * 2;

  const scaleX = availableWidth / field.length;
  const scaleY = availableHeight / field.width;

  return Math.min(scaleX, scaleY);
}

/**
 * Calculate the offset to center the field in the canvas
 */
export function calculateCenterOffset(
  field: FieldDimensions,
  canvas: CanvasSize,
  baseScale: number
): { offsetX: number; offsetY: number } {
  const fieldWidthPx = field.length * baseScale;
  const fieldHeightPx = field.width * baseScale;

  return {
    offsetX: (canvas.width - fieldWidthPx) / 2 + (field.length / 2) * baseScale,
    offsetY: (canvas.height - fieldHeightPx) / 2 + (field.width / 2) * baseScale,
  };
}

/**
 * Convert world coordinates (meters from center) to screen coordinates (pixels)
 */
export function worldToScreen(
  world: WorldCoords,
  viewport: ViewportTransform,
  field: FieldDimensions,
  canvas: CanvasSize
): ScreenCoords {
  const baseScale = calculateBaseScale(field, canvas);
  const centerOffset = calculateCenterOffset(field, canvas, baseScale);

  const finalScale = baseScale * viewport.scale;

  return {
    x: world.x * finalScale + centerOffset.offsetX * viewport.scale + viewport.offsetX,
    y: world.y * finalScale + centerOffset.offsetY * viewport.scale + viewport.offsetY,
  };
}

/**
 * Convert screen coordinates (pixels) to world coordinates (meters from center)
 */
export function screenToWorld(
  screen: ScreenCoords,
  viewport: ViewportTransform,
  field: FieldDimensions,
  canvas: CanvasSize
): WorldCoords {
  const baseScale = calculateBaseScale(field, canvas);
  const centerOffset = calculateCenterOffset(field, canvas, baseScale);

  const finalScale = baseScale * viewport.scale;

  return {
    x: (screen.x - viewport.offsetX - centerOffset.offsetX * viewport.scale) / finalScale,
    y: (screen.y - viewport.offsetY - centerOffset.offsetY * viewport.scale) / finalScale,
  };
}

/**
 * Get the Konva stage transform props for the current viewport
 */
export function getStageTransform(
  viewport: ViewportTransform,
  field: FieldDimensions,
  canvas: CanvasSize
): { scaleX: number; scaleY: number; x: number; y: number } {
  const baseScale = calculateBaseScale(field, canvas);
  const centerOffset = calculateCenterOffset(field, canvas, baseScale);

  const finalScale = baseScale * viewport.scale;

  return {
    scaleX: finalScale,
    scaleY: finalScale,
    x: centerOffset.offsetX * viewport.scale + viewport.offsetX,
    y: centerOffset.offsetY * viewport.scale + viewport.offsetY,
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Check if a point is within the field boundaries
 */
export function isWithinField(point: WorldCoords, field: FieldDimensions): boolean {
  const halfLength = field.length / 2;
  const halfWidth = field.width / 2;

  return (
    point.x >= -halfLength &&
    point.x <= halfLength &&
    point.y >= -halfWidth &&
    point.y <= halfWidth
  );
}

/**
 * Clamp a point to field boundaries
 */
export function clampToField(point: WorldCoords, field: FieldDimensions): WorldCoords {
  const halfLength = field.length / 2;
  const halfWidth = field.width / 2;

  return {
    x: clamp(point.x, -halfLength, halfLength),
    y: clamp(point.y, -halfWidth, halfWidth),
  };
}

/**
 * Default viewport (no zoom, no pan)
 */
export const DEFAULT_VIEWPORT: ViewportTransform = {
  scale: 1,
  offsetX: 0,
  offsetY: 0,
};

/**
 * Viewport constraints
 */
export const VIEWPORT_LIMITS = {
  minScale: 0.5,
  maxScale: 4,
};
