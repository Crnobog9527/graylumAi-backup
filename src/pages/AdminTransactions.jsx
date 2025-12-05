import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Search, TrendingUp, TrendingDown, Coins, Filter, User, X } from 'lucide-react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { LanguageProvider, useLanguage } from '../components/admin/LanguageContext';

const typeColors = {
  purchase: 'bg-emerald-100 text-emerald-700',
  usage: 'bg-rose-100 text-rose-700',
  bonus: 'bg-blue-100 text-blue-700',
  refund: 'bg-amber-100 text-amber-700',
  admin_adjustment: 'bg-violet-100 text-violet-700',
};

function AdminTransactionsContent() {
  const { t } = useLanguage();
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedUserEmail, setSelectedUserEmail] = useState(null);

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
    queryFn: () => base44.entities.CreditTransaction.list('-created_date', 500),
    enabled: !!user,
  });

  // 获取所有用户列表（从交易记录中提取）
  const allUsers = [...new Set(transactions.map(tx => tx.user_email).filter(Boolean))].sort();

  const filteredTransactions = transactions.filter(tx => {
    const matchesSearch = 
      tx.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'all' || tx.type === typeFilter;
    const matchesUser = !selectedUserEmail || tx.user_email === selectedUserEmail;
    return matchesSearch && matchesType && matchesUser;
  });

  // 统计数据基于筛选后的结果
  const statsTransactions = selectedUserEmail ? filteredTransactions : transactions;

  const totalPurchased = statsTransactions
    .filter(t => t.type === 'purchase')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalUsed = statsTransactions
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
          <h1 className="text-3xl font-bold text-slate-900">{t('transactionsTitle')}</h1>
          <p className="text-slate-500 mt-1">{t('transactionsSubtitle')}</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-100">
                <TrendingUp className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">{t('totalPurchased')}</p>
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
                <p className="text-sm text-slate-500">{t('totalUsed')}</p>
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
                <p className="text-sm text-slate-500">{t('netCredits')}</p>
                <p className="text-2xl font-bold text-slate-900">{(totalPurchased - totalUsed).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* User Filter Banner */}
        {selectedUserEmail && (
          <div className="flex items-center gap-3 mb-4 p-3 bg-violet-50 rounded-lg border border-violet-200">
            <User className="h-5 w-5 text-violet-600" />
            <span className="text-violet-800 font-medium">查看用户: {selectedUserEmail}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUserEmail(null)}
              className="ml-auto text-violet-600 hover:text-violet-800 hover:bg-violet-100"
            >
              <X className="h-4 w-4 mr-1" />
              清除筛选
            </Button>
          </div>
        )}

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
          <Select value={selectedUserEmail || 'all'} onValueChange={(v) => setSelectedUserEmail(v === 'all' ? null : v)}>
            <SelectTrigger className="w-64">
              <User className="h-4 w-4 mr-2" />
              <SelectValue placeholder="全部用户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部用户</SelectItem>
              {allUsers.map(email => (
                <SelectItem key={email} value={email}>{email}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('allTypes')}</SelectItem>
              <SelectItem value="purchase">{t('purchase')}</SelectItem>
              <SelectItem value="usage">{t('usage')}</SelectItem>
              <SelectItem value="bonus">{t('bonus')}</SelectItem>
              <SelectItem value="refund">{t('refund')}</SelectItem>
              <SelectItem value="admin_adjustment">{t('adminAdjustment')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('user')}</TableHead>
                  <TableHead>{t('type')}</TableHead>
                  <TableHead>{t('description')}</TableHead>
                  <TableHead>{t('amount')}</TableHead>
                  <TableHead>{t('currentBalance')}</TableHead>
                  <TableHead>{t('date')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell>
                      <button
                        onClick={() => setSelectedUserEmail(tx.user_email)}
                        className="font-medium text-left hover:text-violet-600 hover:underline transition-colors"
                      >
                        {tx.user_email}
                      </button>
                    </TableCell>
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
                      {t('noTransactionsFound')}
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

export default function AdminTransactions() {
  return (
    <LanguageProvider>
      <AdminTransactionsContent />
    </LanguageProvider>
  );
}