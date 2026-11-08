import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Phone,
  Globe,
  Search,
  Filter,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Laptop,
  Smartphone,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { RepairProvider, DeviceCategory } from '../types';
import { SRI_LANKA_DISTRICTS } from '../lib/demoData';

interface ProviderDirectoryProps {
  initialDistrict?: string;
  initialDevice?: string;
}

export const ProviderDirectory: React.FC<ProviderDirectoryProps> = ({
  initialDistrict = 'All districts',
  initialDevice = 'All devices',
}) => {
  const [providers, setProviders] = useState<RepairProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState(initialDistrict);
  const [deviceFilter, setDeviceFilter] = useState(initialDevice);
  const [categoryFilter, setCategoryFilter] = useState('All categories');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchProviders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (districtFilter && districtFilter !== 'All districts') {
        params.append('district', districtFilter);
      }
      if (deviceFilter && deviceFilter !== 'All devices') {
        params.append('device', deviceFilter === 'Laptops' ? 'laptop' : 'smartphone');
      }
      if (categoryFilter && categoryFilter !== 'All categories') {
        params.append('category', categoryFilter);
      }

      const res = await fetch(`/api/providers?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProviders(data.providers || []);
      }
    } catch (err) {
      console.error('Failed to load providers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [districtFilter, deviceFilter, categoryFilter]);

  const filteredProviders = providers.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.town.toLowerCase().includes(q) ||
      p.district.toLowerCase().includes(q) ||
      p.services.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <section id="step-05-find-help" className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
      {/* Header matching screenshot */}
      <div className="space-y-2">
        <div className="text-xs font-mono font-semibold text-emerald-800 tracking-wider">
          STEP 05 · FIND HELP
        </div>
        <h2 className="text-3xl sm:text-4xl font-serif text-stone-900 tracking-tight">
          Find a repair service.
        </h2>
        <p className="text-sm text-stone-600 font-light max-w-3xl leading-relaxed">
          The listings below are illustrative examples or community records, not verified live businesses. Confirm contact details, credentials, quotation and warranty independently before visiting.
        </p>
      </div>

      {/* Filter bar matching screenshot */}
      <div className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-4 sm:p-5 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {/* District */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">District</label>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="All districts">All districts</option>
              {SRI_LANKA_DISTRICTS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Device */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Device</label>
            <select
              value={deviceFilter}
              onChange={(e) => setDeviceFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="All devices">All devices</option>
              <option value="Laptops">Laptops</option>
              <option value="Smartphones">Smartphones</option>
            </select>
          </div>

          {/* Repair Category */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Repair category</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
            >
              <option value="All categories">All categories</option>
              <option value="Screen">Screen & display</option>
              <option value="Battery">Battery & power</option>
              <option value="Cooling">Cooling & overheating</option>
              <option value="Motherboard">Motherboard & diagnostics</option>
            </select>
          </div>

          {/* Search keyword */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Search text</label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Town or service..."
                className="w-full pl-8 pr-3 py-2 rounded-xl border border-stone-300 text-stone-800 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-700/20 focus:border-emerald-700"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-stone-500 pt-1">
          <span>{filteredProviders.length} listings shown</span>
          <span className="font-light">Tip: Request an itemized diagnostic quote prior to authorizing repair</span>
        </div>
      </div>

      {/* Provider cards grid matching screenshot */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProviders.map((p) => {
          const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${p.name} ${p.address}`)}`;
          const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(`${p.name} Sri Lanka repair reviews`)}`;

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-stone-200/90 shadow-sm p-6 flex flex-col justify-between space-y-4 hover:border-stone-300 transition"
            >
              <div className="space-y-3">
                {/* Title */}
                <h3 className="font-semibold text-stone-900 text-base leading-snug">
                  {p.name}
                </h3>

                {/* Categories & Service pills */}
                <div className="flex flex-wrap gap-1.5">
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
                    {p.deviceCategories.map((c) => (c === 'laptop' ? 'Laptop' : 'Smartphone')).join(' / ')}
                  </span>
                  <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800">
                    {p.services[0]}
                  </span>
                </div>

                {/* Address Area */}
                <div className="text-xs text-stone-600 flex items-start gap-1.5 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0 mt-0.5" />
                  <span>Address area: {p.address}</span>
                </div>

                {/* Verification Notice matching screenshot */}
                <div className="text-xs text-stone-500 space-y-1 pt-1 border-t border-stone-100">
                  <div className="flex items-center gap-1.5">
                    {p.verificationStatus === 'verified' ? (
                      <span className="text-emerald-700 font-medium flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Verified provider
                      </span>
                    ) : (
                      <span className="text-amber-800 font-medium flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Verification: not verified
                      </span>
                    )}
                    <span className="text-stone-400">·</span>
                    <span>
                      {p.verifiedAt ? `Verified: ${new Date(p.verifiedAt).toLocaleDateString()}` : 'Verification date: not available'}
                    </span>
                  </div>

                  {p.isDemo && (
                    <div className="p-2 rounded-lg bg-stone-50 border border-stone-200/80 text-[11px] text-stone-500">
                      <strong>DEMO DATA:</strong> Illustrative contact number; confirm a real provider before calling.
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom action links matching screenshot */}
              <div className="pt-3 border-t border-stone-100 flex items-center gap-4 text-xs font-medium text-stone-700">
                <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  Map ↗
                </a>
                <a
                  href={p.website || searchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-800 flex items-center gap-1 transition"
                >
                  Website / search ↗
                </a>
                <a
                  href={`tel:${p.contact}`}
                  className="hover:text-emerald-800 flex items-center gap-1 transition text-stone-500"
                >
                  Sample phone
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {filteredProviders.length === 0 && !loading && (
        <div className="p-10 text-center rounded-2xl bg-white border border-stone-200 text-stone-500 text-sm">
          No repair listings match the selected filters. Try broadening your district or category search.
        </div>
      )}
    </section>
  );
};
