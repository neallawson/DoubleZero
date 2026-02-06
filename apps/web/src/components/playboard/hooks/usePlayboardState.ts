import { useState, useCallback, useReducer } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PlayerData } from '../shapes/PlayerIcon';
import type { AnnotationData, AnnotationType } from '../shapes/ArrowShape';
import type { ToolType } from '../PlayboardToolbar';

// State types
interface PlayboardState {
  players: PlayerData[];
  annotations: AnnotationData[];
  selectedPlayerId: string | null;
  selectedAnnotationId: string | null;
  selectedTool: ToolType;
}

// Action types
type PlayboardAction =
  | { type: 'ADD_PLAYER'; player: PlayerData }
  | { type: 'UPDATE_PLAYER'; playerId: string; x: number; y: number }
  | { type: 'REMOVE_PLAYER'; playerId: string }
  | { type: 'SELECT_PLAYER'; playerId: string | null }
  | { type: 'ADD_ANNOTATION'; annotation: AnnotationData }
  | { type: 'UPDATE_ANNOTATION'; annotationId: string; startX: number; startY: number; endX: number; endY: number }
  | { type: 'REMOVE_ANNOTATION'; annotationId: string }
  | { type: 'SELECT_ANNOTATION'; annotationId: string | null }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'LOAD_STATE'; state: Partial<PlayboardState> };

// Initial state
const initialState: PlayboardState = {
  players: [],
  annotations: [],
  selectedPlayerId: null,
  selectedAnnotationId: null,
  selectedTool: 'select',
};

// Reducer
function playboardReducer(state: PlayboardState, action: PlayboardAction): PlayboardState {
  switch (action.type) {
    case 'ADD_PLAYER':
      return { ...state, players: [...state.players, action.player] };

    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.playerId ? { ...p, x: action.x, y: action.y } : p
        ),
      };

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
        selectedPlayerId: state.selectedPlayerId === action.playerId ? null : state.selectedPlayerId,
      };

    case 'SELECT_PLAYER':
      return {
        ...state,
        selectedPlayerId: action.playerId,
        selectedAnnotationId: action.playerId ? null : state.selectedAnnotationId,
      };

    case 'ADD_ANNOTATION':
      return { ...state, annotations: [...state.annotations, action.annotation] };

    case 'UPDATE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.map((a) =>
          a.id === action.annotationId
            ? { ...a, startX: action.startX, startY: action.startY, endX: action.endX, endY: action.endY }
            : a
        ),
      };

    case 'REMOVE_ANNOTATION':
      return {
        ...state,
        annotations: state.annotations.filter((a) => a.id !== action.annotationId),
        selectedAnnotationId: state.selectedAnnotationId === action.annotationId ? null : state.selectedAnnotationId,
      };

    case 'SELECT_ANNOTATION':
      return {
        ...state,
        selectedAnnotationId: action.annotationId,
        selectedPlayerId: action.annotationId ? null : state.selectedPlayerId,
      };

    case 'SET_TOOL':
      return { ...state, selectedTool: action.tool };

    case 'CLEAR_SELECTION':
      return { ...state, selectedPlayerId: null, selectedAnnotationId: null };

    case 'LOAD_STATE':
      return { ...state, ...action.state };

    default:
      return state;
  }
}

// Undo/Redo history
interface HistoryState {
  past: PlayboardState[];
  future: PlayboardState[];
}

/**
 * usePlayboardState manages the complete state of the playboard editor.
 * Includes players, annotations, selection, tool state, and undo/redo.
 */
export function usePlayboardState() {
  const [state, dispatch] = useReducer(playboardReducer, initialState);
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] });

  // Save state to history before making changes
  const saveToHistory = useCallback(() => {
    setHistory((prev) => ({
      past: [...prev.past.slice(-49), state],  // Keep last 50 states
      future: [],  // Clear redo stack on new action
    }));
  }, [state]);

  // Undo
  const undo = useCallback(() => {
    setHistory((prev) => {
      if (prev.past.length === 0) return prev;

      const previous = prev.past[prev.past.length - 1];
      dispatch({ type: 'LOAD_STATE', state: previous });

      return {
        past: prev.past.slice(0, -1),
        future: [state, ...prev.future],
      };
    });
  }, [state]);

  // Redo
  const redo = useCallback(() => {
    setHistory((prev) => {
      if (prev.future.length === 0) return prev;

      const next = prev.future[0];
      dispatch({ type: 'LOAD_STATE', state: next });

      return {
        past: [...prev.past, state],
        future: prev.future.slice(1),
      };
    });
  }, [state]);

  // Player actions
  const addPlayer = useCallback((
    x: number,
    y: number,
    teamSide: 0 | 1 = 0,
    options?: {
      number?: number;
      name?: string;
      teamMemberId?: number;
      teamColor?: string;
    }
  ) => {
    saveToHistory();
    const player: PlayerData = {
      id: uuidv4(),
      x,
      y,
      number: options?.number ?? state.players.filter((p) => p.teamSide === teamSide).length + 1,
      name: options?.name,
      teamSide,
      teamMemberId: options?.teamMemberId,
      teamColor: options?.teamColor,
    };
    dispatch({ type: 'ADD_PLAYER', player });
    return player.id;
  }, [state.players, saveToHistory]);

  const updatePlayerPosition = useCallback((playerId: string, x: number, y: number) => {
    saveToHistory();
    dispatch({ type: 'UPDATE_PLAYER', playerId, x, y });
  }, [saveToHistory]);

  const removePlayer = useCallback((playerId: string) => {
    saveToHistory();
    dispatch({ type: 'REMOVE_PLAYER', playerId });
  }, [saveToHistory]);

  const selectPlayer = useCallback((playerId: string | null) => {
    dispatch({ type: 'SELECT_PLAYER', playerId });
  }, []);

  // Annotation actions
  const addAnnotation = useCallback((
    annotationType: AnnotationType,
    startX: number,
    startY: number,
    endX: number,
    endY: number,
    color: string = '#ffffff',
    strokeWidth: number = 0.2
  ) => {
    saveToHistory();
    const annotation: AnnotationData = {
      id: uuidv4(),
      annotationType,
      startX,
      startY,
      endX,
      endY,
      color,
      strokeWidth,
    };
    dispatch({ type: 'ADD_ANNOTATION', annotation });
    return annotation.id;
  }, [saveToHistory]);

  const updateAnnotation = useCallback((
    annotationId: string,
    startX: number,
    startY: number,
    endX: number,
    endY: number
  ) => {
    saveToHistory();
    dispatch({ type: 'UPDATE_ANNOTATION', annotationId, startX, startY, endX, endY });
  }, [saveToHistory]);

  const removeAnnotation = useCallback((annotationId: string) => {
    saveToHistory();
    dispatch({ type: 'REMOVE_ANNOTATION', annotationId });
  }, [saveToHistory]);

  const selectAnnotation = useCallback((annotationId: string | null) => {
    dispatch({ type: 'SELECT_ANNOTATION', annotationId });
  }, []);

  // Tool selection
  const setTool = useCallback((tool: ToolType) => {
    dispatch({ type: 'SET_TOOL', tool });
  }, []);

  // Clear selection
  const clearSelection = useCallback(() => {
    dispatch({ type: 'CLEAR_SELECTION' });
  }, []);

  // Delete selected item
  const deleteSelected = useCallback(() => {
    if (state.selectedPlayerId) {
      removePlayer(state.selectedPlayerId);
    } else if (state.selectedAnnotationId) {
      removeAnnotation(state.selectedAnnotationId);
    }
  }, [state.selectedPlayerId, state.selectedAnnotationId, removePlayer, removeAnnotation]);

  // Reset state to initial (clear all players and annotations)
  const resetState = useCallback(() => {
    dispatch({ type: 'LOAD_STATE', state: { players: [], annotations: [] } });
    setHistory({ past: [], future: [] });
  }, []);

  // Load play data (players and annotations) from storage format
  const loadPlayData = useCallback((
    storedPlayers: Array<{
      localId: string;
      xMeters: number;
      yMeters: number;
      displayNumber: number | null;
      displayName: string | null;
      teamMemberId: number | null;
      teamColorOverride: string | null;
      teamSide: number;
    }>,
    storedAnnotations: Array<{
      localId: string;
      annotationType: 'LINE' | 'ARROW' | 'DASHED_LINE' | 'DASHED_ARROW';
      startX: number;
      startY: number;
      endX: number;
      endY: number;
      color: string;
      strokeWidth: number;
    }>
  ) => {
    // Convert stored format to PlayerData format
    const players: PlayerData[] = storedPlayers.map((p) => ({
      id: p.localId,
      x: p.xMeters,
      y: p.yMeters,
      number: p.displayNumber ?? 0,
      name: p.displayName ?? undefined,
      teamSide: (p.teamSide === 0 || p.teamSide === 1 ? p.teamSide : 0) as 0 | 1,
      teamMemberId: p.teamMemberId ?? undefined,
      teamColor: p.teamColorOverride ?? undefined,
    }));

    // Convert stored format to AnnotationData format
    const annotations: AnnotationData[] = storedAnnotations.map((a) => ({
      id: a.localId,
      annotationType: a.annotationType,
      startX: a.startX,
      startY: a.startY,
      endX: a.endX,
      endY: a.endY,
      color: a.color,
      strokeWidth: a.strokeWidth,
    }));

    // Load into state
    dispatch({ type: 'LOAD_STATE', state: { players, annotations } });

    // Clear history since we're loading fresh data
    setHistory({ past: [], future: [] });
  }, []);

  return {
    // State
    players: state.players,
    annotations: state.annotations,
    selectedPlayerId: state.selectedPlayerId,
    selectedAnnotationId: state.selectedAnnotationId,
    selectedTool: state.selectedTool,

    // History
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,

    // Player actions
    addPlayer,
    updatePlayerPosition,
    removePlayer,
    selectPlayer,

    // Annotation actions
    addAnnotation,
    updateAnnotation,
    removeAnnotation,
    selectAnnotation,

    // Tool and selection
    setTool,
    clearSelection,
    deleteSelected,

    // Load and reset
    loadPlayData,
    resetState,
  };
}
