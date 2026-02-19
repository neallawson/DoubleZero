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
import { locationsApi, formatApiError, type Location } from '@/lib/api';
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
      setError(formatApiError(response, 'Failed to load locations'));
    }
  }

  function populateFormData(location: Location) {
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      zip: location.zip || '',
      country: location.country || '',
    });
  }

  function handleSelectLocation(location: Location) {
    setSelectedLocation(location);
    populateFormData(location);
    setViewMode('view');
  }

  function handleCreate() {
    setFormData({ name: '', address: '', city: '', state: '', zip: '', country: '' });
    setSelectedLocation(null);
    setViewMode('create');
  }

  function handleEdit() {
    setViewMode('edit');
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedLocation(null);
    } else if (viewMode === 'edit') {
      if (selectedLocation) populateFormData(selectedLocation);
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
        populateFormData(response.data);
        setViewMode('view');
      } else {
        setError(formatApiError(response, 'Failed to create location'));
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
        populateFormData(response.data);
        setViewMode('view');
      } else {
        setError(formatApiError(response, 'Failed to update location'));
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
      setError(formatApiError(response, 'Failed to delete location'));
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

  function renderDetail() {
    const isReadOnly = viewMode === 'view';
    const isCreate = viewMode === 'create';
    const title = isReadOnly
      ? (selectedLocation?.name || 'Location')
      : isCreate ? 'New Location' : 'Edit Location';

    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{title}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name{!isReadOnly && ' *'}</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Main Field"
              disabled={isReadOnly}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Street address"
              disabled={isReadOnly}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={isReadOnly}
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
                disabled={isReadOnly}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="e.g., USA"
                disabled={isReadOnly}
              />
            </div>
          </div>
        </div>
        {isReadOnly ? (
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
        ) : (
          <DialogFooter>
            <Button variant="outline" onClick={handleBack}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!formData.name || isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              {isCreate ? 'Create' : 'Save'}
            </Button>
          </DialogFooter>
        )}
      </>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {error && (
          <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-md mb-4 whitespace-pre-line">
            {error}
          </div>
        )}
        {isLoading && viewMode === 'list' ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : viewMode === 'list' ? (
          renderList()
        ) : (
          renderDetail()
        )}
      </DialogContent>
    </Dialog>
  );
}
