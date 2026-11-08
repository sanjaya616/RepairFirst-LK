import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { HowItWorks } from './components/HowItWorks';
import { AssessmentWizard } from './components/AssessmentWizard';
import { MiraChat } from './components/MiraChat';
import { RepairCalculator } from './components/RepairCalculator';
import { ProviderDirectory } from './components/ProviderDirectory';
import { EWasteSection } from './components/EWasteSection';
import { UserDashboard } from './components/UserDashboard';
import { AdminPanel } from './components/AdminPanel';
import { FAQSection } from './components/FAQSection';
import { Footer } from './components/Footer';

function MainApp() {
  const [activeTab, setActiveTab] = useState<string>('home');

  // Prefill states when jumping between sections
  const [calculatorPrefill, setCalculatorPrefill] = useState<{
    repairCost?: number;
    replacementPrice?: number;
  }>({
    repairCost: 18000,
    replacementPrice: 95000,
  });

  const [providerPrefill, setProviderPrefill] = useState<{
    district?: string;
    device?: string;
  }>({
    district: 'All districts',
    device: 'All devices',
  });

  const handleStartAssessment = () => {
    setActiveTab('assessment');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenCompare = (prefill?: { repairCost?: number; replacementPrice?: number }) => {
    if (prefill) {
      setCalculatorPrefill(prefill);
    }
    setActiveTab('compare');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenServices = (district?: string, device?: string) => {
    if (district || device) {
      setProviderPrefill({
        district: district || 'All districts',
        device: device === 'laptop' ? 'Laptops' : device === 'smartphone' ? 'Smartphones' : 'All devices',
      });
    }
    setActiveTab('services');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenEWaste = () => {
    setActiveTab('ewaste');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f2] text-stone-900 font-sans selection:bg-emerald-200 selection:text-emerald-900">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenCompare={() => handleOpenCompare()}
      />

      <main className="flex-1">
        {/* Full Home Landing Page matching Screenshot */}
        {activeTab === 'home' && (
          <>
            <Hero
              onStartAssessment={handleStartAssessment}
              onExploreServices={() => handleOpenServices()}
            />

            <HowItWorks />

            {/* Guided Device & Assessment steps */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <AssessmentWizard
                onNavigateToCompare={(deviceData) => handleOpenCompare()}
                onNavigateToServices={() => handleOpenServices()}
              />
            </div>

            {/* Mira Interactive Chat Companion matching Screenshot 1 */}
            <MiraChat
              onOpenCompare={(prefill) => handleOpenCompare(prefill)}
              onOpenServices={(district, dev) => handleOpenServices(district, dev)}
            />

            {/* Repair vs Replacement Calculator */}
            <RepairCalculator
              initialRepairCost={calculatorPrefill.repairCost}
              initialReplacementPrice={calculatorPrefill.replacementPrice}
              onNavigateToServices={() => handleOpenServices()}
              onNavigateToEWaste={handleOpenEWaste}
            />

            {/* Find a Repair Service */}
            <ProviderDirectory
              initialDistrict={providerPrefill.district}
              initialDevice={providerPrefill.device}
            />

            {/* Responsible E-Waste Guidance */}
            <EWasteSection />

            {/* FAQ Accordion */}
            <FAQSection />
          </>
        )}

        {/* Dedicated Assessment Tab */}
        {activeTab === 'assessment' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AssessmentWizard
              onNavigateToCompare={(deviceData) => handleOpenCompare()}
              onNavigateToServices={() => handleOpenServices()}
            />
            <div className="mt-12">
              <MiraChat
                onOpenCompare={(prefill) => handleOpenCompare(prefill)}
                onOpenServices={(district, dev) => handleOpenServices(district, dev)}
              />
            </div>
          </div>
        )}

        {/* Dedicated Compare Tab */}
        {activeTab === 'compare' && (
          <div className="py-6">
            <RepairCalculator
              initialRepairCost={calculatorPrefill.repairCost}
              initialReplacementPrice={calculatorPrefill.replacementPrice}
              onNavigateToServices={() => handleOpenServices()}
              onNavigateToEWaste={handleOpenEWaste}
            />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <EWasteSection />
            </div>
          </div>
        )}

        {/* Dedicated Services Tab */}
        {activeTab === 'services' && (
          <div className="py-6">
            <ProviderDirectory
              initialDistrict={providerPrefill.district}
              initialDevice={providerPrefill.device}
            />
          </div>
        )}

        {/* Dedicated E-Waste Tab */}
        {activeTab === 'ewaste' && (
          <div className="py-8">
            <EWasteSection />
          </div>
        )}

        {/* User Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <UserDashboard
            onStartNewAssessment={() => setActiveTab('assessment')}
            onNavigateToCompare={() => setActiveTab('compare')}
            onNavigateToServices={() => setActiveTab('services')}
            onNavigateToEWaste={() => setActiveTab('ewaste')}
          />
        )}

        {/* Administrator Panel Tab */}
        {activeTab === 'admin' && <AdminPanel />}
      </main>

      <Footer />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
