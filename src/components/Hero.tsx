import React from 'react';
import { ArrowUpRight, ShieldCheck, Wrench, Sparkles, AlertTriangle } from 'lucide-react';

interface HeroProps {
  onStartAssessment: () => void;
  onExploreServices: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartAssessment, onExploreServices }) => {
  return (
    <section className="pt-8 pb-14 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Column: Heading, Subtitle & CTAs */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100/70 border border-emerald-200/80 text-emerald-900 text-xs font-semibold tracking-wider uppercase">
            <Sparkles className="w-3.5 h-3.5 text-emerald-700" />
            A smarter first step for your electronics
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif text-stone-900 leading-[1.12] tracking-tight">
            Don't Replace It Before You Understand It.
          </h1>

          <p className="text-lg sm:text-xl text-stone-600 leading-relaxed max-w-2xl font-light">
            Understand your electronic-device problem, compare repair options and make smarter repair or replacement decisions across Sri Lanka.
          </p>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={onStartAssessment}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white font-medium text-base shadow-sm transition transform active:scale-98 cursor-pointer"
            >
              Start an AI assessment
              <ArrowUpRight className="w-4 h-4" />
            </button>

            <button
              onClick={onExploreServices}
              className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl border border-stone-300 hover:border-stone-400 bg-white/80 hover:bg-white text-stone-800 font-medium text-base shadow-2xs transition cursor-pointer"
            >
              Find repair services
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-500 pt-1">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Guidance, not a confirmed diagnosis. Stop using a device that appears unsafe.</span>
          </div>
        </div>

        {/* Right Column: Visual Card */}
        <div className="lg:col-span-5 relative">
          <div className="relative rounded-3xl overflow-hidden border border-stone-200/80 bg-white shadow-xl shadow-stone-200/50 p-3 sm:p-4">
            <div className="relative rounded-2xl overflow-hidden bg-stone-100 aspect-4/3 flex items-center justify-center">
              <img
                src="/assets/aistudio/RepairFirst_LK_website__1__f44d0d33.png"
                alt="Electronic device inspection"
                className="w-full h-full object-cover object-top opacity-95 hover:scale-102 transition duration-500"
                onError={(e) => {
                  // Fallback if image path has rendering quirk
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 via-transparent to-transparent pointer-events-none" />
              
              {/* Badge overlay matching screenshot */}
              <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-xl border border-stone-200/80 shadow-md flex items-center gap-2.5 text-stone-800 text-sm font-medium">
                <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
                <span>A little clarity can make a big difference.</span>
              </div>
            </div>

            {/* Micro stats strip */}
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-stone-100 text-center">
              <div>
                <div className="text-xs text-stone-500">Categories</div>
                <div className="font-semibold text-stone-800 text-sm">Laptops & Phones</div>
              </div>
              <div className="border-x border-stone-200">
                <div className="text-xs text-stone-500">Safety First</div>
                <div className="font-semibold text-emerald-800 text-sm">Hazard Checks</div>
              </div>
              <div>
                <div className="text-xs text-stone-500">Coverage</div>
                <div className="font-semibold text-stone-800 text-sm">Island-wide</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
