import React from 'react';
import { ExternalLink, ShieldAlert, Recycle, Info, CheckCircle2 } from 'lucide-react';

export const EWasteSection: React.FC = () => {
  return (
    <section id="ewaste-section" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      {/* Dark forest green container matching screenshot */}
      <div className="rounded-3xl bg-[#1b3b2f] text-white p-8 sm:p-10 lg:p-12 shadow-xl border border-emerald-950/40">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Left Area: Mission & Official Destination Links */}
          <div className="lg:col-span-7 space-y-6">
            <div className="text-xs font-mono font-semibold text-emerald-300 tracking-wider uppercase">
              The responsible last resort
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-white tracking-tight leading-[1.15]">
              When repair isn't the answer, dispose with care.
            </h2>

            <p className="text-stone-300 text-sm sm:text-base leading-relaxed font-light">
              Consider responsible disposal if a qualified professional says a device is unsafe or uneconomical to repair, or if parts are no longer available. Reuse or donation may be an option for working devices.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <a
                href="http://www.cea.lk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs sm:text-sm font-medium transition cursor-pointer"
              >
                Official CEA guidance ↗
              </a>

              <a
                href="https://ekunu.lk/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 text-xs sm:text-sm font-semibold transition cursor-pointer"
              >
                Visit e-Kunu ↗
              </a>
            </div>

            <div className="text-[11px] text-emerald-200/70 font-light pt-1">
              Check each organisation's current collection-point information and accepted items before traveling.
            </div>
          </div>

          {/* Right Area: Common categories & Safe handling cards matching screenshot */}
          <div className="lg:col-span-5 space-y-4">
            {/* Common categories */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-2">
              <h3 className="font-semibold text-sm text-emerald-200">
                Common e-waste categories
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-light">
                Laptops, phones, chargers, cables and small electronic accessories. Acceptance varies by collection point.
              </p>
            </div>

            {/* Handle devices safely */}
            <div className="p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xs space-y-2">
              <h3 className="font-semibold text-sm text-amber-200 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-300" />
                Handle devices safely
              </h3>
              <p className="text-xs text-stone-300 leading-relaxed font-light">
                Back up and erase personal data where safe. Do not puncture batteries or put electronics in household rubbish. Ask a qualified handler about damaged or swollen batteries.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Disclaimers & E-Waste Principles */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-stone-600">
        <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2">
          <div className="font-semibold text-stone-800 text-sm">No Household Disposal</div>
          <p className="font-light leading-relaxed">
            Electronic circuit boards contain lead, mercury, and cadmium that leach into Sri Lanka's groundwater when dumped in municipal landfills.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2">
          <div className="font-semibold text-stone-800 text-sm">Data Privacy First</div>
          <p className="font-light leading-relaxed">
            Always perform a full factory reset and sign out of cloud accounts (Google, Apple ID, banking) before handing over any device for recycling.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 space-y-2">
          <div className="font-semibold text-stone-800 text-sm">Educational Scope</div>
          <p className="font-light leading-relaxed">
            RepairFirst LK operates solely as an educational decision support platform and does not physically store, collect, or transport electronic waste.
          </p>
        </div>
      </div>
    </section>
  );
};
