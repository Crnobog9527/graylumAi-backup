import React from 'react';
import { Coins, Plus, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from '@/lib/utils';

export default function CreditBalance({ credits, compact, onBuyClick }) {
  if (compact) {
    return (
      <Button
        variant="outline"
        className="h-10 gap-2 border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-700"
        onClick={onBuyClick}
      >
        <Coins className="h-4 w-4" />
        <span className="font-semibold">{credits?.toLocaleString() || 0}</span>
        <Plus className="h-3.5 w-3.5" />
      </Button>
    );
  }
  
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 border border-amber-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-amber-100">
            <Coins className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <p className="text-sm text-amber-600 font-medium">Credit Balance</p>
            <p className="text-3xl font-bold text-amber-900">{credits?.toLocaleString() || 0}</p>
          </div>
        </div>
        <Button 
          onClick={onBuyClick}
          className="bg-amber-500 hover:bg-amber-600 text-white"
        >
          <Plus className="h-4 w-4 mr-2" />
          Buy Credits
        </Button>
      </div>
      <div className="flex items-center gap-2 text-sm text-amber-700">
        <TrendingUp className="h-4 w-4" />
        <span>Credits are used for AI conversations</span>
      </div>
    </div>
  );
}