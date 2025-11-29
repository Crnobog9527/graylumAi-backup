import React from 'react';
import { Coins, Plus, TrendingUp } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function CreditDisplay({ credits, showBuyButton, compact }) {
  const formattedCredits = typeof credits === 'number' ? credits.toLocaleString() : '0';

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
        <Coins className="h-4 w-4 text-amber-500" />
        <span className="font-semibold text-amber-700">{formattedCredits}</span>
      </div>
    );
  }

  return (
    <div className={cn(
      "flex items-center gap-4 p-4 rounded-2xl",
      "bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50",
      "border border-amber-100"
    )}>
      <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200">
        <Coins className="h-5 w-5 text-white" />
      </div>
      
      <div className="flex-1">
        <p className="text-sm text-amber-600 font-medium">Available Credits</p>
        <p className="text-2xl font-bold text-amber-800">{formattedCredits}</p>
      </div>
      
      {showBuyButton && (
        <Link to={createPageUrl('Credits')}>
          <Button 
            size="sm" 
            className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-200 text-white"
          >
            <Plus className="h-4 w-4 mr-1" />
            Buy More
          </Button>
        </Link>
      )}
    </div>
  );
}