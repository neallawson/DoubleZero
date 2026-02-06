import { Group, Rect, Line, Circle, Arc } from 'react-konva';
import {
  type FieldTemplate,
  DEFAULT_FIELD_TEMPLATE,
  FIELD_COLORS,
  getFieldMarkingPositions,
} from '../../../lib/playboard/fieldTemplates';

interface FieldLayerProps {
  template?: FieldTemplate;
}

/**
 * FieldLayer renders the soccer field with all standard markings.
 * All coordinates are in world space (meters from center).
 * The Konva Stage transform handles conversion to screen coordinates.
 */
export function FieldLayer({ template = DEFAULT_FIELD_TEMPLATE }: FieldLayerProps) {
  const positions = getFieldMarkingPositions(template);
  const { dimensions } = template;
  const lineWidth = FIELD_COLORS.lineWidth;

  const halfLength = dimensions.length / 2;
  const halfWidth = dimensions.width / 2;

  return (
    <Group listening={false}>
      {/* Grass background */}
      <Rect
        x={-halfLength}
        y={-halfWidth}
        width={dimensions.length}
        height={dimensions.width}
        fill={FIELD_COLORS.grass}
      />

      {/* Grass stripes (alternating lighter bands) */}
      {Array.from({ length: 10 }).map((_, i) => (
        i % 2 === 0 ? (
          <Rect
            key={`stripe-${i}`}
            x={-halfLength + (i * dimensions.length / 10)}
            y={-halfWidth}
            width={dimensions.length / 10}
            height={dimensions.width}
            fill={FIELD_COLORS.grassLight}
          />
        ) : null
      ))}

      {/* Field boundary (touchlines and goal lines) */}
      <Rect
        x={-halfLength}
        y={-halfWidth}
        width={dimensions.length}
        height={dimensions.width}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Center line */}
      <Line
        points={[0, positions.centerLine.y1, 0, positions.centerLine.y2]}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />

      {/* Center circle */}
      <Circle
        x={positions.centerCircle.x}
        y={positions.centerCircle.y}
        radius={positions.centerCircle.radius}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Center spot */}
      <Circle
        x={positions.centerSpot.x}
        y={positions.centerSpot.y}
        radius={0.2}
        fill={FIELD_COLORS.lines}
      />

      {/* Left penalty area */}
      <Rect
        x={positions.leftPenaltyArea.x}
        y={positions.leftPenaltyArea.y}
        width={positions.leftPenaltyArea.width}
        height={positions.leftPenaltyArea.height}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Left goal area */}
      <Rect
        x={positions.leftGoalArea.x}
        y={positions.leftGoalArea.y}
        width={positions.leftGoalArea.width}
        height={positions.leftGoalArea.height}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Left penalty spot */}
      <Circle
        x={positions.leftPenaltySpot.x}
        y={positions.leftPenaltySpot.y}
        radius={0.2}
        fill={FIELD_COLORS.lines}
      />

      {/* Left penalty arc */}
      <Arc
        x={positions.leftPenaltySpot.x}
        y={positions.leftPenaltySpot.y}
        innerRadius={positions.centerCircle.radius}
        outerRadius={positions.centerCircle.radius}
        angle={106}
        rotation={-53}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />

      {/* Right penalty area */}
      <Rect
        x={positions.rightPenaltyArea.x}
        y={positions.rightPenaltyArea.y}
        width={positions.rightPenaltyArea.width}
        height={positions.rightPenaltyArea.height}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Right goal area */}
      <Rect
        x={positions.rightGoalArea.x}
        y={positions.rightGoalArea.y}
        width={positions.rightGoalArea.width}
        height={positions.rightGoalArea.height}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
        fillEnabled={false}
      />

      {/* Right penalty spot */}
      <Circle
        x={positions.rightPenaltySpot.x}
        y={positions.rightPenaltySpot.y}
        radius={0.2}
        fill={FIELD_COLORS.lines}
      />

      {/* Right penalty arc */}
      <Arc
        x={positions.rightPenaltySpot.x}
        y={positions.rightPenaltySpot.y}
        innerRadius={positions.centerCircle.radius}
        outerRadius={positions.centerCircle.radius}
        angle={106}
        rotation={127}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />

      {/* Corner arcs */}
      <Arc
        x={positions.corners.topLeft.x}
        y={positions.corners.topLeft.y}
        innerRadius={positions.corners.radius}
        outerRadius={positions.corners.radius}
        angle={90}
        rotation={0}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />
      <Arc
        x={positions.corners.topRight.x}
        y={positions.corners.topRight.y}
        innerRadius={positions.corners.radius}
        outerRadius={positions.corners.radius}
        angle={90}
        rotation={90}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />
      <Arc
        x={positions.corners.bottomRight.x}
        y={positions.corners.bottomRight.y}
        innerRadius={positions.corners.radius}
        outerRadius={positions.corners.radius}
        angle={90}
        rotation={180}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />
      <Arc
        x={positions.corners.bottomLeft.x}
        y={positions.corners.bottomLeft.y}
        innerRadius={positions.corners.radius}
        outerRadius={positions.corners.radius}
        angle={90}
        rotation={270}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth}
      />

      {/* Goals (behind goal lines) */}
      <Rect
        x={-halfLength - 2}
        y={-template.markings.goalWidth / 2}
        width={2}
        height={template.markings.goalWidth}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth * 2}
        fillEnabled={false}
      />
      <Rect
        x={halfLength}
        y={-template.markings.goalWidth / 2}
        width={2}
        height={template.markings.goalWidth}
        stroke={FIELD_COLORS.lines}
        strokeWidth={lineWidth * 2}
        fillEnabled={false}
      />
    </Group>
  );
}
