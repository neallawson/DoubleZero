import { useRef, useState, useCallback } from 'react';
import { Group, Circle, Text, Rect } from 'react-konva';
import type Konva from 'konva';

export interface PlayerData {
  id: string;
  x: number;  // world coordinates (meters)
  y: number;  // world coordinates (meters)
  number: number;
  name?: string;
  position?: string;
  teamSide: 0 | 1;  // 0 = home/own team, 1 = opponent
  teamColor?: string;
  teamMemberId?: number;  // Link to team_member for roster integration
}

interface PlayerIconProps {
  player: PlayerData;
  radius?: number;
  textRotation?: number;
  isSelected?: boolean;
  onSelect?: (playerId: string) => void;
  onDragEnd?: (playerId: string, x: number, y: number) => void;
  onShowInfo?: (player: PlayerData, position: { x: number; y: number }) => void;
}

// Default colors
const TEAM_COLORS = {
  home: '#2563eb',      // Blue
  away: '#dc2626',      // Red
  homeLight: '#3b82f6',
  awayLight: '#ef4444',
};

const PLAYER_RADIUS = 1.5;  // meters

/**
 * PlayerIcon renders a draggable player on the field.
 * Shows team-colored circle with player number.
 * Long press shows player info card.
 */
export function PlayerIcon({
  player,
  radius = PLAYER_RADIUS,
  textRotation = 0,
  isSelected = false,
  onSelect,
  onDragEnd,
  onShowInfo,
}: PlayerIconProps) {
  const groupRef = useRef<Konva.Group>(null);
  const [isDragging, setIsDragging] = useState(false);
  const longPressTimeoutRef = useRef<number | null>(null);

  const teamColor = player.teamColor ?? (player.teamSide === 0 ? TEAM_COLORS.home : TEAM_COLORS.away);
  const teamColorLight = player.teamSide === 0 ? TEAM_COLORS.homeLight : TEAM_COLORS.awayLight;

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    // Clear any pending long press
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    setIsDragging(false);
    if (onDragEnd) {
      const node = e.target;
      onDragEnd(player.id, node.x(), node.y());
    }
  }, [onDragEnd, player.id]);

  const handleClick = useCallback(() => {
    if (onSelect) {
      onSelect(player.id);
    }
  }, [onSelect, player.id]);

  const handleMouseDown = useCallback(() => {
    // Start long press timer
    longPressTimeoutRef.current = window.setTimeout(() => {
      if (onShowInfo && groupRef.current) {
        const stage = groupRef.current.getStage();
        if (stage) {
          const pos = groupRef.current.getAbsolutePosition();
          onShowInfo(player, { x: pos.x, y: pos.y });
        }
      }
    }, 500);  // 500ms for long press
  }, [onShowInfo, player]);

  const handleMouseUp = useCallback(() => {
    if (longPressTimeoutRef.current) {
      clearTimeout(longPressTimeoutRef.current);
      longPressTimeoutRef.current = null;
    }
  }, []);

  const handleTouchStart = useCallback(() => {
    handleMouseDown();
  }, [handleMouseDown]);

  const handleTouchEnd = useCallback(() => {
    handleMouseUp();
  }, [handleMouseUp]);

  // Format number for display
  const displayNumber = player.number.toString();
  const fontSize = displayNumber.length > 1 ? 1.4 : 1.8;

  return (
    <Group
      ref={groupRef}
      x={player.x}
      y={player.y}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={handleClick}
      onTap={handleClick}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Selection ring */}
      {isSelected && (
        <Circle
          x={0}
          y={0}
          radius={radius + 0.4}
          stroke="#ffffff"
          strokeWidth={0.2}
          dash={[0.3, 0.2]}
        />
      )}

      {/* Shadow when dragging */}
      {isDragging && (
        <Circle
          x={0.15}
          y={0.15}
          radius={radius}
          fill="rgba(0,0,0,0.3)"
        />
      )}

      {/* Player circle */}
      <Circle
        x={0}
        y={0}
        radius={radius}
        fill={teamColor}
        stroke={isDragging ? '#ffffff' : teamColorLight}
        strokeWidth={isDragging ? 0.2 : 0.15}
      />

      {/* Player number - counter-rotated in portrait to stay upright */}
      <Text
        x={textRotation ? 0 : -radius}
        y={textRotation ? 0 : -fontSize / 2}
        width={radius * 2}
        height={fontSize}
        text={displayNumber}
        fontSize={fontSize}
        fontStyle="bold"
        fill="#ffffff"
        align="center"
        verticalAlign="middle"
        rotation={textRotation}
        offsetX={textRotation ? radius : 0}
        offsetY={textRotation ? fontSize / 2 : 0}
      />
    </Group>
  );
}

/**
 * PlayerInfoCard shows player details on long press.
 * Rendered as an overlay outside the canvas.
 */
interface PlayerInfoCardProps {
  player: PlayerData | null;
  position: { x: number; y: number } | null;
  onClose: () => void;
}

export function PlayerInfoCard({ player, position, onClose }: PlayerInfoCardProps) {
  if (!player || !position) return null;

  return (
    <div
      className="absolute z-50 bg-white rounded-lg shadow-xl p-3 min-w-[150px]"
      style={{
        left: position.x + 20,
        top: position.y - 20,
      }}
      onClick={onClose}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ backgroundColor: player.teamColor ?? (player.teamSide === 0 ? TEAM_COLORS.home : TEAM_COLORS.away) }}
        >
          {player.number}
        </div>
        <div>
          <div className="font-semibold">{player.name || `Player ${player.number}`}</div>
          {player.position && (
            <div className="text-sm text-gray-500">{player.position}</div>
          )}
        </div>
      </div>
    </div>
  );
}
