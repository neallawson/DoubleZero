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
import { leaguesApi, type Season, type League } from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2, Star } from 'lucide-react';

interface SeasonCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  league: League;
  onLeagueUpdated: (league: League) => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export function SeasonCrudModal({ open, onOpenChange, league, onLeagueUpdated }: SeasonCrudModalProps) {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    if (open) {
      loadSeasons();
    }
  }, [open, league.id]);

  async function loadSeasons() {
    setIsLoading(true);
    setError('');
    const response = await leaguesApi.listSeasons(league.id);
    setIsLoading(false);
    if (response.success && response.data) {
      setSeasons(response.data);
    } else {
      setError(response.error?.message || 'Failed to load seasons');
    }
  }

  function handleSelectSeason(season: Season) {
    setSelectedSeason(season);
    setViewMode('view');
  }

  function handleCreate() {
    setFormData({ name: '', startDate: '', endDate: '' });
    setSelectedSeason(null);
    setViewMode('create');
  }

  function handleEdit() {
    if (selectedSeason) {
      setFormData({
        name: selectedSeason.name,
        startDate: selectedSeason.startDate?.split('T')[0] || '',
        endDate: selectedSeason.endDate?.split('T')[0] || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedSeason(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError('');

    const payload = {
      name: formData.name,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
    };

    if (viewMode === 'create') {
      const response = await leaguesApi.createSeason(league.id, payload);
      setIsLoading(false);
      if (response.success && response.data) {
        setSeasons([...seasons, response.data]);
        setSelectedSeason(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create season');
      }
    } else if (viewMode === 'edit' && selectedSeason) {
      const response = await leaguesApi.updateSeason(league.id, selectedSeason.id, {
        ...payload,
        version: selectedSeason.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setSeasons(seasons.map(s => s.id === response.data!.id ? response.data! : s));
        setSelectedSeason(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update season');
      }
    }
  }

  async function handleDelete() {
    if (!selectedSeason) return;
    
    if (!confirm(`Delete "${selectedSeason.name}"?`)) return;

    setIsLoading(true);
    setError('');
    const response = await leaguesApi.deleteSeason(league.id, selectedSeason.id);
    setIsLoading(false);
    if (response.success) {
      setSeasons(seasons.filter(s => s.id !== selectedSeason.id));
      setSelectedSeason(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete season');
    }
  }

  async function handleSetActive() {
    if (!selectedSeason) return;

    setIsLoading(true);
    setError('');
    const response = await leaguesApi.update(league.id, {
      activeSeasonId: selectedSeason.id,
      version: league.version,
    });
    setIsLoading(false);
    if (response.success && response.data) {
      onLeagueUpdated(response.data);
    } else {
      setError(response.error?.message || 'Failed to set active season');
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString();
  }

  function renderList() {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <DialogTitle>Seasons - {league.name}</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {seasons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No seasons found</p>
          ) : (
            <div className="space-y-1">
              {seasons.map((season) => (
                <button
                  key={season.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors flex items-center justify-between"
                  onClick={() => handleSelectSeason(season)}
                >
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {season.name}
                      {league.activeSeasonId === season.id && (
                        <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {formatDate(season.startDate)} - {formatDate(season.endDate)}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </>
    );
  }

  function renderView() {
    if (!selectedSeason) return null;
    const isActiveSeason = league.activeSeasonId === selectedSeason.id;
    
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle className="flex items-center gap-2">
              {selectedSeason.name}
              {isActiveSeason && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="text-lg">{selectedSeason.name}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Start Date</Label>
              <p>{formatDate(selectedSeason.startDate)}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">End Date</Label>
              <p>{formatDate(selectedSeason.endDate)}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Status</Label>
            <p>{isActiveSeason ? 'Active Season' : 'Inactive'}</p>
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          {!isActiveSeason && (
            <Button variant="secondary" size="sm" onClick={handleSetActive}>
              <Star className="h-4 w-4 mr-1" />
              Set Active
            </Button>
          )}
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
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isCreate ? 'New Season' : 'Edit Season'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Spring 2026"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.name || isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
            {isCreate ? 'Create' : 'Save'}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
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
