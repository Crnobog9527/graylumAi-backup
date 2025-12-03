import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, User, Coins, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { format } from 'date-fns';

import AdminSidebar from '../components/admin/AdminSidebar';
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

function AdminUsersContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [creditAdjustment, setCreditAdjustment] = useState({ amount: 0, reason: '' });
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

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
    enabled: !!user,
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => queryClient.invalidateQueries(['admin-users']),
  });

  const createTransactionMutation = useMutation({
    mutationFn: (data) => base44.entities.CreditTransaction.create(data),
  });

  const handleAdjustCredits = async () => {
    if (!selectedUser || creditAdjustment.amount === 0) return;
    
    const newBalance = (selectedUser.credits || 0) + creditAdjustment.amount;
    
    await updateUserMutation.mutateAsync({
      id: selectedUser.id,
      data: { credits: newBalance }
    });

    await createTransactionMutation.mutateAsync({
      user_email: selectedUser.email,
      type: 'admin_adjustment',
      amount: creditAdjustment.amount,
      balance_after: newBalance,
      description: creditAdjustment.reason || 'Admin adjustment',
    });

    setDialogOpen(false);
    setCreditAdjustment({ amount: 0, reason: '' });
    setSelectedUser(null);
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminUsers" />
      
      <div className="flex-1 p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{t('usersTitle')}</h1>
            <p className="text-slate-500 mt-1">{t('usersSubtitle')}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder={t('searchUsers')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>{t('role')}</TableHead>
                  <TableHead>{t('creditBalance')}</TableHead>
                  <TableHead>{t('totalCreditsUsed')}</TableHead>
                  <TableHead>{t('joinDate')}</TableHead>
                  <TableHead className="w-[100px]">{t('actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={u.avatar_url} />
                          <AvatarFallback className="bg-violet-100 text-violet-600">
                            {u.full_name?.[0] || u.email?.[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{u.full_name || 'Unknown'}</p>
                          <p className="text-sm text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role || 'user'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-amber-500" />
                        <span className="font-medium">{u.credits || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {u.total_credits_used || 0}
                    </TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(u.created_date), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setDialogOpen(true);
                        }}
                      >
                        <Coins className="h-4 w-4 mr-1" />
                        Adjust
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredUsers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      {t('noUsersFound')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Credit Adjustment Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('adjustCredits')}</DialogTitle>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={selectedUser.avatar_url} />
                    <AvatarFallback className="bg-violet-100 text-violet-600">
                      {selectedUser.full_name?.[0] || selectedUser.email?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedUser.full_name || 'Unknown'}</p>
                    <p className="text-sm text-slate-500">{selectedUser.email}</p>
                    <p className="text-sm text-amber-600 mt-1">
                      {t('currentBalance')}: {selectedUser.credits || 0}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>{t('adjustmentAmount')}</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCreditAdjustment(prev => ({ ...prev, amount: prev.amount - 10 }))}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={creditAdjustment.amount}
                      onChange={(e) => setCreditAdjustment(prev => ({ ...prev, amount: parseInt(e.target.value) || 0 }))}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setCreditAdjustment(prev => ({ ...prev, amount: prev.amount + 10 }))}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500">
                    Use positive numbers to add credits, negative to deduct
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>{t('reason')}</Label>
                  <Input
                    value={creditAdjustment.reason}
                    onChange={(e) => setCreditAdjustment(prev => ({ ...prev, reason: e.target.value }))}
                    placeholder="Bonus credits, refund, etc."
                  />
                </div>

                {creditAdjustment.amount !== 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg text-center">
                    <p className="text-sm text-amber-700">
                      {t('newBalance')}: <span className="font-bold">{(selectedUser.credits || 0) + creditAdjustment.amount}</span>
                    </p>
                  </div>
                )}
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                {t('cancel')}
              </Button>
              <Button 
                onClick={handleAdjustCredits}
                disabled={creditAdjustment.amount === 0}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function AdminUsers() {
  return (
    <LanguageProvider>
      <AdminUsersContent />
    </LanguageProvider>
  );
}