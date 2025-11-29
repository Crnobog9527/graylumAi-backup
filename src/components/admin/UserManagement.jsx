import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Users, Search, Coins, Plus, Minus } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Badge } from "@/components/ui/badge";
import { format } from 'date-fns';
import { toast } from "sonner";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState('');
  const [adjustDialog, setAdjustDialog] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adjustAmount, setAdjustAmount] = useState(0);
  const [adjustReason, setAdjustReason] = useState('');
  const queryClient = useQueryClient();

  const { data: users = [] } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => base44.entities.User.list('-created_date'),
  });

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAdjustCredits = async () => {
    if (!selectedUser || adjustAmount === 0) return;

    const newCredits = (selectedUser.credits || 0) + adjustAmount;
    await base44.entities.User.update(selectedUser.id, { credits: newCredits });

    await base44.entities.CreditTransaction.create({
      user_email: selectedUser.email,
      type: 'admin_adjustment',
      amount: adjustAmount,
      balance_after: newCredits,
      description: adjustReason || 'Admin credit adjustment',
    });

    queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    setAdjustDialog(false);
    setSelectedUser(null);
    setAdjustAmount(0);
    setAdjustReason('');
    toast.success('Credits adjusted successfully');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          User Management
        </CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search users..."
            className="pl-10"
          />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Credits</TableHead>
              <TableHead>Joined</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div>
                    <p className="font-medium">{user.full_name || 'No name'}</p>
                    <p className="text-sm text-slate-500">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                    {user.role || 'user'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Coins className="h-4 w-4 text-amber-500" />
                    <span className="font-medium">{(user.credits || 0).toLocaleString()}</span>
                  </div>
                </TableCell>
                <TableCell className="text-slate-500">
                  {user.created_date ? format(new Date(user.created_date), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => { setSelectedUser(user); setAdjustDialog(true); }}
                  >
                    <Coins className="h-4 w-4 mr-1" />
                    Adjust Credits
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <Dialog open={adjustDialog} onOpenChange={setAdjustDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Adjust Credits</DialogTitle>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="font-medium">{selectedUser.full_name || selectedUser.email}</p>
                  <p className="text-sm text-slate-500">Current balance: {(selectedUser.credits || 0).toLocaleString()} credits</p>
                </div>

                <div className="space-y-2">
                  <Label>Amount to Add/Remove</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustAmount(prev => prev - 100)}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      value={adjustAmount}
                      onChange={(e) => setAdjustAmount(parseInt(e.target.value) || 0)}
                      className="text-center"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setAdjustAmount(prev => prev + 100)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-sm text-slate-500">
                    {adjustAmount > 0 ? `Will add ${adjustAmount} credits` : 
                     adjustAmount < 0 ? `Will remove ${Math.abs(adjustAmount)} credits` : 
                     'Enter positive to add, negative to remove'}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Reason (optional)</Label>
                  <Input
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                    placeholder="Bonus for feedback, refund, etc."
                  />
                </div>

                <div className="p-4 bg-amber-50 rounded-lg">
                  <p className="text-sm text-amber-800">
                    New balance will be: <strong>{((selectedUser.credits || 0) + adjustAmount).toLocaleString()}</strong> credits
                  </p>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdjustDialog(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAdjustCredits}
                disabled={adjustAmount === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Apply Adjustment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}