import React from 'react';

export default function LoadingSpinner({ className = "min-h-screen" }) {
  return (
    <div className={`flex items-center justify-center ${className}`} style={{ background: 'var(--bg-primary)' }}>
      <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: 'var(--color-primary)' }}></div>
    </div>
  );
}
