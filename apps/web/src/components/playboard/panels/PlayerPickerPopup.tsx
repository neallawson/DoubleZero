import { useCallback, useEffect, useRef } from 'react';
import type { TeamMember } from '../../../lib/api';

export interface PlayerSelection {
  teamMemberId?: number;
  number: number;
  name?: string;
  position?: string;
  teamSide: 0 | 1;
}

interface PlayerPickerPopupProps {
  position: { x: number; y: number };
  teamSide: 0 | 1;
  roster: TeamMember[];
  placedPlayerIds: Set<number>;  // teamMemberIds already on field
  teamName?: string;
  teamColor?: string;
  onSelect: (player: PlayerSelection) => void;
  onCancel: () => void;
}

// Default team colors
const TEAM_COLORS = {
  home: '#2563eb',
  away: '#dc2626',
};

/**
 * PlayerPickerPopup shows a compact grid for selecting which player to add.
 * For home team: shows actual roster members
 * For opponent: shows numbered placeholders 1-11
 */
export function PlayerPickerPopup({
  position,
  teamSide,
  roster,
  placedPlayerIds,
  teamName,
  teamColor,
  onSelect,
  onCancel,
}: PlayerPickerPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    // Delay to avoid immediate close from the click that opened the popup
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);

    return () => {
      clearTimeout(timeout);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onCancel]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const handleSelectRosterPlayer = useCallback((member: TeamMember) => {
    onSelect({
      teamMemberId: member.id,
      number: member.jerseyNumber ? parseInt(member.jerseyNumber, 10) : 0,
      name: member.person?.displayName,
      position: member.position?.shortName || member.position?.name,
      teamSide,
    });
  }, [onSelect, teamSide]);

  const handleSelectGenericPlayer = useCallback((number: number) => {
    onSelect({
      number,
      teamSide,
    });
  }, [onSelect, teamSide]);

  const color = teamColor || (teamSide === 0 ? TEAM_COLORS.home : TEAM_COLORS.away);
  const title = teamSide === 0
    ? (teamName || 'Your Team')
    : 'Opponent';

  // For home team with roster, show roster grid
  // For opponent or empty roster, show generic numbered grid
  const showRoster = teamSide === 0 && roster.length > 0;

  // On mobile, center the popup. On desktop, position near click.
  const isMobile = window.innerWidth < 768;

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={onCancel}
        />
      )}
      <div
        ref={popupRef}
        className={`bg-gray-800 rounded-lg shadow-2xl border border-gray-600 overflow-hidden ${
          isMobile
            ? 'fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[90vw] max-w-xs max-h-[80vh]'
            : 'absolute w-72 max-h-96 z-50'
        }`}
        style={isMobile ? undefined : {
          left: Math.min(position.x, window.innerWidth - 320),
          top: Math.min(position.y, window.innerHeight - 400),
        }}
      >
      {/* Header */}
      <div
        className="px-3 py-2 text-white text-sm font-semibold flex items-center gap-2"
        style={{ backgroundColor: color }}
      >
        <span>Select Player - {title}</span>
      </div>

      {/* Player grid */}
      <div className="p-2 max-h-72 overflow-y-auto">
        {showRoster ? (
          // Roster-based selection for home team
          <div className="grid grid-cols-4 gap-1">
            {roster.map((member) => {
              const isPlaced = placedPlayerIds.has(member.id);
              const jerseyNum = member.jerseyNumber || '?';

              return (
                <button
                  key={member.id}
                  onClick={() => handleSelectRosterPlayer(member)}
                  className={`
                    flex flex-col items-center p-1.5 rounded transition-all
                    ${isPlaced
                      ? 'opacity-40 bg-gray-700'
                      : 'bg-gray-700 hover:bg-gray-600 hover:scale-105'
                    }
                  `}
                  title={`${member.person?.displayName || 'Unknown'} - ${member.position?.name || ''}`}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {jerseyNum}
                  </div>
                  <span className="text-[10px] text-gray-300 truncate w-full text-center mt-0.5">
                    {member.person?.displayName?.split(' ')[0] || 'Player'}
                  </span>
                  {member.position?.shortName && (
                    <span className="text-[9px] text-gray-500">
                      {member.position.shortName}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          // Generic numbered selection for opponent (or empty roster)
          <div className="grid grid-cols-4 gap-1">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((num) => (
              <button
                key={num}
                onClick={() => handleSelectGenericPlayer(num)}
                className="flex flex-col items-center p-1.5 rounded bg-gray-700 hover:bg-gray-600 hover:scale-105 transition-all"
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
                  style={{ backgroundColor: color }}
                >
                  {num}
                </div>
                <span className="text-[10px] text-gray-400 mt-0.5">
                  Player {num}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with options */}
      <div className="px-2 py-2 border-t border-gray-700 flex gap-2">
        {showRoster && (
          <button
            onClick={() => handleSelectGenericPlayer(roster.length + 1)}
            className="flex-1 px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
          >
            Generic #
          </button>
        )}
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-300 rounded"
        >
          Cancel
        </button>
      </div>
      </div>
    </>
  );
}
