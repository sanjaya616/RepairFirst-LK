import React, { useState } from 'react';
import { RefreshCw, Wrench, Shield, User as UserIcon, LogOut, ExternalLink, Menu, X, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCompare: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab, onOpenCompare }) => {
  const { currentUser, userProfile, isAdmin, signInWithGoogle, signOutUser } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignIn = async () => {
    try {
      setIsSigningIn(true);
      await signInWithGoogle();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const navItems = [
    { id: 'home', label: 'How it works' },
    { id: 'assessment', label: 'Assessment' },
    { id: 'compare', label: 'Compare' },
    { id: 'services', label: 'Services' },
    { id: 'ewaste', label: 'E-waste' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-[#f7f7f2]/90 backdrop-blur-md border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-18">
          {/* Brand Logo */}
          <button
            onClick={() => {
              setActiveTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="flex items-center gap-3 text-left group transition cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-[#234b3d] text-white flex items-center justify-center shadow-sm group-hover:bg-[#1a382d] transition">
              <RefreshCw className="w-5 h-5 text-emerald-300 transition-transform group-hover:rotate-45" />
            </div>
            <div>
              <div className="font-semibold text-lg text-stone-900 tracking-tight leading-none">
                RepairFirst LK
              </div>
              <div className="text-xs text-stone-500 mt-1">
                Understand before you replace
              </div>
            </div>
          </button>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'home') {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition cursor-pointer ${
                  activeTab === item.id
                    ? 'text-stone-900 bg-stone-200/70 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                {item.label}
              </button>
            ))}

            {currentUser && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'text-stone-900 bg-stone-200/70 font-semibold'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-200/40'
                }`}
              >
                Dashboard
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition cursor-pointer ${
                  activeTab === 'admin'
                    ? 'text-emerald-950 bg-emerald-100/90 font-semibold border border-emerald-300'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                Admin
              </button>
            )}
          </nav>

          {/* Right Controls: Compare CTA & Auth */}
          <div className="hidden sm:flex items-center gap-3">
            <button
              onClick={onOpenCompare}
              className="inline-flex items-center gap-1.5 text-xs lg:text-sm font-medium px-3.5 py-2 rounded-xl border border-stone-300 hover:border-stone-400 bg-white/70 hover:bg-white text-stone-800 shadow-2xs transition cursor-pointer"
            >
              Compare repair costs ↗
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 pl-2 border-l border-stone-300">
                <button
                  onClick={() => setActiveTab('dashboard')}
                  className="flex items-center gap-2 p-1.5 pr-2.5 rounded-lg hover:bg-stone-200/50 transition cursor-pointer"
                  title="View user dashboard"
                >
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-7 h-7 rounded-full object-cover border border-stone-300"
                    />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-semibold text-xs">
                      {(currentUser.displayName || currentUser.email || 'U')[0].toUpperCase()}
                    </div>
                  )}
                  <span className="text-xs font-medium text-stone-700 max-w-[100px] truncate">
                    {currentUser.displayName || currentUser.email?.split('@')[0]}
                  </span>
                </button>
                <button
                  onClick={signOutUser}
                  className="p-1.5 rounded-lg text-stone-500 hover:text-stone-800 hover:bg-stone-200/60 transition cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="inline-flex items-center gap-1.5 text-xs lg:text-sm font-medium px-4 py-2 rounded-xl bg-[#234b3d] text-white hover:bg-[#1a382d] shadow-2xs transition cursor-pointer disabled:opacity-50"
              >
                <UserIcon className="w-4 h-4" />
                {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
              </button>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-2">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-stone-700 hover:bg-stone-200/60 transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 bg-[#f7f7f2] border-b border-stone-200 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setMobileMenuOpen(false);
              }}
              className={`block w-full text-left px-3 py-2 text-base font-medium rounded-lg ${
                activeTab === item.id ? 'bg-stone-200 font-semibold text-stone-900' : 'text-stone-700'
              }`}
            >
              {item.label}
            </button>
          ))}

          {currentUser && (
            <button
              onClick={() => {
                setActiveTab('dashboard');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-base font-medium rounded-lg text-stone-700"
            >
              My Dashboard
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => {
                setActiveTab('admin');
                setMobileMenuOpen(false);
              }}
              className="block w-full text-left px-3 py-2 text-base font-medium rounded-lg text-emerald-800 bg-emerald-50"
            >
              Admin Dashboard
            </button>
          )}

          <div className="pt-4 border-t border-stone-200 flex flex-col gap-2">
            <button
              onClick={() => {
                onOpenCompare();
                setMobileMenuOpen(false);
              }}
              className="w-full text-center px-4 py-2.5 rounded-xl border border-stone-300 font-medium text-sm text-stone-800 bg-white"
            >
              Compare repair costs ↗
            </button>
            {currentUser ? (
              <button
                onClick={() => {
                  signOutUser();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center px-4 py-2.5 rounded-xl border border-red-200 font-medium text-sm text-red-700 bg-red-50"
              >
                Sign out ({currentUser.email})
              </button>
            ) : (
              <button
                onClick={() => {
                  handleSignIn();
                  setMobileMenuOpen(false);
                }}
                className="w-full text-center px-4 py-2.5 rounded-xl bg-[#234b3d] text-white font-medium text-sm"
              >
                Sign in with Google
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
