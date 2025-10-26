import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card } from '../ui/card';
import { Separator } from '../ui/separator';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Trash2, Plus, Loader2 } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface Address {
  id: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
  is_default: boolean;
}

interface ProfileManagementProps {
  user: User;
  accessToken: string;
}

export function ProfileManagement({ user, accessToken }: ProfileManagementProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: '', phone: '' });
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [newAddress, setNewAddress] = useState({
    name: '',
    street: '',
    city: '',
    state: '',
    postal_code: '',
    country: 'USA',
    is_default: false
  });
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, []);

  // fetch user profile information from backend
  const fetchProfile = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      if (data.user) {
        setProfile({
          name: data.user.name || '',
          phone: data.user.phone || ''
        });
      }
    } catch (error) {
      console.log(`Error fetching profile: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  //fetch user's saved addresses from backend
  const fetchAddresses = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user/addresses`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );
      const data = await response.json();
      setAddresses(data.addresses || []);
    } catch (error) {
      console.log(`Error fetching addresses: ${error}`);
    }
  };

  // handles updating user name and phone number
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/user/profile`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(profile)
        }
      );

      if (response.ok) {
        toast.success('Profile updated successfully');
      } else {
        toast.error('Failed to update profile');
      }
    } catch (error) {
      console.log(`Error saving profile: ${error}`);
      toast.error('An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // handles adding a new address for the user
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingAddress(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/addresses`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(newAddress)
        }
      );

      if (response.ok) {
        toast.success('Address added successfully');
        setNewAddress({ name: '', street: '', city: '', state: '', postal_code: '', country: 'USA', is_default: false });
        fetchAddresses();
      } else {
        toast.error('Failed to add address');
      }
    } catch (error) {
      console.log(`Error adding address: ${error}`);
      toast.error('An error occurred');
    } finally {
      setAddingAddress(false);
    }
  };

  // opens the delete confirmation dialog
  const openDeleteDialog = (id: string) => {
    setAddressToDelete(id);
    setShowDeleteDialog(true);
  };

  // handles deleting an address
  const handleDeleteAddress = async () => {
    if (!addressToDelete) return;
    
    setDeletingAddressId(addressToDelete);
    setShowDeleteDialog(false);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/server/addresses/${addressToDelete}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      if (response.ok) {
        toast.success('Address deleted successfully');
        fetchAddresses();
      } else {
        toast.error('Failed to delete address');
      }
    } catch (error) {
      console.log(`Error deleting address: ${error}`);
      toast.error('An error occurred');
    } finally {
      setDeletingAddressId(null);
      setAddressToDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h2 className="mb-6">Profile Settings</h2>

      {/*display user information*/}
      <Card className="p-6 mb-6">
        <h3 className="mb-4">Personal Information</h3>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={user.email}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              disabled={saving}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              disabled={saving}
            />
          </div>

          {/* save button */}
          <Button type="submit" disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </form>
      </Card>

      {/* saved Addresses */}
      <Card className="p-6">
        <h3 className="mb-4">Saved Addresses</h3>
        {addresses.length > 0 && (
          <div className="space-y-3 mb-6">
            {addresses.map((address) => (
              <div key={address.id} className="p-4 border border-gray-200 rounded-lg">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4>{address.name}</h4>
                    {address.is_default && (
                      <span className="text-xs text-blue-600">Default</span>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDeleteDialog(address.id)}
                    disabled={deletingAddressId === address.id}
                  >
                    {deletingAddressId === address.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
                <p className="text-gray-600">
                  {address.street}<br />
                  {address.city}, {address.state} {address.postal_code}<br />
                  {address.country}
                </p>
              </div>
            ))}
          </div>
        )}

        <Separator className="my-6" />

        {/* form for adding new address */}
        <h4 className="mb-4">Add New Address</h4>
        <form onSubmit={handleAddAddress} className="space-y-4">
          {/* name/label for address */}
          <div className="space-y-2">
            <Label htmlFor="name">Address Name</Label>
            <Input
              id="name"
              placeholder="e.g., Home, Work"
              value={newAddress.name}
              onChange={(e) => setNewAddress({ ...newAddress, name: e.target.value })}
              required
              disabled={addingAddress}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="street">Street Address</Label>
            <Input
              id="street"
              value={newAddress.street}
              onChange={(e) => setNewAddress({ ...newAddress, street: e.target.value })}
              required
              disabled={addingAddress}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={newAddress.city}
                onChange={(e) => setNewAddress({ ...newAddress, city: e.target.value })}
                required
                disabled={addingAddress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={newAddress.state}
                onChange={(e) => setNewAddress({ ...newAddress, state: e.target.value })}
                required
                disabled={addingAddress}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">ZIP Code</Label>
              <Input
                id="postal_code"
                value={newAddress.postal_code}
                onChange={(e) => setNewAddress({ ...newAddress, postal_code: e.target.value })}
                required
                disabled={addingAddress}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={newAddress.country}
                onChange={(e) => setNewAddress({ ...newAddress, country: e.target.value })}
                required
                disabled={addingAddress}
              />
            </div>
          </div>

          {/* set as default toggle */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_default"
              checked={newAddress.is_default}
              onCheckedChange={(checked:boolean) =>
                setNewAddress({ ...newAddress, is_default: checked as boolean })
              }
              disabled={addingAddress}
            />
            <Label htmlFor="is_default" className="text-sm cursor-pointer">
              Set as default address
            </Label>
          </div>

          <Button type="submit" disabled={addingAddress}>
            {addingAddress ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Address
              </>
            )}
          </Button>
        </form>
      </Card>

      {/* confirmation for deleting address */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAddress} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}