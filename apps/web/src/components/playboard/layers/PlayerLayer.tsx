import { Group } from 'react-konva';
import { PlayerIcon, type PlayerData } from '../shapes/PlayerIcon';

interface PlayerLayerProps {
  players: PlayerData[];
  selectedPlayerId?: string | null;
  onSelectPlayer?: (playerId: string) => void;
  onPlayerDragEnd?: (playerId: string, x: number, y: number) => void;
  onShowPlayerInfo?: (player: PlayerData, position: { x: number; y: number }) => void;
}

/**
 * PlayerLayer renders all players on the field.
 * Manages player selection and drag events.
 */
export function PlayerLayer({
  players,
  selectedPlayerId,
  onSelectPlayer,
  onPlayerDragEnd,
  onShowPlayerInfo,
}: PlayerLayerProps) {
  return (
    <Group>
      {players.map((player) => (
        <PlayerIcon
          key={player.id}
          player={player}
          isSelected={player.id === selectedPlayerId}
          onSelect={onSelectPlayer}
          onDragEnd={onPlayerDragEnd}
          onShowInfo={onShowPlayerInfo}
        />
      ))}
    </Group>
  );
}
