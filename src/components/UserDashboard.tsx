import React, { useState, useEffect } from 'react';
import {
  Laptop,
  Smartphone,
  Plus,
  Trash2,
  ExternalLink,
  Calendar,
  Wrench,
  Scale,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Star,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  deleteDoc,
  doc,
  addDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';
import { Device, AssessmentRecord, RepairComparison, PlatformFeedback } from '../types';

interface UserDashboardProps {
  onStartNewAssessment: () => void;
  onNavigateToCompare: () => void;
  onNavigateToServices: () => void;
  onNavigateToEWaste: () => void;
}

export const UserDashboard: React.FC<UserDashboardProps> = ({
  onStartNewAssessment,
  onNavigateToCompare,
  onNavigateToServices,
  onNavigateToEWaste,
}) => {
  const { currentUser, userProfile, signInWithGoogle } = useAuth();

  const [devices, setDevices] = useState<Device[]>([]);
  const [assessments, setAssessments] = useState<AssessmentRecord[]>([]);
  const [decisions, setDecisions] = useState<RepairComparison[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New device modal state
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [newDevType, setNewDevType] = useState<'laptop' | 'smartphone'>('laptop');
  const [newBrand, setNewBrand] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('2023');
  const [newWarranty, setNewWarranty] = useState<'in_warranty' | 'out_of_warranty' | 'unknown'>('out_of_warranty');
  const [newNotes, setNewNotes] = useState('');
  const [isAddingDev, setIsAddingDev] = useState(false);

  // Selected assessment modal
  const [selectedAssessment, setSelectedAssessment] = useState<AssessmentRecord | null>(null);

  // In-app delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'device' | 'assessment' | 'decision';
    id: string;
    label: string;
  } | null>(null);

  // Feedback state
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [feedbackSent, setFeedbackSent] = useState(false);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);

  const fetchUserData = async () => {
    if (!currentUser) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // 1. Fetch user devices
      const devSnap = await getDocs(collection(db, 'users', currentUser.uid, 'devices'));
      const devList: Device[] = [];
      devSnap.forEach((d) => {
        devList.push({ id: d.id, ...d.data() } as Device);
      });
      setDevices(devList);

      // 2. Fetch user assessments
      const assessSnap = await getDocs(collection(db, 'users', currentUser.uid, 'assessments'));
      const assessList: AssessmentRecord[] = [];
      assessSnap.forEach((a) => {
        assessList.push({ id: a.id, ...a.data() } as AssessmentRecord);
      });
      // Sort newest first
      assessList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setAssessments(assessList);

      // 3. Fetch user decisions
      const decSnap = await getDocs(collection(db, 'users', currentUser.uid, 'decisions'));
      const decList: RepairComparison[] = [];
      decSnap.forEach((dc) => {
        decList.push({ id: dc.id, ...dc.data() } as RepairComparison);
      });
      decList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setDecisions(decList);
    } catch (err) {
      console.warn('Could not fetch all user data from Firestore:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, [currentUser]);

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !newBrand.trim() || !newModel.trim()) return;

    setIsAddingDev(true);
    try {
      const devId = `dev_${Date.now()}`;
      const newDev: Device = {
        id: devId,
        userId: currentUser.uid,
        deviceType: newDevType,
        brand: newBrand.trim(),
        model: newModel.trim(),
        purchaseYear: Number(newYear) || 2023,
        warrantyStatus: newWarranty,
        notes: newNotes.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      await setDoc(doc(db, 'users', currentUser.uid, 'devices', devId), newDev);
      setDevices((prev) => [newDev, ...prev]);
      setShowAddDevice(false);
      setNewBrand('');
      setNewModel('');
      setNewNotes('');
    } catch (err) {
      console.error('Failed to create device:', err);
      handleFirestoreError(err, OperationType.CREATE, `users/${currentUser.uid}/devices`);
    } finally {
      setIsAddingDev(false);
    }
  };

  const executeDelete = async () => {
    if (!currentUser || !deleteTarget) return;
    const { type, id } = deleteTarget;
    try {
      if (type === 'device') {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'devices', id));
        setDevices((prev) => prev.filter((d) => d.id !== id));
      } else if (type === 'assessment') {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'assessments', id));
        setAssessments((prev) => prev.filter((a) => a.id !== id));
        if (selectedAssessment?.id === id) setSelectedAssessment(null);
      } else if (type === 'decision') {
        await deleteDoc(doc(db, 'users', currentUser.uid, 'decisions', id));
        setDecisions((prev) => prev.filter((d) => d.id !== id));
      }
    } catch (err) {
      console.error(`Failed to delete ${type}:`, err);
      handleFirestoreError(err, OperationType.DELETE, `users/${currentUser.uid}/${type}s/${id}`);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !comment.trim()) return;

    setIsSendingFeedback(true);
    try {
      const fbId = `fb_${Date.now()}`;
      await setDoc(doc(db, 'feedback', fbId), {
        userId: currentUser.uid,
        userEmail: currentUser.email || '',
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });
      setFeedbackSent(true);
      setComment('');
    } catch (err) {
      console.error('Feedback error:', err);
      handleFirestoreError(err, OperationType.CREATE, 'feedback');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  if (!currentUser) {
    return (
      <div className="py-16 px-4 max-w-4xl mx-auto text-center space-y-6">
        <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-7 h-7" />
        </div>
        <h2 className="text-3xl font-serif text-stone-900">Sign in to your Decision Workspace</h2>
        <p className="text-stone-600 max-w-md mx-auto text-sm leading-relaxed">
          Keep track of your registered laptops and smartphones, save multi-turn AI assessments, and revisit cost comparisons anytime.
        </p>
        <button
          onClick={signInWithGoogle}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white font-medium text-sm transition cursor-pointer"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Welcome Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
            YOUR DECISION WORKSPACE
          </div>
          <h2 className="text-3xl font-serif text-stone-900 tracking-tight">
            Welcome back, {currentUser.displayName || currentUser.email?.split('@')[0]}
          </h2>
          <p className="text-xs text-stone-500 mt-1">
            Authenticated via Firebase Auth · {currentUser.email}
          </p>
        </div>

        <button
          onClick={onStartNewAssessment}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-sm font-medium shadow-2xs transition cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Start new assessment
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <div className="text-xs font-medium text-stone-500 uppercase">My Registered Devices</div>
          <div className="text-3xl font-serif text-stone-900 mt-2">{devices.length}</div>
          <div className="text-xs text-stone-400 mt-1">Smartphones & Laptops</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <div className="text-xs font-medium text-stone-500 uppercase">Completed Assessments</div>
          <div className="text-3xl font-serif text-stone-900 mt-2">{assessments.length}</div>
          <div className="text-xs text-stone-400 mt-1">AI-assisted preliminary evaluations</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs">
          <div className="text-xs font-medium text-stone-500 uppercase">Saved Comparisons</div>
          <div className="text-3xl font-serif text-stone-900 mt-2">{decisions.length}</div>
          <div className="text-xs text-stone-400 mt-1">Deterministic LKR cost calculations</div>
        </div>
      </div>

      {/* Registered Devices Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-serif text-stone-900">My Registered Devices</h3>
            <p className="text-xs text-stone-500">Save your household or business devices to speed up assessments.</p>
          </div>
          <button
            onClick={() => setShowAddDevice(true)}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-xl border border-stone-300 hover:bg-white bg-white/70 text-stone-800 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add device
          </button>
        </div>

        {devices.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-stone-200 text-stone-500 text-xs sm:text-sm">
            No devices registered yet. Click "Add device" above to save your laptop or phone details.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {devices.map((d) => (
              <div
                key={d.id}
                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center">
                      {d.deviceType === 'laptop' ? <Laptop className="w-5 h-5" /> : <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-stone-900 text-sm">{d.brand} {d.model}</h4>
                      <span className="text-xs text-stone-400 capitalize">{d.deviceType} · Year {d.purchaseYear}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setDeleteTarget({ type: 'device', id: d.id, label: `${d.brand} ${d.model}` })}
                    className="p-1.5 text-stone-400 hover:text-red-600 transition cursor-pointer"
                    title="Delete device"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-xs text-stone-500 space-y-1 pt-2 border-t border-stone-100">
                  <div>
                    Warranty: <span className="font-medium text-stone-700 capitalize">{d.warrantyStatus.replace('_', ' ')}</span>
                  </div>
                  {d.notes && <div className="text-stone-400 italic">Notes: {d.notes}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Assessment History Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-serif text-stone-900">Previous Assessments</h3>
          <p className="text-xs text-stone-500">Your saved AI device preliminary checks and suggested next steps.</p>
        </div>

        {assessments.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-stone-200 text-stone-500 text-xs sm:text-sm">
            You haven't saved any device assessments yet. Describe your laptop or phone problem to generate your first assessment!
          </div>
        ) : (
          <div className="space-y-3">
            {assessments.map((a) => (
              <div
                key={a.id}
                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800">
                      {a.aiResult?.issueCategory || 'GENERAL'}
                    </span>
                    <span className="font-semibold text-stone-800 text-sm">
                      {a.deviceSnapshot ? `${a.deviceSnapshot.brand} ${a.deviceSnapshot.model}` : 'Electronic Device'}
                    </span>
                    <span className="text-xs text-stone-400">
                      · {new Date(a.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-600 line-clamp-2 font-light">
                    {a.problemDescription}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedAssessment(a)}
                    className="px-3.5 py-1.5 rounded-xl border border-stone-300 text-stone-800 text-xs font-medium hover:bg-stone-50 transition cursor-pointer"
                  >
                    View Details
                  </button>
                  <button
                    onClick={() => setDeleteTarget({
                      type: 'assessment',
                      id: a.id,
                      label: a.deviceSnapshot ? `${a.deviceSnapshot.brand} ${a.deviceSnapshot.model} assessment` : 'Device assessment',
                    })}
                    className="p-2 text-stone-400 hover:text-red-600 transition cursor-pointer"
                    title="Delete assessment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Saved Comparisons Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-xl font-serif text-stone-900">Saved Repair vs Replacement Comparisons</h3>
          <p className="text-xs text-stone-500">Track quotes from local repair shops against new equipment costs.</p>
        </div>

        {decisions.length === 0 ? (
          <div className="p-8 text-center rounded-2xl bg-white border border-stone-200 text-stone-500 text-xs sm:text-sm">
            No repair quotations compared yet. Use the "Compare" tab to calculate your cost ratio.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {decisions.map((dc) => (
              <div
                key={dc.id}
                className="p-5 rounded-2xl bg-white border border-stone-200/90 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-serif text-stone-900 font-bold">
                      {dc.repairCostRatio}%
                    </span>
                    <button
                      onClick={() => setDeleteTarget({
                        type: 'decision',
                        id: dc.id,
                        label: `comparison of LKR ${dc.totalRepairCostLKR.toLocaleString()}`,
                      })}
                      className="text-stone-400 hover:text-red-600 transition cursor-pointer p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="text-xs font-medium text-stone-800 mt-1">
                    {dc.recommendationGuidance}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-stone-500 pt-2 border-t border-stone-100">
                  <div>
                    Repair: <strong className="text-stone-800">LKR {dc.totalRepairCostLKR.toLocaleString()}</strong>
                  </div>
                  <div>
                    Replace: <strong className="text-stone-800">LKR {dc.replacementPriceLKR.toLocaleString()}</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* User Feedback Form */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white border border-stone-200/90 shadow-sm space-y-4">
        <h3 className="text-xl font-serif text-stone-900">Platform Feedback</h3>
        <p className="text-xs text-stone-500 font-light">
          Help our university research team improve the accuracy and usability of RepairFirst LK.
        </p>

        {feedbackSent ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>Thank you for your valuable feedback! It has been securely saved to the platform.</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitFeedback} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                How helpful was this tool?
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="p-1 cursor-pointer transition hover:scale-110"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        star <= rating ? 'fill-amber-400 text-amber-500' : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-stone-500 ml-2 font-medium">({rating} / 5 stars)</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Your comments or suggestions
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Tell us if the AI guidance was accurate, or if you found a repair shop..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700 resize-none"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSendingFeedback || !comment.trim()}
              className="px-5 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-xs sm:text-sm font-medium transition cursor-pointer disabled:opacity-50"
            >
              {isSendingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </form>
        )}
      </div>

      {/* Add Device Modal */}
      {showAddDevice && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <h3 className="text-xl font-serif text-stone-900">Register a new device</h3>
            <form onSubmit={handleCreateDevice} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Device type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewDevType('laptop')}
                    className={`py-2 rounded-xl border text-xs font-medium ${
                      newDevType === 'laptop' ? 'bg-emerald-50 border-emerald-700 text-emerald-900' : 'border-stone-200'
                    }`}
                  >
                    Laptop
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewDevType('smartphone')}
                    className={`py-2 rounded-xl border text-xs font-medium ${
                      newDevType === 'smartphone' ? 'bg-emerald-50 border-emerald-700 text-emerald-900' : 'border-stone-200'
                    }`}
                  >
                    Smartphone
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Brand *</label>
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="e.g. Dell, Apple, Samsung"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Model *</label>
                <input
                  type="text"
                  value={newModel}
                  onChange={(e) => setNewModel(e.target.value)}
                  placeholder="e.g. XPS 13, iPhone 13"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Purchase Year</label>
                  <input
                    type="number"
                    min="2012"
                    max="2027"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-stone-700 mb-1">Warranty</label>
                  <select
                    value={newWarranty}
                    onChange={(e) => setNewWarranty(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-sm"
                  >
                    <option value="out_of_warranty">Out of warranty</option>
                    <option value="in_warranty">In warranty</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Battery replaced in 2024"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDevice(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingDev}
                  className="px-4 py-2 rounded-xl bg-[#234b3d] text-white text-xs font-medium hover:bg-[#1a382d]"
                >
                  {isAddingDev ? 'Saving...' : 'Save Device'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assessment Detail Modal */}
      {selectedAssessment && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 sm:p-8 space-y-5 shadow-2xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                  {selectedAssessment.aiResult?.issueCategory}
                </span>
                <h3 className="text-xl font-serif text-stone-900 mt-1">
                  {selectedAssessment.deviceSnapshot
                    ? `${selectedAssessment.deviceSnapshot.brand} ${selectedAssessment.deviceSnapshot.model}`
                    : 'Device Assessment'}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAssessment(null)}
                className="text-stone-400 hover:text-stone-800 text-sm font-semibold p-2"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm">
              <div>
                <strong className="text-stone-700">Problem Description:</strong>
                <p className="text-stone-600 mt-1 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-100">
                  {selectedAssessment.problemDescription}
                </p>
              </div>

              <div>
                <strong className="text-stone-700">Preliminary AI Summary:</strong>
                <p className="text-stone-600 mt-1 leading-relaxed">
                  {selectedAssessment.aiResult?.summary}
                </p>
              </div>

              {selectedAssessment.aiResult?.possibleCauses && (
                <div>
                  <strong className="text-stone-700">Possible Causes:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-stone-600">
                    {selectedAssessment.aiResult.possibleCauses.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}

              {selectedAssessment.aiResult?.safeChecks && (
                <div>
                  <strong className="text-emerald-800">Safe Checks:</strong>
                  <ul className="list-disc pl-5 mt-1 space-y-1 text-stone-600">
                    {selectedAssessment.aiResult.safeChecks.map((sc, i) => (
                      <li key={i}>{sc}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-stone-100 flex items-center justify-end">
              <button
                onClick={() => setSelectedAssessment(null)}
                className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 text-xs font-medium hover:bg-stone-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <h3 className="text-lg font-serif text-stone-900">Confirm Deletion</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Are you sure you want to delete <strong>{deleteTarget.label}</strong>? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-medium transition cursor-pointer"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
