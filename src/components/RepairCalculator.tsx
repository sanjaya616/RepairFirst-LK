import React, { useState, useEffect } from 'react';
import {
  Scale,
  CheckCircle,
  AlertCircle,
  Save,
  TrendingDown,
  Info,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from 'lucide-react';
import { calculateRepairVsReplacement, CalculationResult } from '../lib/calculations';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { RepairComparison } from '../types';

interface RepairCalculatorProps {
  initialRepairCost?: number;
  initialReplacementPrice?: number;
  onNavigateToServices?: () => void;
  onNavigateToEWaste?: () => void;
}

export const RepairCalculator: React.FC<RepairCalculatorProps> = ({
  initialRepairCost = 18000,
  initialReplacementPrice = 95000,
  onNavigateToServices,
  onNavigateToEWaste,
}) => {
  const { currentUser } = useAuth();

  const [repairCostLKR, setRepairCostLKR] = useState<string>(String(initialRepairCost));
  const [additionalRepairCostLKR, setAdditionalRepairCostLKR] = useState<string>('0');
  const [replacementPriceLKR, setReplacementPriceLKR] = useState<string>(String(initialReplacementPrice));
  const [replacementAdditionalCostLKR, setReplacementAdditionalCostLKR] = useState<string>('0');
  const [deviceAgeYears, setDeviceAgeYears] = useState<string>('3');
  const [warrantyStatus, setWarrantyStatus] = useState<string>('out_of_warranty');
  const [repairWarrantyNotes, setRepairWarrantyNotes] = useState<string>('90-day parts warranty included');

  const [calcResult, setCalcResult] = useState<CalculationResult>(() =>
    calculateRepairVsReplacement({
      repairCostLKR: initialRepairCost,
      additionalRepairCostLKR: 0,
      replacementPriceLKR: initialReplacementPrice,
      replacementAdditionalCostLKR: 0,
      deviceAgeYears: 3,
    })
  );

  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const res = calculateRepairVsReplacement({
      repairCostLKR: Number(repairCostLKR) || 0,
      additionalRepairCostLKR: Number(additionalRepairCostLKR) || 0,
      replacementPriceLKR: Number(replacementPriceLKR) || 0,
      replacementAdditionalCostLKR: Number(replacementAdditionalCostLKR) || 0,
      deviceAgeYears: Number(deviceAgeYears) || 0,
    });
    setCalcResult(res);
    setIsSaved(false);
  }, [
    repairCostLKR,
    additionalRepairCostLKR,
    replacementPriceLKR,
    replacementAdditionalCostLKR,
    deviceAgeYears,
  ]);

  const handleSaveDecision = async () => {
    if (!currentUser || !calcResult.isValid) return;
    setIsSaving(true);
    try {
      const decisionId = `decision_${Date.now()}`;
      const record: RepairComparison = {
        id: decisionId,
        userId: currentUser.uid,
        repairQuotationLKR: Number(repairCostLKR),
        additionalRepairCostLKR: Number(additionalRepairCostLKR),
        totalRepairCostLKR: calcResult.totalRepairCostLKR,
        replacementPriceLKR: Number(replacementPriceLKR),
        replacementAdditionalCostLKR: Number(replacementAdditionalCostLKR),
        repairCostRatio: calcResult.repairCostRatio,
        costDifferenceLKR: calcResult.costDifferenceLKR,
        deviceAgeYears: Number(deviceAgeYears),
        warrantyStatus: warrantyStatus as any,
        repairWarrantyNotes,
        recommendationGuidance: calcResult.bandDescription,
        recommendationBand: calcResult.recommendationBand,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', currentUser.uid, 'decisions', decisionId), record);
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save decision:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/decisions`);
    } finally {
      setIsSaving(false);
    }
  };

  const getRatioColor = (ratio: number) => {
    if (ratio <= 25) return 'text-emerald-700 bg-emerald-100 border-emerald-300';
    if (ratio <= 50) return 'text-teal-700 bg-teal-100 border-teal-300';
    if (ratio <= 70) return 'text-amber-800 bg-amber-100 border-amber-300';
    return 'text-rose-800 bg-rose-100 border-rose-300';
  };

  const getProgressBarColor = (ratio: number) => {
    if (ratio <= 25) return 'bg-emerald-600';
    if (ratio <= 50) return 'bg-teal-600';
    if (ratio <= 70) return 'bg-amber-500';
    return 'bg-rose-600';
  };

  return (
    <section id="step-04-compare" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header matching screenshot */}
      <div className="space-y-2">
        <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
          STEP 04 · COMPARE
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">
          Repair or replace?
        </h2>
        <p className="text-sm text-stone-600 font-light max-w-2xl leading-relaxed">
          Use an actual repair quotation when you have one. A cost ratio is only one part of the decision.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Inputs Card */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Repair quotation (LKR) *
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={repairCostLKR}
                onChange={(e) => setRepairCostLKR(e.target.value)}
                placeholder="e.g. 18000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Replacement price (LKR) *
              </label>
              <input
                type="number"
                min="1"
                step="1000"
                value={replacementPriceLKR}
                onChange={(e) => setReplacementPriceLKR(e.target.value)}
                placeholder="e.g. 95000"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Additional repair costs (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={additionalRepairCostLKR}
                onChange={(e) => setAdditionalRepairCostLKR(e.target.value)}
                placeholder="e.g. 0 (diagnostics/transport)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Replacement accessories/data (LKR)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                value={replacementAdditionalCostLKR}
                onChange={(e) => setReplacementAdditionalCostLKR(e.target.value)}
                placeholder="e.g. 0 (case, data migration)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Device age (years) *
              </label>
              <input
                type="number"
                min="0"
                max="15"
                value={deviceAgeYears}
                onChange={(e) => setDeviceAgeYears(e.target.value)}
                placeholder="e.g. 3"
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Current warranty status
              </label>
              <select
                value={warrantyStatus}
                onChange={(e) => setWarrantyStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              >
                <option value="out_of_warranty">Out of warranty</option>
                <option value="in_warranty">In manufacturer warranty</option>
                <option value="unknown">Unsure</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1">
              Repair warranty offered by technician
            </label>
            <input
              type="text"
              value={repairWarrantyNotes}
              onChange={(e) => setRepairWarrantyNotes(e.target.value)}
              placeholder="e.g. 90-day parts & labor warranty"
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            />
          </div>

          <div className="pt-2 text-xs text-stone-500 font-light leading-relaxed">
            All calculations are performed deterministically in Sri Lankan Rupees (LKR).
          </div>
        </div>

        {/* Right Output / Decision Card */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="space-y-1">
            <div className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider">
              Your Cost Ratio
            </div>

            {!calcResult.isValid ? (
              <div className="p-4 rounded-xl bg-red-50 text-red-800 text-xs">
                {calcResult.errorMessage}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Big Ratio Badge */}
                <div className="flex items-baseline gap-3">
                  <div className="text-4xl sm:text-5xl font-serif text-stone-900 tracking-tight">
                    {calcResult.repairCostRatio}%
                  </div>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${getRatioColor(calcResult.repairCostRatio)}`}>
                    {calcResult.bandTitle}
                  </div>
                </div>

                {/* Visual Ratio Bar */}
                <div className="space-y-1.5">
                  <div className="h-3.5 w-full bg-stone-100 rounded-full overflow-hidden p-0.5 border border-stone-200">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${getProgressBarColor(calcResult.repairCostRatio)}`}
                      style={{ width: `${Math.min(100, Math.max(5, calcResult.repairCostRatio))}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-400 font-mono">
                    <span>0% (Free)</span>
                    <span>25% (Favorable)</span>
                    <span>50% (Reasonable)</span>
                    <span>100% (Equivalent)</span>
                  </div>
                </div>

                {/* Financial Summary Strip */}
                <div className="grid grid-cols-3 gap-2 p-3.5 rounded-xl bg-stone-50/80 border border-stone-200/70 text-center">
                  <div>
                    <div className="text-[10px] text-stone-500 uppercase">Total Repair</div>
                    <div className="font-semibold text-stone-800 text-xs sm:text-sm mt-0.5">
                      LKR {calcResult.totalRepairCostLKR.toLocaleString()}
                    </div>
                  </div>
                  <div className="border-x border-stone-200">
                    <div className="text-[10px] text-stone-500 uppercase">Replacement</div>
                    <div className="font-semibold text-stone-800 text-xs sm:text-sm mt-0.5">
                      LKR {calcResult.replacementPriceLKR.toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-stone-500 uppercase">Capital Preserved</div>
                    <div className="font-semibold text-emerald-800 text-xs sm:text-sm mt-0.5">
                      LKR {Math.max(0, calcResult.costDifferenceLKR).toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Explanation text */}
                <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-light">
                  {calcResult.bandDescription}
                </p>

                {/* Other Decision Factors */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="text-xs font-semibold text-stone-700 uppercase tracking-wider">
                    Other Decision Factors to Consider
                  </div>
                  <ul className="space-y-1.5">
                    {calcResult.keyConsiderations.map((c, idx) => (
                      <li key={idx} className="text-xs text-stone-600 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 mt-1.5 shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Action Controls */}
                <div className="pt-3 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
                  {currentUser ? (
                    <button
                      onClick={handleSaveDecision}
                      disabled={isSaved || isSaving}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-4 py-2.5 rounded-xl border transition cursor-pointer ${
                        isSaved
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-stone-300 hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <Save className="w-4 h-4" />
                      {isSaved ? 'Comparison Saved ✓' : isSaving ? 'Saving...' : 'Save comparison to history'}
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400">Sign in to save this comparison</span>
                  )}

                  <div className="flex items-center gap-2">
                    {calcResult.repairCostRatio > 70 && onNavigateToEWaste && (
                      <button
                        onClick={onNavigateToEWaste}
                        className="inline-flex items-center gap-1 text-xs font-medium px-3.5 py-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 transition cursor-pointer"
                      >
                        Responsible e-waste ↗
                      </button>
                    )}
                    {onNavigateToServices && (
                      <button
                        onClick={onNavigateToServices}
                        className="inline-flex items-center gap-1 text-xs font-medium px-4 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white shadow-2xs transition cursor-pointer"
                      >
                        Find local repairers ↗
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
