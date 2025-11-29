import React from 'react';
import { cn } from '@/lib/utils';
import { Coins, Sparkles, Check } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function CreditPackageCard({ package: pkg, onPurchase, isLoading }) {
  const totalCredits = pkg.credits + (pkg.bonus_credits || 0);
  const pricePerCredit = (pkg.price / totalCredits).toFixed(3);
  
  return (
    <div className={cn(
      "relative rounded-2xl border-2 p-6 transition-all hover:shadow-lg",
      pkg.is_popular 
        ? "border-violet-400 bg-gradient-to-br from-violet-50 to-purple-50" 
        : "border-slate-200 bg-white hover:border-slate-300"
    )}>
      {pkg.is_popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-violet-500 text-white">
          <Sparkles className="h-3 w-3 mr-1" />
          Most Popular
        </Badge>
      )}
      
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-slate-800 mb-2">{pkg.name}</h3>
        <div className="flex items-baseline justify-center gap-1">
          <span className="text-4xl font-bold text-slate-900">${pkg.price}</span>
          <span className="text-slate-500">USD</span>
        </div>
      </div>
      
      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50">
          <Coins className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <span className="font-semibold text-slate-800">{pkg.credits.toLocaleString()}</span>
            <span className="text-slate-500 ml-1">credits</span>
          </div>
        </div>
        
        {pkg.bonus_credits > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-emerald-50">
            <Sparkles className="h-5 w-5 text-emerald-500" />
            <div className="flex-1">
              <span className="font-semibold text-emerald-700">+{pkg.bonus_credits.toLocaleString()}</span>
              <span className="text-emerald-600 ml-1">bonus credits</span>
            </div>
          </div>
        )}
        
        <div className="text-center text-sm text-slate-500">
          ${pricePerCredit} per credit
        </div>
      </div>
      
      <Button
        className={cn(
          "w-full h-12 text-base font-semibold",
          pkg.is_popular 
            ? "bg-violet-600 hover:bg-violet-700" 
            : "bg-slate-800 hover:bg-slate-900"
        )}
        onClick={() => onPurchase(pkg)}
        disabled={isLoading}
      >
        Purchase Now
      </Button>
    </div>
  );
}