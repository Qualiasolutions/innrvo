import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Target,
  Calendar,
  Users,
  BarChart3,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { clearAllMarketingCache } from '../../lib/marketingDataCache';
import type { MarketingTab } from '../../types/marketing';

// View imports
import OverviewDashboard from './views/OverviewDashboard';
import StrategyFoundation from './views/StrategyFoundation';
import SocialMediaView from './views/SocialMediaView';
import InfluencersView from './views/InfluencersView';
import AnalyticsReports from './views/AnalyticsReports';
import CommunicationView from './views/CommunicationView';

const MarketingPage: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<MarketingTab>('overview');
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // Check auth on mount
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/', { replace: true });
    }
  }, [user, authLoading, navigate]);

  // Refresh current tab data
  const handleRefreshData = useCallback(() => {
    clearAllMarketingCache();
    setRefreshKey(prev => prev + 1);
  }, []);

  if (authLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-[#020617] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const tabs: Array<{ id: MarketingTab; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'strategy', label: 'Strategy', icon: Target },
    { id: 'social', label: 'Social', icon: Calendar },
    { id: 'influencers', label: 'Influencers', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'communication', label: 'Messages', icon: MessageSquare },
  ];

  return (
    <AppLayout showBackButton backTo="/">
      <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-8 pt-16 sm:pt-20 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex items-start justify-between">
          <div>
            <div className="inline-block px-3 sm:px-4 py-1 rounded-full bg-cyan-500/10 text-cyan-400 text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.3em] sm:tracking-[0.4em] mb-3 sm:mb-4">
              Marketing Hub
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-1 sm:mb-2">
              INrVO Marketing Portal
            </h1>
            <p className="text-slate-400 text-sm sm:text-base">
              January - March 2026 Engagement
            </p>
          </div>
          <button
            onClick={handleRefreshData}
            className="flex items-center gap-2 px-3 py-2 bg-white/[0.02] text-slate-400 rounded-lg hover:bg-white/[0.04] hover:text-white border border-white/[0.06] transition-colors"
            title="Refresh data"
          >
            <RefreshCw className="w-4 h-4" />
            <span className="hidden sm:inline text-sm">Refresh</span>
          </button>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-400 text-sm flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-6 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0">
          {tabs.map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-xl font-medium transition-all whitespace-nowrap text-sm
                  ${activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/[0.02] text-slate-400 hover:bg-white/[0.04] hover:text-white border border-white/[0.06]'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden xs:inline sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div key={refreshKey}>
          {activeTab === 'overview' && <OverviewDashboard />}
          {activeTab === 'strategy' && <StrategyFoundation />}
          {activeTab === 'social' && <SocialMediaView />}
          {activeTab === 'influencers' && <InfluencersView />}
          {activeTab === 'analytics' && <AnalyticsReports />}
          {activeTab === 'communication' && <CommunicationView />}
        </div>
      </div>
    </AppLayout>
  );
};

export default MarketingPage;
