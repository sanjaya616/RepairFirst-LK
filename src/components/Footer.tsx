import React from 'react';
import { RefreshCw, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-[#12231b] text-stone-300 border-t border-stone-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-light">
          <div className="flex items-center gap-2.5 text-stone-200">
            <RefreshCw className="w-4 h-4 text-emerald-400" />
            <span className="font-normal tracking-tight">
              RepairFirst LK · Understand. Repair. Reconsider.
            </span>
          </div>

          <div className="text-center sm:text-right text-stone-400">
            Academic Emerging Technologies Project · Sri Lanka
          </div>

          <button
            onClick={scrollToTop}
            className="flex items-center gap-1 text-stone-300 hover:text-white transition cursor-pointer"
          >
            <span>Back to top</span>
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </footer>
  );
};
