import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Package, Star } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import AdminSidebar from '../components/admin/AdminSidebar';

const initialFormData = {
  name: '',
  credits: 100,
  price: 9.99,
  bonus_credits: 0,
  is_popular: false,
  is_active: true,
  sort_order: 0,
};

export default function AdminPackages() {
  const [user, setUser] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const queryClient = useQueryClient();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        if (userData.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setUser(userData);
      } catch (e) {
        base44.auth.redirectToLogin();
      }
    };
    loadUser();
  }, []);

  const { data: packages = [] } = useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => base44.entities.CreditPackage.list('sort_order'),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditPackage.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CreditPackage.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDialogOpen(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CreditPackage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries(['admin-packages']);
      setDeleteDialogOpen(false);
      setSelectedPackage(null);
    },
  });

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedPackage(null);
  };

  const handleEdit = (pkg) => {
    setSelectedPackage(pkg);
    setFormData({
      name: pkg.name || '',
      credits: pkg.credits || 100,
      price: pkg.price || 9.99,
      bonus_credits: pkg.bonus_credits || 0,
      is_popular: pkg.is_popular || false,
      is_active: pkg.is_active !== false,
      sort_order: pkg.sort_order || 0,
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (selectedPackage) {
      updateMutation.mutate({ id: selectedPackage.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (pkg) => {
    setSelectedPackage(pkg);
    setDeleteDialogOpen(true);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminPackages" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Credit Packages</h1>
            <p className="text-slate-500 mt-1">Configure pricing and credit bundles</p>
          </div>
          <Button 
            onClick={() => { resetForm(); setDialogOpen(true); }}
            className="bg-violet-600 hover:bg-violet-700 gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Package
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Package</TableHead>
                  <TableHead>Credits</TableHead>
                  <TableHead>Bonus</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>$/Credit</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {packages.map((pkg) => {
                  const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
                  const pricePerCredit = (pkg.price / totalCredits).toFixed(3);
                  return (
                    <TableRow key={pkg.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-lg bg-amber-100">
                            <Package className="h-5 w-5 text-amber-600" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{pkg.name}</span>
                            {pkg.is_popular && (
                              <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{pkg.credits.toLocaleString()}</TableCell>
                      <TableCell>
                        {pkg.bonus_credits > 0 ? (
                          <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                            +{pkg.bonus_credits}
                          </Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell className="font-medium">${pkg.price}</TableCell>
                      <TableCell className="text-slate-500">${pricePerCredit}</TableCell>
                      <TableCell>
                        <Badge variant={pkg.is_active ? "default" : "secondary"}>
                          {pkg.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(pkg)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleDelete(pkg)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {packages.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                      No credit packages yet. Create your first package.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {selectedPackage ? 'Edit Package' : 'Create Package'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Package Name</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Starter Pack"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Credits</Label>
                  <Input
                    type="number"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                    min={1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bonus Credits</Label>
                  <Input
                    type="number"
                    value={formData.bonus_credits}
                    onChange={(e) => setFormData({ ...formData, bonus_credits: parseInt(e.target.value) })}
                    min={0}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (USD)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                    min={0.01}
                    step={0.01}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <Label>Mark as Popular</Label>
                <Switch
                  checked={formData.is_popular}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_popular: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>Active</Label>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={!formData.name || formData.credits < 1}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {selectedPackage ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Package</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{selectedPackage?.name}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate(selectedPackage?.id)}
                className="bg-red-600 hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}