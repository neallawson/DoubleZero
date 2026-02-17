import { useState, useCallback } from 'react';
import type { ToolType } from './PlayboardToolbar';

interface PlayboardMobileMenuProps {
  selectedTool: ToolType;
  onToolChange: (tool: ToolType) => void;
  selectedTeamSide: 0 | 1;
  onTeamSideChange: (side: 0 | 1) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onNewPlay: () => void;
  onBack: () => void;
  onClearData: () => void;
  hasUnsavedChanges: boolean;
  playName: string;
  onToggleDesktopView?: () => void;
  showDesktopToggle?: boolean;
}

interface ToolOption {
  tool: ToolType;
  icon: string;
  label: string;
}

const TOOLS: ToolOption[] = [
  { tool: 'select', icon: '↖', label: 'Select' },
  { tool: 'addPlayer', icon: '👤', label: 'Player' },
  { tool: 'line', icon: '—', label: 'Line' },
  { tool: 'arrow', icon: '→', label: 'Arrow' },
  { tool: 'dashedLine', icon: '┄', label: 'Dashed' },
  { tool: 'dashedArrow', icon: '⇢', label: 'Dash Arrow' },
];

/**
 * Mobile-optimized floating menu for the Playboard.
 * Shows a FAB that expands into a tool palette.
 */
export function PlayboardMobileMenu({
  selectedTool,
  onToolChange,
  selectedTeamSide,
  onTeamSideChange,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onNewPlay,
  onBack,
  onClearData,
  hasUnsavedChanges,
  playName,
  onToggleDesktopView,
  showDesktopToggle = false,
}: PlayboardMobileMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleToolSelect = useCallback((tool: ToolType) => {
    onToolChange(tool);
    // Keep menu open for addPlayer to allow team selection
    if (tool !== 'addPlayer') {
      setIsOpen(false);
    }
  }, [onToolChange]);

  const handleTeamSelect = useCallback((side: 0 | 1) => {
    onTeamSideChange(side);
    setIsOpen(false);
  }, [onTeamSideChange]);

  const currentTool = TOOLS.find(t => t.tool === selectedTool);

  return (
    <>
      {/* Backdrop when menu is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB and expanded menu */}
      <div className="fixed bottom-4 right-4 z-50">
        {/* Expanded menu - centered on screen, works in both orientations */}
        {isOpen && (
          <div className="fixed inset-4 flex items-center justify-center pointer-events-none">
            <div className="bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-3 pointer-events-auto max-h-full overflow-y-auto">
              {/* Header with play name and navigation */}
              <div className="flex items-center justify-between gap-4 mb-2 pb-2 border-b border-gray-700">
                <button
                  onClick={() => { onBack(); setIsOpen(false); }}
                  className="px-3 py-1.5 text-sm bg-gray-700 text-gray-300 rounded-lg active:bg-gray-600"
                >
                  ← Back
                </button>
                <span className={`text-sm font-medium truncate flex-1 text-center ${hasUnsavedChanges ? 'text-yellow-400' : 'text-green-400'}`}>
                  {playName}{hasUnsavedChanges && ' (unsaved)'}
                </span>
                <button
                  onClick={() => { onNewPlay(); setIsOpen(false); }}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg active:bg-blue-700"
                >
                  + New
                </button>
              </div>

              {/* DEBUG section and Desktop toggle */}
              <div className="mb-3 pb-2 border-b border-gray-700 flex gap-2">
                <button
                  onClick={() => { onClearData(); setIsOpen(false); }}
                  className="flex-1 py-1.5 text-xs bg-red-600 text-white rounded-lg active:bg-red-700"
                >
                  🗑 Clear DB
                </button>
                {showDesktopToggle && onToggleDesktopView && (
                  <button
                    onClick={() => { onToggleDesktopView(); setIsOpen(false); }}
                    className="flex-1 py-1.5 text-xs bg-slate-600 text-white rounded-lg active:bg-slate-700"
                  >
                    Exit Full Screen
                  </button>
                )}
              </div>

              {/* Landscape: horizontal layout, Portrait: vertical layout */}
              <div className="mobile-menu-container flex flex-col gap-3">
                {/* Tools grid - 3x2 in portrait, 6x1 in landscape */}
                <div className="mobile-menu-tools grid grid-cols-3 gap-3">
                  {TOOLS.map(({ tool, icon, label }) => (
                    <button
                      key={tool}
                      onClick={() => handleToolSelect(tool)}
                      className={`
                        flex flex-col items-center p-2 rounded-lg transition-colors min-w-[56px]
                        ${selectedTool === tool
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                        }
                      `}
                    >
                      <span className="text-xl">{icon}</span>
                      <span className="text-[10px] mt-0.5">{label}</span>
                    </button>
                  ))}
                </div>

                {/* Right side controls in landscape, bottom in portrait */}
                <div className="mobile-menu-controls flex flex-col gap-2 border-t border-gray-700 pt-2">
                  {/* Team selector - shown when Player tool is selected */}
                  {selectedTool === 'addPlayer' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTeamSelect(0)}
                        className={`
                          flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${selectedTeamSide === 0
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                          }
                        `}
                      >
                        Home
                      </button>
                      <button
                        onClick={() => handleTeamSelect(1)}
                        className={`
                          flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors
                          ${selectedTeamSide === 1
                            ? 'bg-red-600 text-white'
                            : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                          }
                        `}
                      >
                        Opponent
                      </button>
                    </div>
                  )}

                  {/* Actions row */}
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1">
                      <button
                        onClick={() => { onUndo(); }}
                        disabled={!canUndo}
                        className={`
                          py-1.5 px-3 rounded-lg text-lg
                          ${canUndo
                            ? 'bg-gray-700 text-gray-300 active:bg-gray-600'
                            : 'bg-gray-800 text-gray-600'
                          }
                        `}
                      >
                        ↩
                      </button>
                      <button
                        onClick={() => { onRedo(); }}
                        disabled={!canRedo}
                        className={`
                          py-1.5 px-3 rounded-lg text-lg
                          ${canRedo
                            ? 'bg-gray-700 text-gray-300 active:bg-gray-600'
                            : 'bg-gray-800 text-gray-600'
                          }
                        `}
                      >
                        ↪
                      </button>
                    </div>
                    <button
                      onClick={() => { onSave(); setIsOpen(false); }}
                      className={`
                        flex-1 py-2 px-3 rounded-lg text-sm font-medium whitespace-nowrap
                        ${hasUnsavedChanges
                          ? 'bg-green-600 text-white active:bg-green-700'
                          : 'bg-gray-700 text-gray-300 active:bg-gray-600'
                        }
                      `}
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* FAB button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-14 h-14 rounded-full shadow-lg flex items-center justify-center
            transition-all duration-200
            ${isOpen
              ? 'bg-gray-600 rotate-45'
              : 'bg-blue-600 active:bg-blue-700'
            }
          `}
        >
          {isOpen ? (
            <span className="text-white text-2xl">+</span>
          ) : (
            <span className="text-white text-xl">{currentTool?.icon || '☰'}</span>
          )}
        </button>

        {/* Unsaved indicator dot */}
        {hasUnsavedChanges && !isOpen && (
          <div className="absolute top-0 right-0 w-3 h-3 bg-yellow-500 rounded-full border-2 border-gray-900" />
        )}
      </div>
    </>
  );
}
