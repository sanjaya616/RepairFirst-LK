import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { FAQ_ITEMS } from '../lib/demoData';

export const FAQSection: React.FC = () => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  const toggle = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  return (
    <section className="py-14 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">
          A few useful answers.
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 font-light">
          Common questions about device safety, remote guidance, and Sri Lankan repair options.
        </p>
      </div>

      <div className="space-y-3 pt-4">
        {FAQ_ITEMS.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-white border border-stone-200/90 shadow-2xs overflow-hidden transition"
            >
              <button
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between p-5 text-left font-medium text-stone-800 hover:text-stone-950 transition cursor-pointer"
              >
                <span className="text-sm sm:text-base flex items-center gap-2">
                  <span className="text-emerald-700">▶</span>
                  {item.question}
                </span>
                {isOpen ? (
                  <ChevronUp className="w-4 h-4 text-stone-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-stone-400 shrink-0" />
                )}
              </button>

              {isOpen && (
                <div className="px-5 pb-5 text-xs sm:text-sm text-stone-600 leading-relaxed font-light border-t border-stone-100 pt-3">
                  {item.answer}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
