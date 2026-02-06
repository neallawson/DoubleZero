import { Group } from 'react-konva';
import { ArrowShape, type AnnotationData } from '../shapes/ArrowShape';

interface AnnotationLayerProps {
  annotations: AnnotationData[];
  selectedAnnotationId?: string | null;
  onSelectAnnotation?: (annotationId: string) => void;
  onAnnotationDragEnd?: (
    annotationId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => void;
}

/**
 * AnnotationLayer renders all annotations (lines, arrows) on the field.
 * Manages annotation selection and edit events.
 */
export function AnnotationLayer({
  annotations,
  selectedAnnotationId,
  onSelectAnnotation,
  onAnnotationDragEnd,
}: AnnotationLayerProps) {
  return (
    <Group>
      {annotations.map((annotation) => (
        <ArrowShape
          key={annotation.id}
          annotation={annotation}
          isSelected={annotation.id === selectedAnnotationId}
          onSelect={onSelectAnnotation}
          onDragEnd={onAnnotationDragEnd}
        />
      ))}
    </Group>
  );
}
