import React from 'react';
import { motion } from 'framer-motion';
import { Target, Calendar, Users, BarChart3, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import GlassCard from '../../../../components/GlassCard';
import ProgressRing from '../components/ProgressRing';
import StatusBadge from '../components/StatusBadge';
import { useMarketingDashboard, useDeliverables } from '../../../hooks/useMarketingData';
import type { CategoryProgress, MarketingDeliverable } from '../../../types/marketing';

const categoryIcons: Record<string, React.ElementType> = {
  strategy: Target,
  social: Calendar,
  influencer: Users,
  analytics: BarChart3,
};

const categoryLabels: Record<string, string> = {
  strategy: 'Strategy & Brand',
  social: 'Social Media',
  influencer: 'Influencers',
  analytics: 'Analytics',
};

const OverviewDashboard: React.FC = () => {
  const { stats, categoryProgress, isLoading: statsLoading } = useMarketingDashboard();
  const { deliverables, isLoading: deliverablesLoading } = useDeliverables();

  const isLoading = statsLoading || deliverablesLoading;

  // Calculate overall progress
  const overallProgress = categoryProgress.length > 0
    ? Math.round(categoryProgress.reduce((sum, c) => sum + c.progress, 0) / categoryProgress.length)
    : 0;

  // Get upcoming deadlines (next 5)
  const upcomingDeadlines = deliverables
    .filter(d => d.due_date && d.status !== 'completed')
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Get items pending client action
  const pendingApproval = deliverables.filter(d => d.status === 'pending_review');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-cyan-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Progress */}
      <GlassCard className="!p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <ProgressRing progress={overallProgress} size={140} label="Overall" />
          <div className="flex-1 text-center md:text-left">
            <h2 className="text-xl font-bold text-white mb-2">Project Progress</h2>
            <p className="text-slate-400 mb-4">
              {stats?.completedDeliverables || 0} of {stats?.totalDeliverables || 0} deliverables completed
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="text-slate-400">{stats?.completedDeliverables || 0} Completed</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                <span className="text-slate-400">{stats?.inProgressDeliverables || 0} In Progress</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                <span className="text-slate-400">{stats?.pendingReviewDeliverables || 0} Pending Review</span>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Category Progress Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {categoryProgress.map((cat, index) => {
          const Icon = categoryIcons[cat.category] || Target;
          return (
            <motion.div
              key={cat.category}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <GlassCard className="!p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-cyan-500/10">
                    <Icon className="w-5 h-5 text-cyan-400" />
                  </div>
                  <span className="text-sm font-medium text-white">{categoryLabels[cat.category]}</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-500 to-teal-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${cat.progress}%` }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                  />
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{cat.completed} of {cat.total} done</span>
                  <span className="text-cyan-400">{cat.progress}%</span>
                </div>
              </GlassCard>
            </motion.div>
          );
        })}
      </div>

      {/* Two Column Layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <GlassCard className="!p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Upcoming Deadlines</h3>
          </div>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-slate-400 text-sm">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((item) => {
                const dueDate = new Date(item.due_date!);
                const today = new Date();
                const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                const isOverdue = daysUntil < 0;
                const isUrgent = daysUntil <= 3 && daysUntil >= 0;

                return (
                  <div
                    key={item.id}
                    className={`p-3 rounded-lg border ${
                      isOverdue
                        ? 'bg-red-500/10 border-red-500/20'
                        : isUrgent
                        ? 'bg-amber-500/10 border-amber-500/20'
                        : 'bg-white/[0.02] border-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-medium text-white">{item.title}</p>
                        <p className="text-xs text-slate-400 mt-0.5">{categoryLabels[item.category]}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-medium ${
                          isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-400'
                        }`}>
                          {dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </p>
                        <p className={`text-xs ${
                          isOverdue ? 'text-red-400' : isUrgent ? 'text-amber-400' : 'text-slate-500'
                        }`}>
                          {isOverdue ? `${Math.abs(daysUntil)} days overdue` : `${daysUntil} days`}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Client Action Required */}
        <GlassCard className="!p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-semibold text-white">Action Required</h3>
          </div>
          {pendingApproval.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <CheckCircle2 className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-white font-medium">All caught up!</p>
              <p className="text-slate-400 text-sm">No items pending your review</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingApproval.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{categoryLabels[item.category]}</p>
                    </div>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GlassCard className="!p-4 text-center">
          <p className="text-2xl font-bold text-cyan-400">{stats?.upcomingContent || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Upcoming Posts</p>
        </GlassCard>
        <GlassCard className="!p-4 text-center">
          <p className="text-2xl font-bold text-purple-400">{stats?.activeInfluencers || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Active Influencers</p>
        </GlassCard>
        <GlassCard className="!p-4 text-center">
          <p className="text-2xl font-bold text-emerald-400">{stats?.activePartnerships || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Partnerships</p>
        </GlassCard>
        <GlassCard className="!p-4 text-center">
          <p className="text-2xl font-bold text-amber-400">{stats?.unreadMessages || 0}</p>
          <p className="text-xs text-slate-400 mt-1">Open Messages</p>
        </GlassCard>
      </div>
    </div>
  );
};

export default OverviewDashboard;
