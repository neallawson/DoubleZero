/**
 * Field template definitions for the Playboard Composer.
 *
 * All dimensions are in meters. The coordinate system has its origin
 * at the center of the field.
 */

import type { FieldDimensions } from './coordinateSystem';

export interface FieldMarkings {
  centerCircleRadius: number;
  penaltyAreaLength: number;
  penaltyAreaWidth: number;
  goalAreaLength: number;
  goalAreaWidth: number;
  penaltySpotDistance: number;
  cornerArcRadius: number;
  goalWidth: number;
}

export interface FieldTemplate {
  id: number;
  name: string;
  description: string;
  dimensions: FieldDimensions;
  markings: FieldMarkings;
}

/**
 * Standard 11v11 field template (100m x 64m)
 * Based on FIFA recommended dimensions
 */
export const STANDARD_11V11_TEMPLATE: FieldTemplate = {
  id: 1,
  name: 'Standard 11v11',
  description: 'Standard full-size 11v11 soccer pitch (100m x 64m)',
  dimensions: {
    length: 100,
    width: 64,
  },
  markings: {
    centerCircleRadius: 9.15,
    penaltyAreaLength: 16.5,
    penaltyAreaWidth: 40.3,
    goalAreaLength: 5.5,
    goalAreaWidth: 18.3,
    penaltySpotDistance: 11,
    cornerArcRadius: 1,
    goalWidth: 7.32,
  },
};

/**
 * Default field template for new plays
 */
export const DEFAULT_FIELD_TEMPLATE = STANDARD_11V11_TEMPLATE;

/**
 * Field colors for rendering
 */
export const FIELD_COLORS = {
  grass: '#2d5a27',
  grassLight: '#3d6a37',
  lines: '#ffffff',
  lineWidth: 0.12,  // meters (about 12cm, standard line width)
};

/**
 * Calculate positions for field markings based on template
 * All positions are in world coordinates (meters from center)
 */
export function getFieldMarkingPositions(template: FieldTemplate) {
  const { dimensions, markings } = template;
  const halfLength = dimensions.length / 2;
  const halfWidth = dimensions.width / 2;

  return {
    // Field boundaries
    field: {
      left: -halfLength,
      right: halfLength,
      top: -halfWidth,
      bottom: halfWidth,
    },

    // Center line and circle
    centerLine: {
      y1: -halfWidth,
      y2: halfWidth,
    },
    centerCircle: {
      x: 0,
      y: 0,
      radius: markings.centerCircleRadius,
    },
    centerSpot: {
      x: 0,
      y: 0,
    },

    // Left penalty area (goal at left side, x = -halfLength)
    leftPenaltyArea: {
      x: -halfLength,
      y: -markings.penaltyAreaWidth / 2,
      width: markings.penaltyAreaLength,
      height: markings.penaltyAreaWidth,
    },
    leftGoalArea: {
      x: -halfLength,
      y: -markings.goalAreaWidth / 2,
      width: markings.goalAreaLength,
      height: markings.goalAreaWidth,
    },
    leftPenaltySpot: {
      x: -halfLength + markings.penaltySpotDistance,
      y: 0,
    },
    leftGoal: {
      x: -halfLength,
      y: -markings.goalWidth / 2,
      width: 0,
      height: markings.goalWidth,
    },

    // Right penalty area (goal at right side, x = halfLength)
    rightPenaltyArea: {
      x: halfLength - markings.penaltyAreaLength,
      y: -markings.penaltyAreaWidth / 2,
      width: markings.penaltyAreaLength,
      height: markings.penaltyAreaWidth,
    },
    rightGoalArea: {
      x: halfLength - markings.goalAreaLength,
      y: -markings.goalAreaWidth / 2,
      width: markings.goalAreaLength,
      height: markings.goalAreaWidth,
    },
    rightPenaltySpot: {
      x: halfLength - markings.penaltySpotDistance,
      y: 0,
    },
    rightGoal: {
      x: halfLength,
      y: -markings.goalWidth / 2,
      width: 0,
      height: markings.goalWidth,
    },

    // Corner arcs
    corners: {
      topLeft: { x: -halfLength, y: -halfWidth },
      topRight: { x: halfLength, y: -halfWidth },
      bottomLeft: { x: -halfLength, y: halfWidth },
      bottomRight: { x: halfLength, y: halfWidth },
      radius: markings.cornerArcRadius,
    },
  };
}
