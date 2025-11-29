import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, TrendingDown, Coins, Filter } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

const typeColors = {
  purchase: 'bg-emerald-100 text-emerald-700',
  usage: 'bg-rose-100 text-rose-700',
  bonus: 'bg-blue-100 text-blue-700',
  refund: 'bg-amber-100 text-amber-700',
  admin_adjustment: 'bg-violet-100 text-violet-700',
};

export default function AdminTransactions() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

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

  const { data: transactions = [] } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: () => base44.entities.CreditTransaction.list('-created_date', 100),
    enabled: !!user,
  });

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const totalPurchased = transactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUsed = transactions
    .filter(t => t.type === 'usage')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-500"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      <AdminSidebar currentPage="AdminTransactions" />
      
      <div className="flex-1 p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
          <p className="text-slate-500 mt-1">View all credit transactions</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Purchased</p>
                <p className="text-2xl font-bold text-slate-900">{totalPurchased.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-rose-100">
                <TrendingDown className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Used</p>
                <p className="text-2xl font-bold text-slate-900">{totalUsed.toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-violet-100">
                <Coins className="h-5 w-5 text-violet-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Net Credits</p>
                <p className="text-2xl font-bold text-slate-900">{(totalPurchased - totalUsed).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search by email or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="purchase">Purchases</SelectItem>
              <SelectItem value="usage">Usage</SelectItem>
              <SelectItem value="bonus">Bonuses</SelectItem>
              <SelectItem value="refund">Refunds</SelectItem>
              <SelectItem value="admin_adjustment">Admin Adjustments</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance After</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="font-medium">{tx.user_email}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[tx.type] || 'bg-slate-100 text-slate-700'}>
                        {tx.type?.replace('_', ' ')}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate text-slate-600">
                      {tx.description}
                    </TableCell>
                    <TableCell>
                      <span className={tx.amount >= 0 ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                        {tx.amount >= 0 ? '+' : ''}{tx.amount}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-500">{tx.balance_after}</TableCell>
                    <TableCell className="text-slate-500">
                      {format(new Date(tx.created_date), 'MMM d, yyyy HH:mm')}
                    </TableCell>
                  </TableRow>
                ))}
                {filteredTransactions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      No transactions found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}