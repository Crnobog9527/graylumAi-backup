import React from 'react';

export default function LoadingSpinner({ className = "min-h-screen" }) {
  return (
    <div className={`flex items-center justify-center bg-slate-50 ${className}`}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
    </div>
  );
}
