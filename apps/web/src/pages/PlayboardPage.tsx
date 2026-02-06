import { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlayboardCanvas } from '../components/playboard/PlayboardCanvas';
import { PlayboardToolbar } from '../components/playboard/PlayboardToolbar';
import { PlayboardMobileMenu } from '../components/playboard/PlayboardMobileMenu';
import { RosterPanel } from '../components/playboard/panels/RosterPanel';
import { usePlayboardState } from '../components/playboard/hooks/usePlayboardState';
import { useOfflineSync, type SyncStatus } from '../components/playboard/hooks/useOfflineSync';
import { useAuth } from '../contexts/AuthContext';
import { teamMembersApi, teamsApi, type TeamMember, type Team } from '../lib/api';
import type { AnnotationType } from '../components/playboard/shapes/ArrowShape';
import type { PlayerSelection } from '../components/playboard/panels/PlayerPickerPopup';

/**
 * Status indicator component - shows save state and sync status
 */
function StatusIndicator({
  hasUnsavedChanges,
  syncStatus,
  isOnline
}: {
  hasUnsavedChanges: boolean;
  syncStatus: SyncStatus;
  isOnline: boolean;
}) {
  const getStatusColor = () => {
    if (hasUnsavedChanges) return 'bg-yellow-500';
    if (!isOnline) return 'bg-yellow-500';
    switch (syncStatus) {
      case 'synced': return 'bg-green-500';
      case 'pending': return 'bg-yellow-500';
      case 'syncing': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    if (hasUnsavedChanges) return 'Unsaved';
    if (!isOnline) return 'Offline';
    switch (syncStatus) {
      case 'synced': return 'Saved';
      case 'pending': return 'Syncing...';
      case 'syncing': return 'Syncing...';
      case 'error': return 'Sync Error';
      default: return '';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
      <span className="text-xs text-gray-400">{getStatusText()}</span>
    </div>
  );
}

/**
 * PlayboardPage is the main page wrapper for the Playboard Composer.
 * It provides the full-screen canvas experience for creating and viewing plays.
 */
export function PlayboardPage() {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const { user, activeTeam } = useAuth();

  const [playName, setPlayName] = useState('Untitled Play');
  const [playClientId, setPlayClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [selectedTeamSide, setSelectedTeamSide] = useState<0 | 1>(0);

  // Team roster state
  const [roster, setRoster] = useState<TeamMember[]>([]);
  const [team, setTeam] = useState<Team | null>(null);

  // Track if there are unsaved changes
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  // Track if we're in the process of loading (to skip marking as unsaved)
  // Using a ref so it updates synchronously and is immediately visible
  const isLoadingDataRef = useRef(false);

  const {
    players,
    annotations,
    selectedPlayerId,
    selectedAnnotationId,
    selectedTool,
    canUndo,
    canRedo,
    undo,
    redo,
    addPlayer,
    updatePlayerPosition,
    selectPlayer,
    addAnnotation,
    updateAnnotation,
    selectAnnotation,
    setTool,
    clearSelection,
    deleteSelected,
    loadPlayData,
    resetState,
  } = usePlayboardState();

  const {
    isOnline,
    syncStatus,
    createPlay,
    loadPlay,
    savePlayData,
    savePlayers,
    saveAnnotations,
    syncNow,
    clearAllPlays,
  } = useOfflineSync();

  // Load team roster
  useEffect(() => {
    if (!activeTeam) return;

    // Load team details
    teamsApi.get(activeTeam.teamId).then((response) => {
      if (response.success && response.data) {
        setTeam(response.data);
      }
    });

    // Load roster - only active players (not coaches or other non-player roles)
    teamMembersApi.list(activeTeam.teamId).then((response) => {
      if (response.success && response.data) {
        // Filter to active members who can play (Player role, or no role specified)
        // Exclude known non-player roles like Coach, Manager, Staff
        const nonPlayerRoles = ['coach', 'manager', 'staff', 'trainer', 'assistant'];
        const members = response.data
          .filter((m) => {
            if (!m.isActive) return false;
            const roleName = m.role?.name?.toLowerCase();
            // Include if no role, or role is not in the exclusion list
            return !roleName || !nonPlayerRoles.includes(roleName);
          })
          .sort((a, b) => {
            const numA = a.jerseyNumber ? parseInt(a.jerseyNumber, 10) : 999;
            const numB = b.jerseyNumber ? parseInt(b.jerseyNumber, 10) : 999;
            return numA - numB;
          });
        setRoster(members);
      }
    });
  }, [activeTeam]);

  // Load play if ID is provided
  useEffect(() => {
    if (id) {
      setIsLoading(true);
      isLoadingDataRef.current = true;
      setHasUnsavedChanges(false);
      const playId = parseInt(id, 10);
      if (!isNaN(playId)) {
        loadPlay(playId).then((result) => {
          if (result) {
            setPlayClientId(result.play.clientId);
            setPlayName(result.play.name);
            loadPlayData(result.players, result.annotations);
          }
          setIsLoading(false);
          // Delay clearing the loading flag and explicitly mark as saved
          setTimeout(() => {
            isLoadingDataRef.current = false;
            setHasUnsavedChanges(false);
          }, 50);
        });
      } else {
        // Assume it's a clientId
        loadPlay(id).then((result) => {
          if (result) {
            setPlayClientId(result.play.clientId);
            setPlayName(result.play.name);
            loadPlayData(result.players, result.annotations);
          }
          setIsLoading(false);
          // Delay clearing the loading flag and explicitly mark as saved
          setTimeout(() => {
            isLoadingDataRef.current = false;
            setHasUnsavedChanges(false);
          }, 50);
        });
      }
    } else {
      // New play - no ID, no playClientId yet
      setPlayClientId(null);
      setPlayName('Untitled Play');
      resetState();
      setHasUnsavedChanges(false);
      isLoadingDataRef.current = false;
    }
  }, [id, loadPlay, loadPlayData, resetState]);

  // Track unsaved changes when players or annotations change
  useEffect(() => {
    // Skip if we're loading data (don't mark as unsaved during load)
    if (isLoadingDataRef.current) return;
    // Only mark as unsaved if we have content
    if (players.length > 0 || annotations.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [players, annotations]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Undo/Redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
        return;
      }

      // Escape to clear selection
      if (e.key === 'Escape') {
        clearSelection();
        setTool('select');
        setShowNameInput(false);
        return;
      }

      // Tool shortcuts
      switch (e.key.toLowerCase()) {
        case 'v':
        case 's':
          setTool('select');
          break;
        case 'p':
          setTool('addPlayer');
          break;
        case 'l':
          setTool('line');
          break;
        case 'a':
          setTool('arrow');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, deleteSelected, clearSelection, setTool]);

  const handleAddPlayer = useCallback((x: number, y: number, selection: PlayerSelection) => {
    addPlayer(x, y, selection.teamSide, {
      number: selection.number,
      name: selection.name,
      teamMemberId: selection.teamMemberId,
      teamColor: selection.teamSide === 0 ? team?.primaryColor ?? undefined : undefined,
    });
  }, [addPlayer, team]);

  const handleAddAnnotation = useCallback((
    type: AnnotationType,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    addAnnotation(type, startX, startY, endX, endY);
  }, [addAnnotation]);

  const handleAddPlayerFromRoster = useCallback((member: TeamMember, teamSide: 0 | 1) => {
    // Add player at center of field
    addPlayer(0, 0, teamSide, {
      number: member.jerseyNumber ? parseInt(member.jerseyNumber, 10) : undefined,
      name: member.person?.displayName,
      teamMemberId: member.id > 0 ? member.id : undefined,
      teamColor: teamSide === 0 ? team?.primaryColor ?? undefined : undefined,
    });
  }, [addPlayer, team]);

  const handleSave = useCallback(async () => {
    const playerData = players.map((p) => ({
      id: p.id,
      x: p.x,
      y: p.y,
      number: p.number,
      name: p.name,
      teamSide: p.teamSide,
      teamColor: p.teamColor,
      teamMemberId: p.teamMemberId,
    }));

    if (!playClientId) {
      // Create new play
      const newClientId = await createPlay(playName);
      setPlayClientId(newClientId);

      // Always save players and annotations (even if empty, to handle deletions)
      await savePlayers(newClientId, playerData);
      await saveAnnotations(newClientId, annotations);

      // Update URL to include the new play ID (without full navigation)
      window.history.replaceState(null, '', `/playboard/${newClientId}`);
    } else {
      // Update existing play - always save everything
      await savePlayData(playClientId, { name: playName });
      await savePlayers(playClientId, playerData);
      await saveAnnotations(playClientId, annotations);
    }

    setHasUnsavedChanges(false);

    // Sync immediately if online
    if (isOnline) {
      await syncNow();
    }
  }, [playClientId, playName, players, annotations, createPlay, savePlayData, savePlayers, saveAnnotations, isOnline, syncNow]);

  const handleNewPlay = useCallback(() => {
    // Check for unsaved changes
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Discard and create a new play?');
      if (!confirmed) return;
    }
    // Navigate to /playboard with no ID - the load effect will reset state
    navigate('/playboard');
  }, [hasUnsavedChanges, navigate]);

  // DEBUG: Clear all local play data
  const handleClearAllData = useCallback(async () => {
    const confirmed = window.confirm(
      'DEBUG: This will delete ALL plays from local storage (IndexedDB). Are you sure?'
    );
    if (!confirmed) return;

    await clearAllPlays();
    resetState();
    setPlayClientId(null);
    setPlayName('Untitled Play');
    setHasUnsavedChanges(false);
    navigate('/playboard');
    alert('All local play data cleared!');
  }, [clearAllPlays, resetState, navigate]);

  const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayName(e.target.value);
  }, []);

  const handleNameBlur = useCallback(() => {
    setShowNameInput(false);
    if (playClientId) {
      savePlayData(playClientId, { name: playName });
    }
  }, [playClientId, playName, savePlayData]);

  const handleNameKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Header - hidden on mobile, shown on desktop */}
      <header className="hidden md:flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <a href="/locker-room" className="text-gray-400 hover:text-white">
            ← Back
          </a>
          <h1 className="text-lg font-semibold text-white">Playboard</h1>
          {showNameInput ? (
            <input
              type="text"
              value={playName}
              onChange={handleNameChange}
              onBlur={handleNameBlur}
              onKeyDown={handleNameKeyDown}
              className="px-2 py-1 text-sm bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none"
              autoFocus
            />
          ) : (
            <span
              className="text-sm text-gray-400 cursor-pointer hover:text-white"
              onClick={() => setShowNameInput(true)}
            >
              {playName}
            </span>
          )}
        </div>

        {/* Desktop header controls */}
        <div className="flex items-center gap-4">
          <StatusIndicator hasUnsavedChanges={hasUnsavedChanges} syncStatus={syncStatus} isOnline={isOnline} />
          <span className="text-xs text-gray-500">
            {players.length} players, {annotations.length} annotations
          </span>
          <button
            onClick={handleSave}
            className="px-3 py-1.5 text-sm text-gray-300 hover:text-white hover:bg-gray-700 rounded"
          >
            Save
          </button>
          <button
            onClick={handleNewPlay}
            className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            New Play
          </button>
          <button
            onClick={handleClearAllData}
            className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded"
            title="DEBUG: Clear all local play data"
          >
            Clear DB
          </button>
        </div>
      </header>

      {/* Toolbar - desktop only */}
      <div className="hidden md:block">
        <PlayboardToolbar
          selectedTool={selectedTool}
          onToolChange={setTool}
          selectedTeamSide={selectedTeamSide}
          onTeamSideChange={setSelectedTeamSide}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          className="border-b border-gray-700"
        />
      </div>

      {/* Canvas area - takes full remaining space */}
      <main className="flex-1 overflow-hidden relative">
        <PlayboardCanvas
          players={players}
          annotations={annotations}
          selectedPlayerId={selectedPlayerId}
          selectedAnnotationId={selectedAnnotationId}
          selectedTool={selectedTool}
          selectedTeamSide={selectedTeamSide}
          roster={roster}
          teamName={team?.name || activeTeam?.teamName}
          teamColor={team?.primaryColor ?? undefined}
          onSelectPlayer={selectPlayer}
          onSelectAnnotation={selectAnnotation}
          onPlayerDragEnd={updatePlayerPosition}
          onAnnotationDragEnd={updateAnnotation}
          onAddPlayer={handleAddPlayer}
          onAddAnnotation={handleAddAnnotation}
          onClearSelection={clearSelection}
          className="bg-gray-800"
        />
        {/* Roster panel - desktop only */}
        <div className="hidden md:block">
          <RosterPanel onAddPlayer={handleAddPlayerFromRoster} />
        </div>
      </main>

      {/* Mobile FAB menu */}
      <div className="md:hidden">
        <PlayboardMobileMenu
          selectedTool={selectedTool}
          onToolChange={setTool}
          selectedTeamSide={selectedTeamSide}
          onTeamSideChange={setSelectedTeamSide}
          canUndo={canUndo}
          canRedo={canRedo}
          onUndo={undo}
          onRedo={redo}
          onSave={handleSave}
          onNewPlay={handleNewPlay}
          onBack={() => navigate('/locker-room')}
          onClearData={handleClearAllData}
          hasUnsavedChanges={hasUnsavedChanges}
          playName={playName}
        />
      </div>

      {/* Footer / Status bar - desktop only */}
      <footer className="hidden md:flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700 text-xs text-gray-400">
        <div className="flex gap-4">
          <span>V/S: Select</span>
          <span>P: Add Player</span>
          <span>L: Line</span>
          <span>A: Arrow</span>
          <span>Del: Delete</span>
          <span>Ctrl+S: Save</span>
        </div>
        <span>Scroll/pinch to zoom, drag to pan</span>
      </footer>
    </div>
  );
}
