import { useRef, useState, useCallback, useEffect } from 'react';
import { Stage, Layer } from 'react-konva';
import type Konva from 'konva';
import { FieldLayer } from './layers/FieldLayer';
import { PlayerLayer } from './layers/PlayerLayer';
import { AnnotationLayer } from './layers/AnnotationLayer';
import { PlayerInfoCard, type PlayerData } from './shapes/PlayerIcon';
import { PlayerPickerPopup, type PlayerSelection } from './panels/PlayerPickerPopup';
import type { AnnotationType } from './shapes/ArrowShape';
import type { ToolType } from './PlayboardToolbar';
import type { TeamMember } from '../../lib/api';
import {
  type ViewportTransform,
  type CanvasSize,
  DEFAULT_VIEWPORT,
  VIEWPORT_LIMITS,
  getStageTransform,
  screenToWorld,
} from '../../lib/playboard/coordinateSystem';
import { DEFAULT_FIELD_TEMPLATE } from '../../lib/playboard/fieldTemplates';

interface PlayboardCanvasProps {
  players: PlayerData[];
  annotations: any[];
  selectedPlayerId: string | null;
  selectedAnnotationId: string | null;
  selectedTool: ToolType;
  selectedTeamSide: 0 | 1;
  roster: TeamMember[];
  teamName?: string;
  teamColor?: string;
  onSelectPlayer: (playerId: string | null) => void;
  onSelectAnnotation: (annotationId: string | null) => void;
  onPlayerDragEnd: (playerId: string, x: number, y: number) => void;
  onAnnotationDragEnd: (annotationId: string, startX: number, startY: number, endX: number, endY: number) => void;
  onAddPlayer: (x: number, y: number, selection: PlayerSelection) => void;
  onAddAnnotation: (type: AnnotationType, startX: number, startY: number, endX: number, endY: number) => void;
  onClearSelection: () => void;
  className?: string;
}

/**
 * PlayboardCanvas is the main canvas component for the Playboard Composer.
 * It handles the Konva Stage, viewport transforms, gesture handling, and drawing.
 */
export function PlayboardCanvas({
  players,
  annotations,
  selectedPlayerId,
  selectedAnnotationId,
  selectedTool,
  selectedTeamSide,
  roster,
  teamName,
  teamColor,
  onSelectPlayer,
  onSelectAnnotation,
  onPlayerDragEnd,
  onAnnotationDragEnd,
  onAddPlayer,
  onAddAnnotation,
  onClearSelection,
  className,
}: PlayboardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);

  const [canvasSize, setCanvasSize] = useState<CanvasSize>({ width: 800, height: 600 });
  const [viewport, setViewport] = useState<ViewportTransform>(DEFAULT_VIEWPORT);

  // Touch gesture state
  const [lastCenter, setLastCenter] = useState<{ x: number; y: number } | null>(null);
  const [lastDist, setLastDist] = useState(0);

  // Drawing state for annotations
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);

  // Player info card state
  const [infoPlayer, setInfoPlayer] = useState<PlayerData | null>(null);
  const [infoPosition, setInfoPosition] = useState<{ x: number; y: number } | null>(null);

  // Player picker popup state
  const [pickerPosition, setPickerPosition] = useState<{ screen: { x: number; y: number }; world: { x: number; y: number } } | null>(null);

  // Update canvas size on resize
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Helper to get world coordinates from pointer position
  const getWorldCoords = useCallback((pointerPos: { x: number; y: number }) => {
    return screenToWorld(pointerPos, viewport, DEFAULT_FIELD_TEMPLATE.dimensions, canvasSize);
  }, [viewport, canvasSize]);

  // Mouse wheel zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const scaleBy = 1.1;
    const direction = e.evt.deltaY > 0 ? -1 : 1;

    setViewport((prev) => {
      const newScale = direction > 0
        ? Math.min(VIEWPORT_LIMITS.maxScale, prev.scale * scaleBy)
        : Math.max(VIEWPORT_LIMITS.minScale, prev.scale / scaleBy);

      const mousePointTo = {
        x: (pointer.x - prev.offsetX) / prev.scale,
        y: (pointer.y - prev.offsetY) / prev.scale,
      };

      return {
        scale: newScale,
        offsetX: pointer.x - mousePointTo.x * newScale,
        offsetY: pointer.y - mousePointTo.y * newScale,
      };
    });
  }, []);

  // Touch handlers for pinch-zoom and pan
  const handleTouchStart = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    const touches = e.evt.touches;

    // For single touch with drawing tool, start drawing
    if (touches.length === 1 && (selectedTool === 'line' || selectedTool === 'arrow' || selectedTool === 'dashedLine' || selectedTool === 'dashedArrow')) {
      const stage = stageRef.current;
      if (!stage) return;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const worldCoords = getWorldCoords(pointer);
      setIsDrawing(true);
      setDrawStart(worldCoords);
      return;
    }

    setLastCenter(null);
    setLastDist(0);
  }, [selectedTool, getWorldCoords]);

  const handleTouchMove = useCallback((e: Konva.KonvaEventObject<TouchEvent>) => {
    e.evt.preventDefault();
    const touches = e.evt.touches;

    // If we're drawing, don't do pan/zoom
    if (isDrawing) {
      return;
    }

    if (touches.length === 2) {
      const touch1 = touches[0];
      const touch2 = touches[1];

      const newCenter = {
        x: (touch1.clientX + touch2.clientX) / 2,
        y: (touch1.clientY + touch2.clientY) / 2,
      };

      const newDist = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );

      if (lastCenter && lastDist) {
        const scale = newDist / lastDist;

        setViewport((prev) => {
          const newScale = Math.min(
            VIEWPORT_LIMITS.maxScale,
            Math.max(VIEWPORT_LIMITS.minScale, prev.scale * scale)
          );

          const scaleRatio = newScale / prev.scale;
          const newOffsetX = newCenter.x - (newCenter.x - prev.offsetX) * scaleRatio;
          const newOffsetY = newCenter.y - (newCenter.y - prev.offsetY) * scaleRatio;

          const dx = newCenter.x - lastCenter.x;
          const dy = newCenter.y - lastCenter.y;

          return {
            scale: newScale,
            offsetX: newOffsetX + dx,
            offsetY: newOffsetY + dy,
          };
        });
      }

      setLastCenter(newCenter);
      setLastDist(newDist);
    } else if (touches.length === 1 && selectedTool === 'select') {
      const touch = touches[0];
      const newCenter = { x: touch.clientX, y: touch.clientY };

      if (lastCenter) {
        const dx = newCenter.x - lastCenter.x;
        const dy = newCenter.y - lastCenter.y;

        setViewport((prev) => ({
          ...prev,
          offsetX: prev.offsetX + dx,
          offsetY: prev.offsetY + dy,
        }));
      }

      setLastCenter(newCenter);
    }
  }, [lastCenter, lastDist, selectedTool, isDrawing]);

  const handleTouchEnd = useCallback(() => {
    // If we were drawing, finish the annotation
    if (isDrawing && drawStart) {
      const stage = stageRef.current;
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const worldCoords = getWorldCoords(pointer);

          // Only add if there's meaningful distance
          const dx = worldCoords.x - drawStart.x;
          const dy = worldCoords.y - drawStart.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance > 1) {  // At least 1 meter
            let annotationType: AnnotationType = 'LINE';
            switch (selectedTool) {
              case 'arrow':
                annotationType = 'ARROW';
                break;
              case 'dashedLine':
                annotationType = 'DASHED_LINE';
                break;
              case 'dashedArrow':
                annotationType = 'DASHED_ARROW';
                break;
            }

            onAddAnnotation(annotationType, drawStart.x, drawStart.y, worldCoords.x, worldCoords.y);
          }
        }
      }
    }

    setIsDrawing(false);
    setDrawStart(null);
    setLastCenter(null);
    setLastDist(0);
  }, [isDrawing, drawStart, selectedTool, getWorldCoords, onAddAnnotation]);

  // Stage click handler for tools
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldCoords = getWorldCoords(pointer);

    // For addPlayer tool, show the picker popup
    if (selectedTool === 'addPlayer') {
      // Check if we clicked on an existing player (by checking if target has a player-like name)
      const targetName = e.target.name?.() || '';
      if (targetName.startsWith('player-')) {
        return; // Don't add a new player when clicking an existing one
      }

      // Get the container position to calculate screen coordinates for the popup
      const containerRect = containerRef.current?.getBoundingClientRect();
      const screenX = containerRect ? pointer.x + containerRect.left : pointer.x;
      const screenY = containerRect ? pointer.y + containerRect.top : pointer.y;

      setPickerPosition({
        screen: { x: screenX, y: screenY },
        world: { x: worldCoords.x, y: worldCoords.y },
      });
      return;
    }

    // For select tool, only clear selection if clicking on stage/field (not on shapes)
    if (selectedTool === 'select') {
      if (e.target === e.target.getStage()) {
        onClearSelection();
      }
      return;
    }
  }, [selectedTool, getWorldCoords, onClearSelection]);

  // Handle player selection from picker
  const handlePickerSelect = useCallback((selection: PlayerSelection) => {
    if (pickerPosition) {
      onAddPlayer(pickerPosition.world.x, pickerPosition.world.y, selection);
    }
    setPickerPosition(null);
  }, [pickerPosition, onAddPlayer]);

  const handlePickerCancel = useCallback(() => {
    setPickerPosition(null);
  }, []);

  // Get set of already-placed player teamMemberIds
  const placedPlayerIds = new Set(
    players
      .filter((p) => p.teamMemberId !== undefined)
      .map((p) => p.teamMemberId as number)
  );

  // Mouse down for drawing annotations
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    if (selectedTool !== 'line' && selectedTool !== 'arrow' && selectedTool !== 'dashedLine' && selectedTool !== 'dashedArrow') {
      return;
    }

    const stage = stageRef.current;
    if (!stage) return;

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const worldCoords = getWorldCoords(pointer);
    setIsDrawing(true);
    setDrawStart(worldCoords);
  }, [selectedTool, getWorldCoords]);

  // Mouse up to finish drawing
  const handleMouseUp = useCallback(() => {
    if (!isDrawing || !drawStart) {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    const stage = stageRef.current;
    if (!stage) {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    const pointer = stage.getPointerPosition();
    if (!pointer) {
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    const worldCoords = getWorldCoords(pointer);

    // Only add if there's meaningful distance
    const dx = worldCoords.x - drawStart.x;
    const dy = worldCoords.y - drawStart.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 1) {  // At least 1 meter
      let annotationType: AnnotationType = 'LINE';
      switch (selectedTool) {
        case 'arrow':
          annotationType = 'ARROW';
          break;
        case 'dashedLine':
          annotationType = 'DASHED_LINE';
          break;
        case 'dashedArrow':
          annotationType = 'DASHED_ARROW';
          break;
      }

      onAddAnnotation(annotationType, drawStart.x, drawStart.y, worldCoords.x, worldCoords.y);
    }

    setIsDrawing(false);
    setDrawStart(null);
  }, [isDrawing, drawStart, selectedTool, getWorldCoords, onAddAnnotation]);

  // Reset viewport
  const resetViewport = useCallback(() => {
    setViewport(DEFAULT_VIEWPORT);
  }, []);

  // Handle player info display
  const handleShowPlayerInfo = useCallback((player: PlayerData, position: { x: number; y: number }) => {
    setInfoPlayer(player);
    setInfoPosition(position);
  }, []);

  const handleClosePlayerInfo = useCallback(() => {
    setInfoPlayer(null);
    setInfoPosition(null);
  }, []);

  // Get stage transform
  const stageTransform = getStageTransform(
    viewport,
    DEFAULT_FIELD_TEMPLATE.dimensions,
    canvasSize
  );

  return (
    <div ref={containerRef} className={`relative w-full h-full ${className ?? ''}`}>
      <Stage
        ref={stageRef}
        width={canvasSize.width}
        height={canvasSize.height}
        scaleX={stageTransform.scaleX}
        scaleY={stageTransform.scaleY}
        x={stageTransform.x}
        y={stageTransform.y}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleStageClick}
        onTap={handleStageClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          <FieldLayer template={DEFAULT_FIELD_TEMPLATE} />
        </Layer>
        <Layer>
          <AnnotationLayer
            annotations={annotations}
            selectedAnnotationId={selectedAnnotationId}
            onSelectAnnotation={onSelectAnnotation}
            onAnnotationDragEnd={onAnnotationDragEnd}
          />
        </Layer>
        <Layer>
          <PlayerLayer
            players={players}
            selectedPlayerId={selectedPlayerId}
            onSelectPlayer={onSelectPlayer}
            onPlayerDragEnd={onPlayerDragEnd}
            onShowPlayerInfo={handleShowPlayerInfo}
          />
        </Layer>
      </Stage>

      {/* Player info card overlay */}
      <PlayerInfoCard
        player={infoPlayer}
        position={infoPosition}
        onClose={handleClosePlayerInfo}
      />

      {/* Player picker popup */}
      {pickerPosition && (
        <PlayerPickerPopup
          position={pickerPosition.screen}
          teamSide={selectedTeamSide}
          roster={roster}
          placedPlayerIds={placedPlayerIds}
          teamName={teamName}
          teamColor={teamColor}
          onSelect={handlePickerSelect}
          onCancel={handlePickerCancel}
        />
      )}

      {/* Zoom controls - desktop only */}
      <div className="hidden md:flex absolute bottom-4 right-4 flex-col gap-2">
        <button
          onClick={() => setViewport((prev) => ({
            ...prev,
            scale: Math.min(VIEWPORT_LIMITS.maxScale, prev.scale * 1.2),
          }))}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-md flex items-center justify-center text-xl font-bold"
        >
          +
        </button>
        <button
          onClick={() => setViewport((prev) => ({
            ...prev,
            scale: Math.max(VIEWPORT_LIMITS.minScale, prev.scale / 1.2),
          }))}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-md flex items-center justify-center text-xl font-bold"
        >
          -
        </button>
        <button
          onClick={resetViewport}
          className="w-10 h-10 bg-white/90 hover:bg-white rounded-lg shadow-md flex items-center justify-center text-sm"
          title="Reset view"
        >
          R
        </button>
      </div>

      {/* Zoom indicator - desktop only */}
      <div className="hidden md:block absolute bottom-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded">
        {Math.round(viewport.scale * 100)}%
      </div>

      {/* Tool indicator - desktop only */}
      <div className="hidden md:block absolute top-4 left-4 px-3 py-1 bg-black/50 text-white text-sm rounded capitalize">
        {selectedTool === 'addPlayer' ? 'Add Player' : selectedTool}
      </div>
    </div>
  );
}
