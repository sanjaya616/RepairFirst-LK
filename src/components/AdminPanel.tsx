import React, { useState, useEffect } from 'react';
import {
  Shield,
  Plus,
  Trash2,
  CheckCircle,
  XCircle,
  Edit2,
  AlertTriangle,
  RefreshCw,
  Search,
  MessageSquare,
  Sparkles,
  Laptop,
  Smartphone
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { RepairProvider, PlatformFeedback } from '../types';
import { SRI_LANKA_DISTRICTS } from '../lib/demoData';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, getDocs, doc, deleteDoc } from 'firebase/firestore';

export const AdminPanel: React.FC = () => {
  const { currentUser, isAdmin, getIdToken } = useAuth();

  const [providers, setProviders] = useState<RepairProvider[]>([]);
  const [feedbackList, setFeedbackList] = useState<PlatformFeedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryStats, setSummaryStats] = useState<any>(null);

  // Add/Edit provider modal
  const [editingProvider, setEditingProvider] = useState<RepairProvider | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [pName, setPName] = useState('');
  const [pDistrict, setPDistrict] = useState('Colombo');
  const [pTown, setPTown] = useState('');
  const [pAddress, setPAddress] = useState('');
  const [pContact, setPContact] = useState('');
  const [pWebsite, setPWebsite] = useState('');
  const [pLaptop, setPLaptop] = useState(true);
  const [pPhone, setPPhone] = useState(true);
  const [pServices, setPServices] = useState('General diagnostics, Screen repair');
  const [pIsDemo, setPIsDemo] = useState(false);
  const [pStatus, setPStatus] = useState<'verified' | 'unverified' | 'disabled'>('unverified');
  const [isSaving, setIsSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteProviderTarget, setDeleteProviderTarget] = useState<{ id: string; name: string } | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setActionError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'x-admin-email': currentUser?.email || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      // 1. Fetch summary stats from API
      const statsRes = await fetch('/api/admin/summary', { headers });
      if (statsRes.ok) {
        const stats = await statsRes.json();
        setSummaryStats(stats);
      }

      // 2. Fetch providers list
      const provRes = await fetch('/api/providers');
      if (provRes.ok) {
        const pData = await provRes.json();
        setProviders(pData.providers || []);
      }

      // 3. Fetch feedback from Firestore
      try {
        const fbSnap = await getDocs(collection(db, 'feedback'));
        const fbs: PlatformFeedback[] = [];
        fbSnap.forEach((doc) => {
          fbs.push({ id: doc.id, ...doc.data() } as PlatformFeedback);
        });
        fbs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setFeedbackList(fbs);
      } catch (fbErr) {
        console.warn('Feedback collection fetch notice:', fbErr);
      }
    } catch (err: any) {
      console.error('Admin data fetch error:', err);
      setActionError(err.message || 'Failed to load administrative data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) {
      fetchAdminData();
    }
  }, [isAdmin]);

  const handleOpenAddModal = () => {
    setEditingProvider(null);
    setPName('');
    setPDistrict('Colombo');
    setPTown('');
    setPAddress('');
    setPContact('');
    setPWebsite('');
    setPLaptop(true);
    setPPhone(true);
    setPServices('General diagnostics, Screen replacement, Battery health');
    setPIsDemo(false);
    setPStatus('unverified');
    setShowModal(true);
  };

  const handleOpenEditModal = (provider: RepairProvider) => {
    setEditingProvider(provider);
    setPName(provider.name);
    setPDistrict(provider.district);
    setPTown(provider.town);
    setPAddress(provider.address);
    setPContact(provider.contact);
    setPWebsite(provider.website || '');
    setPLaptop(provider.deviceCategories.includes('laptop'));
    setPPhone(provider.deviceCategories.includes('smartphone'));
    setPServices(provider.services.join(', '));
    setPIsDemo(provider.isDemo);
    setPStatus(provider.verificationStatus);
    setShowModal(true);
  };

  const handleSaveProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pName.trim() || !pTown.trim()) return;

    setIsSaving(true);
    setActionError(null);
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': currentUser?.email || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const categories: ('laptop' | 'smartphone')[] = [];
      if (pLaptop) categories.push('laptop');
      if (pPhone) categories.push('smartphone');

      const servicesArray = pServices
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        name: pName.trim(),
        district: pDistrict,
        town: pTown.trim(),
        address: pAddress.trim() || `${pTown}, ${pDistrict}, Sri Lanka`,
        contact: pContact.trim(),
        website: pWebsite.trim(),
        deviceCategories: categories.length > 0 ? categories : ['laptop', 'smartphone'],
        services: servicesArray.length > 0 ? servicesArray : ['General diagnostics'],
        isDemo: pIsDemo,
        verificationStatus: pStatus,
      };

      if (editingProvider) {
        // Update
        const res = await fetch(`/api/admin/providers/${editingProvider.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to update provider record.');
      } else {
        // Create
        const res = await fetch('/api/admin/providers', {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Failed to create provider record.');
      }

      setShowModal(false);
      fetchAdminData();
    } catch (err: any) {
      setActionError(err.message || 'Operation failed.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDeleteProvider = async () => {
    if (!deleteProviderTarget) return;
    const { id } = deleteProviderTarget;
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'x-admin-email': currentUser?.email || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/admin/providers/${id}`, {
        method: 'DELETE',
        headers,
      });
      if (res.ok) {
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleteProviderTarget(null);
    }
  };

  const handleToggleVerification = async (provider: RepairProvider) => {
    const nextStatus = provider.verificationStatus === 'verified' ? 'unverified' : 'verified';
    try {
      const token = await getIdToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-admin-email': currentUser?.email || '',
      };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`/api/admin/providers/${provider.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ verificationStatus: nextStatus }),
      });
      fetchAdminData();
    } catch (err) {
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div className="py-16 px-4 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center mx-auto">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-serif text-stone-900">Administrator Access Protected</h2>
        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
          This portal is restricted to authorized platform administrators. Access is verified server-side using the administrator allowlist.
        </p>
        <p className="text-xs text-stone-400">
          Current account: {currentUser?.email || 'Not logged in'}
        </p>
      </div>
    );
  }

  return (
    <div className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
      {/* Admin Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-stone-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-900 text-xs font-semibold uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            Verified Administrator Portal
          </div>
          <h2 className="text-3xl font-serif text-stone-900 tracking-tight mt-1">
            Platform Administration
          </h2>
          <p className="text-xs text-stone-500">
            Signed in as {currentUser?.email} · Real-time provider directory & feedback controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchAdminData}
            className="p-2.5 rounded-xl border border-stone-300 hover:bg-stone-50 text-stone-700 transition cursor-pointer"
            title="Refresh records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#234b3d] hover:bg-[#1a382d] text-white text-xs sm:text-sm font-medium shadow-2xs transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add New Provider
          </button>
        </div>
      </div>

      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-stone-500">Total Directory Listings</div>
          <div className="text-3xl font-serif text-stone-900 mt-1">
            {summaryStats?.totalProviders ?? providers.length}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">Active providers</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-emerald-700">Verified Providers</div>
          <div className="text-3xl font-serif text-emerald-900 mt-1">
            {providers.filter((p) => p.verificationStatus === 'verified').length}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">Independently verified</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-amber-700">Demonstration Listings</div>
          <div className="text-3xl font-serif text-amber-900 mt-1">
            {providers.filter((p) => p.isDemo).length}
          </div>
          <div className="text-xs text-stone-400 mt-0.5">Clearly flagged demo data</div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-stone-200 shadow-xs">
          <div className="text-[10px] uppercase font-semibold text-stone-500">User Feedback Submissions</div>
          <div className="text-3xl font-serif text-stone-900 mt-1">{feedbackList.length}</div>
          <div className="text-xs text-stone-400 mt-0.5">Collected in Firestore</div>
        </div>
      </div>

      {/* Provider Management Table */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-stone-900 text-base">Repair Providers Directory</h3>
            <p className="text-xs text-stone-500">Verify, edit, or toggle demo tags on listings across Sri Lankan districts.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-stone-700">
            <thead className="bg-stone-50 border-b border-stone-200 text-stone-500 uppercase text-[10px] font-semibold">
              <tr>
                <th className="py-3 px-4">Provider Name & District</th>
                <th className="py-3 px-4">Devices</th>
                <th className="py-3 px-4">Services</th>
                <th className="py-3 px-4">Verification</th>
                <th className="py-3 px-4">Demo Flag</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {providers.map((p) => (
                <tr key={p.id} className="hover:bg-stone-50/50 transition">
                  <td className="py-3.5 px-4 font-medium text-stone-900">
                    <div>{p.name}</div>
                    <div className="text-[11px] text-stone-400 font-normal">
                      {p.town}, {p.district} · {p.contact}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex gap-1">
                      {p.deviceCategories.map((c) => (
                        <span key={c} className="px-2 py-0.5 rounded bg-stone-100 text-stone-600 text-[10px] capitalize">
                          {c}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 max-w-xs truncate text-stone-600">
                    {p.services.join(', ')}
                  </td>
                  <td className="py-3.5 px-4">
                    <button
                      onClick={() => handleToggleVerification(p)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border cursor-pointer ${
                        p.verificationStatus === 'verified'
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-amber-300 bg-amber-50 text-amber-800'
                      }`}
                    >
                      {p.verificationStatus === 'verified' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                      {p.verificationStatus}
                    </button>
                  </td>
                  <td className="py-3.5 px-4">
                    {p.isDemo ? (
                      <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-medium text-[10px]">
                        DEMO DATA
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 font-medium text-[10px]">
                        COMMUNITY
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1">
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 text-stone-500 hover:text-stone-900 transition cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteProviderTarget({ id: p.id, name: p.name })}
                      className="p-1.5 text-stone-400 hover:text-red-600 transition cursor-pointer"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* User Feedback Submissions */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 space-y-4">
        <div>
          <h3 className="font-semibold text-stone-900 text-base">User Feedback & Assessment Accuracy Reports</h3>
          <p className="text-xs text-stone-500">Collected from university students and community testers.</p>
        </div>

        {feedbackList.length === 0 ? (
          <div className="p-6 text-center text-xs text-stone-400">
            No feedback submissions collected yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {feedbackList.map((fb) => (
              <div key={fb.id} className="p-4 rounded-xl bg-stone-50 border border-stone-200/70 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 font-semibold text-amber-600">
                    {'★'.repeat(fb.rating)}{'☆'.repeat(5 - fb.rating)}
                    <span className="text-stone-500 font-normal ml-1">({fb.rating}/5)</span>
                  </div>
                  <span className="text-[10px] text-stone-400">
                    {new Date(fb.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-stone-700 leading-relaxed font-light">{fb.comment}</p>
                <div className="text-[10px] text-stone-400 truncate">
                  User: {fb.userEmail || fb.userId}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add / Edit Provider Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif text-stone-900">
              {editingProvider ? 'Edit Provider' : 'Add New Repair Provider'}
            </h3>

            <form onSubmit={handleSaveProvider} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-stone-700 mb-1">Provider Name *</label>
                <input
                  type="text"
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="e.g. QuickFix Laptop Solutions"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-800"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">District *</label>
                  <select
                    value={pDistrict}
                    onChange={(e) => setPDistrict(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    {SRI_LANKA_DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Town / Area *</label>
                  <input
                    type="text"
                    value={pTown}
                    onChange={(e) => setPTown(e.target.value)}
                    placeholder="e.g. Maharagama"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Full Address</label>
                <input
                  type="text"
                  value={pAddress}
                  onChange={(e) => setPAddress(e.target.value)}
                  placeholder="e.g. High Level Rd, Maharagama, Sri Lanka"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={pContact}
                    onChange={(e) => setPContact(e.target.value)}
                    placeholder="+94 11 234 5678"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                </div>
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Website URL</label>
                  <input
                    type="text"
                    value={pWebsite}
                    onChange={(e) => setPWebsite(e.target.value)}
                    placeholder="https://..."
                    className="w-full px-3 py-2 rounded-xl border border-stone-300"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">Supported Devices</label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={pLaptop}
                      onChange={(e) => setPLaptop(e.target.checked)}
                      className="rounded text-emerald-700"
                    />
                    <span>Laptops</span>
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input
                      type="checkbox"
                      checked={pPhone}
                      onChange={(e) => setPPhone(e.target.checked)}
                      className="rounded text-emerald-700"
                    />
                    <span>Smartphones</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block font-medium text-stone-700 mb-1">
                  Services (comma separated)
                </label>
                <input
                  type="text"
                  value={pServices}
                  onChange={(e) => setPServices(e.target.value)}
                  placeholder="Screen repair, Battery service, Diagnostics"
                  className="w-full px-3 py-2 rounded-xl border border-stone-300"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-stone-700 mb-1">Status</label>
                  <select
                    value={pStatus}
                    onChange={(e) => setPStatus(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white"
                  >
                    <option value="unverified">Unverified</option>
                    <option value="verified">Verified</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-stone-700 mb-1">Demonstration Data</label>
                  <label className="flex items-center gap-2 mt-2">
                    <input
                      type="checkbox"
                      checked={pIsDemo}
                      onChange={(e) => setPIsDemo(e.target.checked)}
                      className="rounded text-amber-600"
                    />
                    <span className="text-stone-700">Flag as Demo Provider</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-[#234b3d] text-white hover:bg-[#1a382d] font-medium"
                >
                  {isSaving ? 'Saving...' : 'Save Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Provider Deletion */}
      {deleteProviderTarget && (
        <div className="fixed inset-0 z-50 bg-stone-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-stone-200">
            <h3 className="text-lg font-serif text-stone-900">Delete Provider Listing</h3>
            <p className="text-xs text-stone-600 leading-relaxed font-light">
              Are you sure you want to delete listing <strong>{deleteProviderTarget.name}</strong>? This listing will be removed from the directory.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteProviderTarget(null)}
                className="px-4 py-2 rounded-xl border border-stone-300 text-xs font-medium text-stone-700 hover:bg-stone-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProvider}
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
