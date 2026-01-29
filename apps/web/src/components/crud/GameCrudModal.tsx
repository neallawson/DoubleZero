import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { gamesApi, teamsApi, locationsApi, leaguesApi, type Game, type Team, type Location, type League, type Season } from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface GameCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onBack: () => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export function GameCrudModal({ open, onOpenChange, onClose, onBack }: GameCrudModalProps) {
  const [games, setGames] = useState<Game[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [leagues, setLeagues] = useState<League[]>([]);
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    leagueId: '',
    seasonId: '',
    homeTeamId: '',
    awayTeamId: '',
    locationId: '',
    date: '',
    startTime: '',
    homeScore: '',
    awayScore: '',
    notes: '',
  });

  useEffect(() => {
    if (open) {
      loadGames();
      loadTeams();
      loadLocations();
      loadLeagues();
    }
  }, [open]);

  // Load seasons when league changes
  useEffect(() => {
    if (formData.leagueId) {
      loadSeasons(parseInt(formData.leagueId, 10));
    } else {
      setSeasons([]);
    }
  }, [formData.leagueId]);

  async function loadGames() {
    setIsLoading(true);
    setError('');
    const response = await gamesApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setGames(response.data);
    } else {
      setError(response.error?.message || 'Failed to load games');
    }
  }

  async function loadTeams() {
    const response = await teamsApi.list();
    if (response.success && response.data) {
      setTeams(response.data);
    }
  }

  async function loadLocations() {
    const response = await locationsApi.list();
    if (response.success && response.data) {
      setLocations(response.data);
    }
  }

  async function loadLeagues() {
    const response = await leaguesApi.list();
    if (response.success && response.data) {
      setLeagues(response.data);
    }
  }

  async function loadSeasons(leagueId: number) {
    const response = await leaguesApi.listSeasons(leagueId);
    if (response.success && response.data) {
      setSeasons(response.data);
    }
  }

  function getTeamName(teamId: number | null) {
    if (!teamId) return '—';
    const team = teams.find(t => t.id === teamId);
    return team?.name || `Team #${teamId}`;
  }

  function getLocationName(locationId: number | null) {
    if (!locationId) return '—';
    const location = locations.find(l => l.id === locationId);
    return location?.name || `Location #${locationId}`;
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  }

  function formatTime(timeStr: string | null) {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
  }

  function handleSelectGame(game: Game) {
    setSelectedGame(game);
    setViewMode('view');
  }

  function handleCreate() {
    setFormData({
      leagueId: leagues[0]?.id.toString() || '',
      seasonId: '',
      homeTeamId: '',
      awayTeamId: '',
      locationId: '',
      date: '',
      startTime: '',
      homeScore: '',
      awayScore: '',
      notes: '',
    });
    setSelectedGame(null);
    setViewMode('create');
  }

  function handleEdit() {
    if (selectedGame) {
      // Find the league for this season
      const season = seasons.find(s => s.id === selectedGame.seasonId);
      const leagueId = season ? leagues.find(l => l.id === season.leagueId)?.id.toString() || '' : '';
      
      setFormData({
        leagueId,
        seasonId: selectedGame.seasonId.toString(),
        homeTeamId: selectedGame.homeTeamId.toString(),
        awayTeamId: selectedGame.awayTeamId.toString(),
        locationId: selectedGame.locationId?.toString() || '',
        date: selectedGame.date?.split('T')[0] || '',
        startTime: formatTime(selectedGame.startTime),
        homeScore: selectedGame.homeScore?.toString() || '',
        awayScore: selectedGame.awayScore?.toString() || '',
        notes: selectedGame.notes || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedGame(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError('');

    const payload = {
      seasonId: parseInt(formData.seasonId, 10),
      homeTeamId: parseInt(formData.homeTeamId, 10),
      awayTeamId: parseInt(formData.awayTeamId, 10),
      locationId: formData.locationId ? parseInt(formData.locationId, 10) : null,
      date: formData.date || null,
      startTime: formData.startTime || null,
      homeScore: formData.homeScore ? parseInt(formData.homeScore, 10) : null,
      awayScore: formData.awayScore ? parseInt(formData.awayScore, 10) : null,
      notes: formData.notes || null,
    };

    if (viewMode === 'create') {
      const response = await gamesApi.create(payload);
      setIsLoading(false);
      if (response.success && response.data) {
        setGames([...games, response.data]);
        setSelectedGame(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create game');
      }
    } else if (viewMode === 'edit' && selectedGame) {
      const response = await gamesApi.update(selectedGame.id, {
        ...payload,
        version: selectedGame.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setGames(games.map(g => g.id === response.data!.id ? response.data! : g));
        setSelectedGame(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update game');
      }
    }
  }

  async function handleDelete() {
    if (!selectedGame) return;
    
    if (!confirm('Delete this game?')) return;

    setIsLoading(true);
    setError('');
    const response = await gamesApi.delete(selectedGame.id);
    setIsLoading(false);
    if (response.success) {
      setGames(games.filter(g => g.id !== selectedGame.id));
      setSelectedGame(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete game');
    }
  }

  function renderList() {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Games</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {games.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No games found</p>
          ) : (
            <div className="space-y-1">
              {games.map((game) => (
                <button
                  key={game.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => handleSelectGame(game)}
                >
                  <div className="font-medium">
                    {getTeamName(game.homeTeamId)} vs {getTeamName(game.awayTeamId)}
                  </div>
                  <div className="text-sm text-muted-foreground flex gap-2">
                    <span>{formatDate(game.date)}</span>
                    {game.homeScore !== null && game.awayScore !== null && (
                      <span className="font-medium">
                        ({game.homeScore} - {game.awayScore})
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderView() {
    if (!selectedGame) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Game Details</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="text-center py-2">
            <div className="text-lg font-medium">
              {getTeamName(selectedGame.homeTeamId)} vs {getTeamName(selectedGame.awayTeamId)}
            </div>
            {selectedGame.homeScore !== null && selectedGame.awayScore !== null && (
              <div className="text-2xl font-bold">
                {selectedGame.homeScore} - {selectedGame.awayScore}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Date</Label>
              <p>{formatDate(selectedGame.date)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Time</Label>
              <p>{formatTime(selectedGame.startTime) || '—'}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Location</Label>
            <p>{getLocationName(selectedGame.locationId)}</p>
          </div>
          {selectedGame.notes && (
            <div>
              <Label className="text-muted-foreground">Notes</Label>
              <p>{selectedGame.notes}</p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          <Button variant="outline" onClick={handleEdit}>
            <Pencil className="h-4 w-4 mr-1" />
            Edit
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderForm() {
    const isCreate = viewMode === 'create';
    const isValid = formData.seasonId && formData.homeTeamId && formData.awayTeamId && formData.homeTeamId !== formData.awayTeamId;
    
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isCreate ? 'New Game' : 'Edit Game'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="leagueId">League *</Label>
              <select
                id="leagueId"
                value={formData.leagueId}
                onChange={(e) => setFormData({ ...formData, leagueId: e.target.value, seasonId: '' })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select league</option>
                {leagues.map((league) => (
                  <option key={league.id} value={league.id}>
                    {league.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="seasonId">Season *</Label>
              <select
                id="seasonId"
                value={formData.seasonId}
                onChange={(e) => setFormData({ ...formData, seasonId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
                disabled={!formData.leagueId}
              >
                <option value="">Select season</option>
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeTeamId">Home Team *</Label>
              <select
                id="homeTeamId"
                value={formData.homeTeamId}
                onChange={(e) => setFormData({ ...formData, homeTeamId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayTeamId">Away Team *</Label>
              <select
                id="awayTeamId"
                value={formData.awayTeamId}
                onChange={(e) => setFormData({ ...formData, awayTeamId: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">Select team</option>
                {teams.map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationId">Location</Label>
            <select
              id="locationId"
              value={formData.locationId}
              onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="">No location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="homeScore">Home Score</Label>
              <Input
                id="homeScore"
                type="number"
                min="0"
                value={formData.homeScore}
                onChange={(e) => setFormData({ ...formData, homeScore: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="awayScore">Away Score</Label>
              <Input
                id="awayScore"
                type="number"
                min="0"
                value={formData.awayScore}
                onChange={(e) => setFormData({ ...formData, awayScore: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Optional notes"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isValid || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        {isLoading && viewMode === 'list' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'list' ? (
          renderList()
        ) : viewMode === 'view' ? (
          renderView()
        ) : (
          renderForm()
        )}
      </DialogContent>
    </Dialog>
  );
}
