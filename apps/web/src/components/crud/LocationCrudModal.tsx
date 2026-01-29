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
import { locationsApi, type Location } from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface LocationCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onBack: () => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export function LocationCrudModal({ open, onOpenChange, onClose, onBack }: LocationCrudModalProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: '',
  });

  useEffect(() => {
    if (open) {
      loadLocations();
    }
  }, [open]);

  async function loadLocations() {
    setIsLoading(true);
    setError('');
    const response = await locationsApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setLocations(response.data);
    } else {
      setError(response.error?.message || 'Failed to load locations');
    }
  }

  function handleSelectLocation(location: Location) {
    setSelectedLocation(location);
    setViewMode('view');
  }

  function handleCreate() {
    setFormData({ name: '', address: '', city: '', state: '', zip: '', country: '' });
    setSelectedLocation(null);
    setViewMode('create');
  }

  function handleEdit() {
    if (selectedLocation) {
      setFormData({
        name: selectedLocation.name,
        address: selectedLocation.address || '',
        city: selectedLocation.city || '',
        state: selectedLocation.state || '',
        zip: selectedLocation.zip || '',
        country: selectedLocation.country || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedLocation(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError('');

    const payload = {
      name: formData.name,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      zip: formData.zip || null,
      country: formData.country || null,
    };

    if (viewMode === 'create') {
      const response = await locationsApi.create(payload);
      setIsLoading(false);
      if (response.success && response.data) {
        setLocations([...locations, response.data]);
        setSelectedLocation(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create location');
      }
    } else if (viewMode === 'edit' && selectedLocation) {
      const response = await locationsApi.update(selectedLocation.id, {
        ...payload,
        version: selectedLocation.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setLocations(locations.map(l => l.id === response.data!.id ? response.data! : l));
        setSelectedLocation(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update location');
      }
    }
  }

  async function handleDelete() {
    if (!selectedLocation) return;
    
    if (!confirm(`Delete "${selectedLocation.name}"?`)) return;

    setIsLoading(true);
    setError('');
    const response = await locationsApi.delete(selectedLocation.id);
    setIsLoading(false);
    if (response.success) {
      setLocations(locations.filter(l => l.id !== selectedLocation.id));
      setSelectedLocation(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete location');
    }
  }

  function formatAddress(loc: Location) {
    const parts = [loc.city, loc.state].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  function renderList() {
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Locations</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {locations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No locations found</p>
          ) : (
            <div className="space-y-1">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => handleSelectLocation(loc)}
                >
                  <div className="font-medium">{loc.name}</div>
                  {formatAddress(loc) && (
                    <div className="text-sm text-muted-foreground truncate">
                      {formatAddress(loc)}
                    </div>
                  )}
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
    if (!selectedLocation) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{selectedLocation.name}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Name</Label>
            <p className="text-lg">{selectedLocation.name}</p>
          </div>
          <div>
            <Label className="text-muted-foreground">Address</Label>
            <p>{selectedLocation.address || '—'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">City</Label>
              <p>{selectedLocation.city || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">State</Label>
              <p>{selectedLocation.state || '—'}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">ZIP</Label>
              <p>{selectedLocation.zip || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Country</Label>
              <p>{selectedLocation.country || '—'}</p>
            </div>
          </div>
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
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isCreate ? 'New Location' : 'Edit Location'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Field"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="zip">ZIP</Label>
              <Input
                id="zip"
                value={formData.zip}
                onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., USA"
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
