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
import { personsApi, type Person } from '@/lib/api';
import { ArrowLeft, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';

interface PersonCrudModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onBack: () => void;
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export function PersonCrudModal({ open, onOpenChange, onClose, onBack }: PersonCrudModalProps) {
  const [persons, setPersons] = useState<Person[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Form state
  const [formData, setFormData] = useState({
    displayName: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
  });

  useEffect(() => {
    if (open) {
      loadPersons();
    }
  }, [open]);

  async function loadPersons() {
    setIsLoading(true);
    setError('');
    const response = await personsApi.list();
    setIsLoading(false);
    if (response.success && response.data) {
      setPersons(response.data);
    } else {
      setError(response.error?.message || 'Failed to load persons');
    }
  }

  function handleSelectPerson(person: Person) {
    setSelectedPerson(person);
    setViewMode('view');
  }

  function handleCreate() {
    setFormData({ displayName: '', firstName: '', lastName: '', email: '', phone: '', dateOfBirth: '' });
    setSelectedPerson(null);
    setViewMode('create');
  }

  function handleEdit() {
    if (selectedPerson) {
      setFormData({
        displayName: selectedPerson.displayName,
        firstName: selectedPerson.firstName || '',
        lastName: selectedPerson.lastName || '',
        email: selectedPerson.email || '',
        phone: selectedPerson.phone || '',
        dateOfBirth: selectedPerson.dateOfBirth?.split('T')[0] || '',
      });
      setViewMode('edit');
    }
  }

  function handleBack() {
    if (viewMode === 'view' || viewMode === 'create') {
      setViewMode('list');
      setSelectedPerson(null);
    } else if (viewMode === 'edit') {
      setViewMode('view');
    }
  }

  async function handleSave() {
    setIsLoading(true);
    setError('');

    const payload = {
      displayName: formData.displayName,
      firstName: formData.firstName || null,
      lastName: formData.lastName || null,
      email: formData.email || null,
      phone: formData.phone || null,
      dateOfBirth: formData.dateOfBirth || null,
    };

    if (viewMode === 'create') {
      const response = await personsApi.create(payload);
      setIsLoading(false);
      if (response.success && response.data) {
        setPersons([...persons, response.data]);
        setSelectedPerson(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to create person');
      }
    } else if (viewMode === 'edit' && selectedPerson) {
      const response = await personsApi.update(selectedPerson.id, {
        ...payload,
        version: selectedPerson.version,
      });
      setIsLoading(false);
      if (response.success && response.data) {
        setPersons(persons.map(p => p.id === response.data!.id ? response.data! : p));
        setSelectedPerson(response.data);
        setViewMode('view');
      } else {
        setError(response.error?.message || 'Failed to update person');
      }
    }
  }

  async function handleDelete() {
    if (!selectedPerson) return;
    
    if (!confirm(`Delete "${selectedPerson.displayName}"?`)) return;

    setIsLoading(true);
    setError('');
    const response = await personsApi.delete(selectedPerson.id);
    setIsLoading(false);
    if (response.success) {
      setPersons(persons.filter(p => p.id !== selectedPerson.id));
      setSelectedPerson(null);
      setViewMode('list');
    } else {
      setError(response.error?.message || 'Failed to delete person');
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
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>Persons</DialogTitle>
            <Button size="sm" onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-1" />
              New
            </Button>
          </div>
        </DialogHeader>
        <div className="max-h-80 overflow-y-auto">
          {persons.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No persons found</p>
          ) : (
            <div className="space-y-1">
              {persons.map((person) => (
                <button
                  key={person.id}
                  className="w-full text-left px-3 py-2 rounded-md hover:bg-blue-100 transition-colors"
                  onClick={() => handleSelectPerson(person)}
                >
                  <div className="font-medium">{person.displayName}</div>
                  {person.email && (
                    <div className="text-sm text-muted-foreground truncate">
                      {person.email}
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
    if (!selectedPerson) return null;
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{selectedPerson.displayName}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-muted-foreground">Display Name</Label>
            <p className="text-lg">{selectedPerson.displayName}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">First Name</Label>
              <p>{selectedPerson.firstName || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Last Name</Label>
              <p>{selectedPerson.lastName || '—'}</p>
            </div>
          </div>
          <div>
            <Label className="text-muted-foreground">Email</Label>
            <p>{selectedPerson.email || '—'}</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">Phone</Label>
              <p>{selectedPerson.phone || '—'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">Date of Birth</Label>
              <p>{formatDate(selectedPerson.dateOfBirth)}</p>
            </div>
          </div>
          {selectedPerson.userId && (
            <div>
              <Label className="text-muted-foreground">Linked User</Label>
              <p>User #{selectedPerson.userId}</p>
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
    return (
      <>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <DialogTitle>{isCreate ? 'New Person' : 'Edit Person'}</DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name *</Label>
            <Input
              id="displayName"
              value={formData.displayName}
              onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
              placeholder="How they appear in the app"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleBack}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!formData.displayName || isLoading}>
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
