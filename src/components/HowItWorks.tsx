import React from 'react';

export const HowItWorks: React.FC = () => {
  const steps = [
    {
      num: '01 / UNDERSTAND',
      title: 'Tell us what happened',
      desc: 'Describe your laptop or smartphone and the symptoms you notice in ordinary everyday language.',
    },
    {
      num: '02 / COMPARE',
      title: 'Weigh your options',
      desc: 'Explore safe checks, itemized repair costs and realistic replacement considerations.',
    },
    {
      num: '03 / ACT',
      title: 'Choose a next step',
      desc: 'Contact a repairer in your district or look into certified responsible e-waste options.',
    },
  ];

  return (
    <section className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-stone-200/80">
      <div className="space-y-2 mb-8">
        <div className="text-xs font-semibold text-stone-500 tracking-wider uppercase">
          The simple path forward
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight">
          Repair starts with understanding.
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {steps.map((s, idx) => (
          <div
            key={idx}
            className="p-6 rounded-2xl bg-white border border-stone-200/90 shadow-xs hover:border-stone-300 transition"
          >
            <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider mb-3">
              {s.num}
            </div>
            <h3 className="text-lg font-semibold text-stone-900 mb-2">
              {s.title}
            </h3>
            <p className="text-sm text-stone-600 leading-relaxed font-light">
              {s.desc}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
};
