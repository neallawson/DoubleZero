import { useCallback } from 'react';
import { Arrow, Group, Circle } from 'react-konva';
import type Konva from 'konva';

export type AnnotationType = 'LINE' | 'ARROW' | 'DASHED_LINE' | 'DASHED_ARROW';

export interface AnnotationData {
  id: string;
  annotationType: AnnotationType;
  startX: number;  // world coordinates (meters)
  startY: number;
  endX: number;
  endY: number;
  color: string;
  strokeWidth: number;
}

interface ArrowShapeProps {
  annotation: AnnotationData;
  isSelected?: boolean;
  onSelect?: (annotationId: string) => void;
  onDragEnd?: (annotationId: string, startX: number, startY: number, endX: number, endY: number) => void;
}

const HANDLE_RADIUS = 0.8;  // meters
const HIT_STROKE_WIDTH = 3;  // meters - large enough for touch targets

/**
 * ArrowShape renders an arrow or line annotation.
 * Supports solid and dashed variants, with or without arrowhead.
 */
export function ArrowShape({
  annotation,
  isSelected = false,
  onSelect,
  onDragEnd,
}: ArrowShapeProps) {
  const { annotationType, startX, startY, endX, endY, color, strokeWidth } = annotation;

  const isDashed = annotationType === 'DASHED_LINE' || annotationType === 'DASHED_ARROW';
  const hasArrow = annotationType === 'ARROW' || annotationType === 'DASHED_ARROW';

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(annotation.id);
    }
  }, [onSelect, annotation.id]);

  const handleStartDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (onDragEnd) {
      const node = e.target;
      onDragEnd(annotation.id, node.x(), node.y(), endX, endY);
    }
  }, [onDragEnd, annotation.id, endX, endY]);

  const handleEndDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (onDragEnd) {
      const node = e.target;
      onDragEnd(annotation.id, startX, startY, node.x(), node.y());
    }
  }, [onDragEnd, annotation.id, startX, startY]);

  // Calculate arrow pointer size based on stroke width
  const pointerLength = hasArrow ? strokeWidth * 3 : 0;
  const pointerWidth = hasArrow ? strokeWidth * 2.5 : 0;

  // Dash pattern for dashed lines
  const dash = isDashed ? [strokeWidth * 2, strokeWidth] : undefined;

  return (
    <Group onClick={handleClick} onTap={handleClick}>
      {/* Main arrow/line */}
      <Arrow
        points={[startX, startY, endX, endY]}
        stroke={color}
        strokeWidth={strokeWidth}
        fill={hasArrow ? color : undefined}
        pointerLength={pointerLength}
        pointerWidth={pointerWidth}
        dash={dash}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={HIT_STROKE_WIDTH}
        onClick={handleClick}
        onTap={handleClick}
      />

      {/* Selection handles */}
      {isSelected && (
        <>
          {/* Start handle */}
          <Circle
            x={startX}
            y={startY}
            radius={HANDLE_RADIUS}
            fill="#ffffff"
            stroke={color}
            strokeWidth={0.1}
            draggable
            onDragEnd={handleStartDragEnd}
          />
          {/* End handle */}
          <Circle
            x={endX}
            y={endY}
            radius={HANDLE_RADIUS}
            fill="#ffffff"
            stroke={color}
            strokeWidth={0.1}
            draggable
            onDragEnd={handleEndDragEnd}
          />
        </>
      )}
    </Group>
  );
}
