import React, { useState } from 'react';
import {
  Wrench,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Loader2,
  RotateCcw,
  Save,
  HelpCircle,
  Smartphone,
  Laptop
} from 'lucide-react';
import { DeviceCategory, WarrantyStatus, AIAssessmentResponse, AssessmentRecord } from '../types';
import { LAPTOP_BRANDS, SMARTPHONE_BRANDS } from '../lib/demoData';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface AssessmentWizardProps {
  onAssessmentCompleted?: (result: AIAssessmentResponse, deviceData: any) => void;
  onNavigateToCompare?: (assessmentData?: any) => void;
  onNavigateToServices?: () => void;
}

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({
  onAssessmentCompleted,
  onNavigateToCompare,
  onNavigateToServices,
}) => {
  const { currentUser } = useAuth();

  // Step 1: Device basics
  const [deviceType, setDeviceType] = useState<DeviceCategory>('laptop');
  const [brand, setBrand] = useState('Dell');
  const [customBrand, setCustomBrand] = useState('');
  const [model, setModel] = useState('Inspiron 15');
  const [purchaseYear, setPurchaseYear] = useState<number>(2022);
  const [warrantyStatus, setWarrantyStatus] = useState<WarrantyStatus>('out_of_warranty');
  const [notes, setNotes] = useState('');
  const [step1Completed, setStep1Completed] = useState(false);

  // Step 2: Problem description
  const [problemDescription, setProblemDescription] = useState('My laptop gets very hot and switches off after about 20 minutes.');
  const [symptomDuration, setSymptomDuration] = useState('Recently');
  const [symptomFrequency, setSymptomFrequency] = useState('Every time');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 3: Result
  const [aiResult, setAiResult] = useState<AIAssessmentResponse | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const brandOptions = deviceType === 'laptop' ? LAPTOP_BRANDS : SMARTPHONE_BRANDS;
  const currentBrand = brand === 'Other Brand' ? customBrand || 'Custom Brand' : brand;

  const handleExampleChip = (exampleText: string) => {
    setProblemDescription(exampleText);
  };

  const handleContinueToAssessment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!model.trim()) return;
    setStep1Completed(true);
    // Smooth scroll to step 2
    const el = document.getElementById('step-02-assess');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!problemDescription.trim() || problemDescription.trim().length < 5) {
      setErrorMsg('Please describe the problem with at least 5 characters.');
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAiResult(null);
    setIsSaved(false);

    try {
      const response = await fetch('/api/assessments/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceType,
          brand: currentBrand,
          model,
          purchaseYear: Number(purchaseYear),
          warrantyStatus,
          notes,
          problemDescription,
          symptomDuration,
          symptomFrequency,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${response.status}`);
      }

      const data: AIAssessmentResponse = await response.json();
      setAiResult(data);

      if (onAssessmentCompleted) {
        onAssessmentCompleted(data, {
          deviceType,
          brand: currentBrand,
          model,
          purchaseYear,
          warrantyStatus,
        });
      }

      // Scroll to result
      setTimeout(() => {
        const resultEl = document.getElementById('step-03-understand');
        if (resultEl) resultEl.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      console.error('Assessment analysis error:', err);
      setErrorMsg(err.message || 'Failed to complete analysis. Please retry.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveAssessment = async () => {
    if (!currentUser || !aiResult) return;
    setIsSaving(true);
    try {
      const assessmentId = `assess_${Date.now()}`;
      const record: AssessmentRecord = {
        id: assessmentId,
        userId: currentUser.uid,
        deviceSnapshot: {
          deviceType,
          brand: currentBrand,
          model,
          purchaseYear,
          warrantyStatus,
        },
        problemDescription,
        symptomDuration,
        symptomFrequency,
        aiResult,
        createdAt: new Date().toISOString(),
      };

      const docPath = `users/${currentUser.uid}/assessments/${assessmentId}`;
      await setDoc(doc(db, 'users', currentUser.uid, 'assessments', assessmentId), record);
      setIsSaved(true);
    } catch (err) {
      console.error('Failed to save assessment to Firestore:', err);
      handleFirestoreError(err, OperationType.WRITE, `users/${currentUser.uid}/assessments`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-16 py-8">
      {/* STEP 01 - DEVICE */}
      <section id="step-01-device" className="scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-3">
            <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
              STEP 01 · DEVICE
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight">
              Start with the basics.
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed font-light">
              A few details help make the guidance more relevant. Laptops and smartphones are supported for now.
            </p>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleContinueToAssessment} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Device Type */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Device type *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setDeviceType('laptop')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition cursor-pointer ${
                        deviceType === 'laptop'
                          ? 'border-[#234b3d] bg-emerald-50/50 text-[#234b3d]'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Laptop className="w-4 h-4" />
                      Laptop
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeviceType('smartphone')}
                      className={`flex items-center justify-center gap-2 p-2.5 rounded-xl border text-sm font-medium transition cursor-pointer ${
                        deviceType === 'smartphone'
                          ? 'border-[#234b3d] bg-emerald-50/50 text-[#234b3d]'
                          : 'border-stone-200 text-stone-700 hover:bg-stone-50'
                      }`}
                    >
                      <Smartphone className="w-4 h-4" />
                      Smartphone
                    </button>
                  </div>
                </div>

                {/* Brand */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Brand *
                  </label>
                  <select
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 transition"
                  >
                    {brandOptions.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {brand === 'Other Brand' && (
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Custom Brand Name *
                  </label>
                  <input
                    type="text"
                    value={customBrand}
                    onChange={(e) => setCustomBrand(e.target.value)}
                    placeholder="Enter brand name"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {/* Model */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. Inspiron 15 or Galaxy A52"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    required
                  />
                </div>

                {/* Purchase year */}
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1.5">
                    Purchase year *
                  </label>
                  <input
                    type="number"
                    min="2010"
                    max="2027"
                    value={purchaseYear}
                    onChange={(e) => setPurchaseYear(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    required
                  />
                </div>
              </div>

              {/* Warranty Status */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Warranty status *
                </label>
                <select
                  value={warrantyStatus}
                  onChange={(e) => setWarrantyStatus(e.target.value as WarrantyStatus)}
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                >
                  <option value="out_of_warranty">Out of warranty</option>
                  <option value="in_warranty">In warranty (Official or Store warranty)</option>
                  <option value="unknown">Unsure / Unknown</option>
                </select>
              </div>

              {/* Anything else */}
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Anything else? <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Previous repairs or useful context (e.g. replaced battery last year, dropped once)"
                  className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-stone-500">
                  {deviceType === 'laptop' ? 'Laptop' : 'Smartphone'} · {currentBrand} {model}
                </span>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-sm font-medium transition cursor-pointer"
                >
                  Continue to assessment →
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* STEP 02 - ASSESS */}
      <section id="step-02-assess" className="scroll-mt-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-4 space-y-4">
            <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
              STEP 02 · ASSESS
            </div>
            <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight">
              What is your device trying to tell you?
            </h2>
            <p className="text-sm text-stone-600 leading-relaxed font-light">
              Describe what you observe, when it started, and anything that changes the symptom. More detail makes the guidance more useful.
            </p>

            <div className="p-4 rounded-xl bg-amber-50/70 border border-amber-200/80 text-amber-900 text-xs leading-relaxed">
              <span className="font-semibold">Important:</span> This interactive guide uses rule-based & AI guidance. It is not a live physical repair service or a guaranteed hardware diagnosis.
            </div>
          </div>

          <div className="lg:col-span-8 bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8">
            <form onSubmit={handleAnalyze} className="space-y-5">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1.5">
                  Describe the problem *
                </label>
                <textarea
                  rows={4}
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  placeholder="For example: My laptop gets hot and switches off after 20 minutes, or the screen flickers whenever I move the lid."
                  className="w-full px-3.5 py-3 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Example quick chips matching mockup */}
              <div className="space-y-2">
                <div className="text-xs text-stone-500 font-medium">Try an example:</div>
                <div className="flex flex-wrap gap-2">
                  {[
                    'Laptop overheats',
                    'Battery drains quickly',
                    'Screen flickers',
                    'Device will not charge',
                    'Extremely slow & lagging',
                    'Battery appears swollen or puffed',
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => handleExampleChip(chip)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition cursor-pointer ${
                        problemDescription.includes(chip)
                          ? 'border-emerald-700 bg-emerald-50 text-emerald-900 font-medium'
                          : 'border-stone-200 bg-stone-50/70 hover:bg-stone-100 text-stone-700'
                      }`}
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clarifying questions matching mockup */}
              <div className="pt-2">
                <div className="text-xs font-semibold text-stone-700 mb-2">
                  A couple of clarifying questions
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      When did it start?
                    </label>
                    <select
                      value={symptomDuration}
                      onChange={(e) => setSymptomDuration(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    >
                      <option value="Recently">Recently (Within the past few days)</option>
                      <option value="A few weeks ago">A few weeks ago</option>
                      <option value="Several months ago">Several months ago</option>
                      <option value="Right after an update or drop">Right after an update or physical drop</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs text-stone-500 mb-1">
                      How often?
                    </label>
                    <select
                      value={symptomFrequency}
                      onChange={(e) => setSymptomFrequency(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
                    >
                      <option value="Every time">Every time</option>
                      <option value="Intermittently">Intermittently / Sometimes</option>
                      <option value="Only during heavy tasks">Only during gaming or heavy tasks</option>
                      <option value="Only when plugged into power">Only when plugged into power</option>
                    </select>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-stone-400">
                  Step 2 of 3
                </span>
                <button
                  type="submit"
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-sm font-medium shadow-sm transition transform active:scale-98 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Analyzing with Gemini AI...
                    </>
                  ) : (
                    <>
                      Analyse the problem →
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>

      {/* STEP 03 - UNDERSTAND (RESULTS) */}
      <section id="step-03-understand" className="scroll-mt-24">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 pb-3">
            <div>
              <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
                STEP 03 · UNDERSTAND
              </div>
              <h2 className="text-2xl sm:text-3xl font-serif text-stone-900 tracking-tight">
                Your assessment
              </h2>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-stone-100 text-stone-700 text-xs font-semibold uppercase tracking-wider border border-stone-200">
              Guidance, not diagnosis
            </div>
          </div>

          {!aiResult && !isAnalyzing && (
            <div className="p-10 text-center rounded-2xl bg-white border border-stone-200/80 text-stone-500 font-light text-sm">
              Your assessment will appear here after you describe the problem above.
            </div>
          )}

          {isAnalyzing && (
            <div className="p-12 text-center rounded-2xl bg-white border border-stone-200/80 space-y-3">
              <Loader2 className="w-8 h-8 text-emerald-800 animate-spin mx-auto" />
              <div className="font-semibold text-stone-800">Processing device symptoms...</div>
              <div className="text-xs text-stone-500 max-w-md mx-auto">
                Classifying issue, cross-referencing safety precautions, and drafting safe preliminary checks.
              </div>
            </div>
          )}

          {aiResult && (
            <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 sm:p-8 space-y-6">
              {/* Urgent Danger Alert if flagged */}
              {aiResult.dangerWarning && (
                <div className="p-4 sm:p-5 rounded-xl bg-red-50 border border-red-300 text-red-900 space-y-2">
                  <div className="flex items-center gap-2 font-semibold text-base text-red-950">
                    <ShieldAlert className="w-5 h-5 text-red-700" />
                    Hazard Alert: Potential Safety Hazard Detected
                  </div>
                  <p className="text-xs sm:text-sm leading-relaxed text-red-800">
                    {aiResult.dangerDetails || 'This device shows symptoms that require immediate power disconnection and professional handling. Do not attempt to charge, compress, or disassemble.'}
                  </p>
                </div>
              )}

              {/* Header metadata */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900">
                    {aiResult.issueCategory}
                  </span>
                  <span className="font-semibold text-stone-800 text-base">
                    {aiResult.categoryLabel || 'Identified Category'}
                  </span>
                </div>
                <div className="text-xs text-stone-500">
                  Target device: <strong className="text-stone-700">{currentBrand} {model}</strong>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                  Preliminary Summary
                </h4>
                <p className="text-base text-stone-800 leading-relaxed font-light">
                  {aiResult.summary}
                </p>
              </div>

              {/* Grid: Possible Causes & Safe Checks */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                {/* Causes */}
                <div className="p-5 rounded-xl bg-stone-50/70 border border-stone-200/70 space-y-3">
                  <h4 className="text-xs font-semibold text-stone-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-stone-500" />
                    Possible Causes to Investigate
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.possibleCauses.map((cause, i) => (
                      <li key={i} className="text-xs sm:text-sm text-stone-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-stone-400 mt-1.5 shrink-0" />
                        <span>{cause}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Safe Checks */}
                <div className="p-5 rounded-xl bg-emerald-50/40 border border-emerald-200/60 space-y-3">
                  <h4 className="text-xs font-semibold text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
                    Safe Non-Invasive Checks
                  </h4>
                  <ul className="space-y-2">
                    {aiResult.safeChecks.map((check, i) => (
                      <li key={i} className="text-xs sm:text-sm text-stone-700 flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Clarifying Questions */}
              {aiResult.clarifyingQuestions && aiResult.clarifyingQuestions.length > 0 && (
                <div className="p-4 rounded-xl bg-stone-50/50 border border-stone-200/60 space-y-2">
                  <div className="text-xs font-semibold text-stone-600 flex items-center gap-1.5">
                    <HelpCircle className="w-3.5 h-3.5 text-stone-500" />
                    Helpful Questions to Ask Your Technician or Verify in OS
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-stone-700">
                    {aiResult.clarifyingQuestions.map((q, i) => (
                      <li key={i} className="flex items-center gap-1.5">
                        <span className="text-emerald-700">→</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendation Strip & Disclaimer */}
              <div className="pt-2 border-t border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-xs text-stone-500 italic max-w-xl">
                  {aiResult.disclaimer}
                </div>

                {/* Action buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {currentUser ? (
                    <button
                      onClick={handleSaveAssessment}
                      disabled={isSaved || isSaving}
                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border transition cursor-pointer ${
                        isSaved
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-stone-300 hover:bg-stone-50 text-stone-800'
                      }`}
                    >
                      <Save className="w-3.5 h-3.5" />
                      {isSaved ? 'Saved to Profile ✓' : isSaving ? 'Saving...' : 'Save Assessment'}
                    </button>
                  ) : (
                    <span className="text-xs text-stone-400">Sign in to save assessment history</span>
                  )}

                  <button
                    onClick={() => {
                      if (onNavigateToCompare) {
                        onNavigateToCompare({
                          deviceType,
                          brand: currentBrand,
                          model,
                          purchaseYear,
                          warrantyStatus,
                        });
                      }
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium px-4 py-2 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white shadow-2xs transition cursor-pointer"
                  >
                    Compare repair costs ↗
                  </button>

                  <button
                    onClick={onNavigateToServices}
                    className="inline-flex items-center gap-1 text-xs font-medium px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-800 transition cursor-pointer"
                  >
                    Find repair services ↗
                  </button>

                  <button
                    onClick={() => {
                      setAiResult(null);
                      setIsSaved(false);
                      setProblemDescription('');
                      const el = document.getElementById('step-01-device');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium px-3.5 py-2 rounded-xl text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    New Assessment
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
