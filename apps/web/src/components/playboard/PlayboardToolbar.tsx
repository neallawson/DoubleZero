import { useCallback } from 'react';

export type ToolType = 'select' | 'addPlayer' | 'line' | 'arrow' | 'dashedLine' | 'dashedArrow';

interface PlayboardToolbarProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  selectedTeamSide: 0 | 1;
  onTeamSideChange: (side: 0 | 1) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  className?: string;
}

interface ToolButtonProps {
  icon: string;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function ToolButton({ icon, label, isActive, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center justify-center p-2 rounded-lg min-w-[48px]
        transition-colors
        ${isActive
          ? 'bg-blue-600 text-white'
          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
        }
      `}
      title={label}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs mt-0.5 hidden md:block">{label}</span>
    </button>
  );
}

/**
 * PlayboardToolbar provides tool selection and undo/redo controls.
 * Responsive: shows labels on desktop, icons only on mobile.
 */
export function PlayboardToolbar({
  selectedTool,
  onToolChange,
  selectedTeamSide,
  onTeamSideChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  className,
}: PlayboardToolbarProps) {
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle keyboard shortcuts
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
      e.preventDefault();
      if (e.shiftKey) {
        onRedo();
      } else {
        onUndo();
      }
    }
  }, [onUndo, onRedo]);

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 bg-gray-800 ${className ?? ''}`}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Tool selection */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon="↖"
          label="Select"
          isActive={selectedTool === 'select'}
          onClick={() => onToolChange('select')}
        />
        <ToolButton
          icon="👤"
          label="Player"
          isActive={selectedTool === 'addPlayer'}
          onClick={() => onToolChange('addPlayer')}
        />
      </div>

      {/* Team selector - shown when addPlayer tool is active */}
      {selectedTool === 'addPlayer' && (
        <>
          <div className="w-px h-8 bg-gray-600" />
          <div className="flex items-center gap-1">
            <button
              onClick={() => onTeamSideChange(0)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${selectedTeamSide === 0
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
              title="Add home team players (blue)"
            >
              Home
            </button>
            <button
              onClick={() => onTeamSideChange(1)}
              className={`
                px-3 py-2 rounded-lg text-sm font-medium transition-colors
                ${selectedTeamSide === 1
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
              `}
              title="Add opponent players (red)"
            >
              Opponent
            </button>
          </div>
        </>
      )}

      <div className="w-px h-8 bg-gray-600" />

      {/* Annotation tools */}
      <div className="flex items-center gap-1">
        <ToolButton
          icon="—"
          label="Line"
          isActive={selectedTool === 'line'}
          onClick={() => onToolChange('line')}
        />
        <ToolButton
          icon="→"
          label="Arrow"
          isActive={selectedTool === 'arrow'}
          onClick={() => onToolChange('arrow')}
        />
        <ToolButton
          icon="┄"
          label="Dash"
          isActive={selectedTool === 'dashedLine'}
          onClick={() => onToolChange('dashedLine')}
        />
        <ToolButton
          icon="⇢"
          label="DashArr"
          isActive={selectedTool === 'dashedArrow'}
          onClick={() => onToolChange('dashedArrow')}
        />
      </div>

      <div className="flex-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1">
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`
            p-2 rounded-lg text-lg
            ${canUndo
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }
          `}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`
            p-2 rounded-lg text-lg
            ${canRedo
              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }
          `}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
      </div>
    </div>
  );
}
