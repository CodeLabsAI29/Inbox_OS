import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { subDays, format, parseISO } from 'date-fns';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  AreaChart,
  Area,
} from 'recharts';
import {
  Inbox,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { API_BASE, authenticatedFetch } from '../config';

const COLORS = [
  '#6366f1',
  '#a855f7',
  '#ec4899',
  '#14b8a6',
  '#f59e0b',
  '#10b981',
];

export const AnalyticsPage: React.FC = () => {
  const [preset, setPreset] = useState<'7d' | '30d' | '90d' | 'custom'>('30d');
  const [customStart, setCustomStart] = useState<string>(
    format(subDays(new Date(), 30), 'yyyy-MM-dd')
  );
  const [customEnd, setCustomEnd] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );

  // Compute startDate & endDate ISO strings based on preset
  const dateRange = useMemo(() => {
    const end = new Date();
    // Set current day boundary to end of day
    end.setHours(23, 59, 59, 999);

    let start = subDays(end, 30);
    start.setHours(0, 0, 0, 0);

    if (preset === '7d') {
      start = subDays(end, 7);
      start.setHours(0, 0, 0, 0);
    } else if (preset === '90d') {
      start = subDays(end, 90);
      start.setHours(0, 0, 0, 0);
    } else if (preset === 'custom') {
      const s = customStart ? new Date(customStart) : subDays(end, 30);
      s.setHours(0, 0, 0, 0);
      const e = customEnd ? new Date(customEnd) : end;
      e.setHours(23, 59, 59, 999);
      return {
        startDate: s.toISOString(),
        endDate: e.toISOString(),
      };
    }

    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [preset, customStart, customEnd]);

  // Fetch stats and heatmap data
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery({
    queryKey: ['analytics-stats', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const url = `${API_BASE}/api/dashboard/stats?startDate=${encodeURIComponent(
        dateRange.startDate
      )}&endDate=${encodeURIComponent(dateRange.endDate)}`;
      const res = await authenticatedFetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch stats');
      return res.json();
    },
  });

  const {
    data: heatmapData,
    isLoading: heatmapLoading,
    error: heatmapError,
  } = useQuery({
    queryKey: ['analytics-heatmap', dateRange.startDate, dateRange.endDate],
    queryFn: async () => {
      const url = `${API_BASE}/api/dashboard/heatmap?startDate=${encodeURIComponent(
        dateRange.startDate
      )}&endDate=${encodeURIComponent(dateRange.endDate)}`;
      const res = await authenticatedFetch(url, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch heatmap data');
      return res.json();
    },
  });

  const isPageLoading = statsLoading || heatmapLoading;
  const isPageError = statsError || heatmapError;

  // Render Premium Skeleton Loaders
  if (isPageLoading) {
    return (
      <div className="space-y-8 animate-fadeIn text-left p-6 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-5">
          <div className="space-y-2">
            <div className="h-7 w-48 animate-pulse bg-[#e8e5d8] border border-black" />
            <div className="h-4 w-72 animate-pulse bg-[#e8e5d8] border border-black" />
          </div>
          <div className="h-10 w-64 animate-pulse bg-[#e8e5d8] border border-black" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neu-card p-5 h-28 animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 neu-card p-6 h-96 animate-pulse" />
          <div className="lg:col-span-2 neu-card p-6 h-96 animate-pulse" />
        </div>
        <div className="neu-card p-6 h-64 animate-pulse" />
      </div>
    );
  }

  if (isPageError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-6">
        <AlertCircle className="text-rose-500 mb-4" size={48} />
        <h3 className="text-lg font-bold text-black mb-2">
          Failed to load analytics
        </h3>
        <p className="text-xs text-gray-700 font-bold max-w-md mb-6">
          There was an error communicating with the InboxOS API server. Make
          sure the backend is active.
        </p>
      </div>
    );
  }

  // Fallback structures if database fields are empty
  const categoryBreakdown = stats?.categoryBreakdown || [];
  const priorityTrends = stats?.priorityTrends || [];
  const actionCompletion = stats?.actionCompletion || {
    completed: 0,
    pending: 0,
    total: 0,
  };
  const topSenders = stats?.topSenders || [];
  const heatmapDaily = heatmapData?.daily || [];

  // Completed percentage calculations
  const completionRate =
    actionCompletion.total > 0
      ? Math.round((actionCompletion.completed / actionCompletion.total) * 100)
      : 0;

  // Custom tooltips for Recharts
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="neu-card p-3 text-left">
          <p className="text-xs font-bold text-black mb-1 uppercase tracking-wider">
            {data.category}
          </p>
          <p className="text-xs text-blue-600 font-semibold">
            Emails:{' '}
            <span className="text-black font-extrabold">{data.count}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLineTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="neu-card p-3 text-left">
          <p className="text-[10px] text-gray-700 font-bold font-semibold mb-1">
            {format(parseISO(data.date), 'MMM d, yyyy')}
          </p>
          <p className="text-xs text-blue-600 font-semibold">
            Avg Priority:{' '}
            <span className="text-black font-extrabold">
              {data.avgPriority <= 1.0
                ? `${(data.avgPriority * 100).toFixed(0)}%`
                : `${data.avgPriority.toFixed(0)}/100`}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-8 animate-fadeIn text-left p-6 md:p-8">
      {/* ── Page Header & Date Range Picker ────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b-4 border-black pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-black flex items-center gap-2">
            Inbox Analytics Insights
            <BarChart3 className="text-blue-600 animate-pulse" size={20} />
          </h2>
          <p className="text-xs text-gray-700 font-bold">
            Monitor email traffic volume, categorization, priority trends, and
            automated actions.
          </p>
        </div>

        {/* Date presets and inputs */}
        <div className="flex flex-wrap items-center gap-3 bg-white border border-black shadow-[4px_4px_0_0_#111] p-1.5 self-start md:self-auto">
          {(['7d', '30d', '90d', 'custom'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPreset(p)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
                preset === p
                  ? 'bg-indigo-600 text-black shadow-md'
                  : 'text-gray-700 font-bold hover:text-black'
              }`}
            >
              {p}
            </button>
          ))}

          {preset === 'custom' && (
            <div className="flex items-center gap-2 pl-2 border-l border-white/10 animate-fadeIn">
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
              />
              <span className="text-gray-600 font-bold text-xs">-</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="bg-transparent text-xs text-gray-200 focus:outline-none cursor-pointer"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Top Level Stats Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-left">
        {/* Total Ingested */}
        <div className="neu-card p-5 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium text-gray-700 font-bold">
              Total Ingested
            </span>
            <div className="p-2 rounded-xl bg-white/5 text-blue-600">
              <Inbox size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-black">
              {stats?.totalIngested?.value ?? 0}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                stats?.totalIngested?.isPositive
                  ? 'bg-green-500 text-white border border-black'
                  : 'bg-red-500 text-white border border-black'
              }`}
            >
              {stats?.totalIngested?.change ?? '0%'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
        </div>

        {/* Action Completion Rate */}
        <div className="neu-card p-5 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium text-gray-700 font-bold">
              Action Resolution Rate
            </span>
            <div className="p-2 rounded-xl bg-green-500 text-white border border-black">
              <CheckCircle2 size={18} />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-black">
              {stats?.resolutionRate?.value ?? '0%'}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                stats?.resolutionRate?.isPositive
                  ? 'bg-green-500 text-white border border-black'
                  : 'bg-red-500 text-white border border-black'
              }`}
            >
              {stats?.resolutionRate?.change ?? '0%'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        </div>

        {/* Urgent Actions Required */}
        <div className="neu-card p-5 relative overflow-hidden transition-all duration-300">
          <div className="flex justify-between items-start mb-3">
            <span className="text-xs font-medium text-gray-700 font-bold">
              Urgent Pending Actions
            </span>
            <div className="p-2 rounded-xl bg-yellow-400 text-black border border-black">
              <ShieldAlert size={18} className="animate-pulse" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-black">
              {stats?.pendingActions?.value ?? 0}
            </span>
            <span
              className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
                stats?.pendingActions?.isPositive
                  ? 'bg-green-500 text-white border border-black'
                  : 'bg-red-500 text-white border border-black'
              }`}
            >
              {stats?.pendingActions?.change ?? '0%'}
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />
        </div>
      </div>

      {/* ── Main Interactive Visualization Grid ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category Breakdown Pie Chart */}
        <div className="lg:col-span-1 neu-card p-6 relative overflow-hidden flex flex-col justify-between min-h-[380px] text-left">
          <div>
            <h3 className="text-sm font-semibold text-black mb-1">
              Category Distribution
            </h3>
            <p className="text-[10px] text-gray-700 font-bold mb-4">
              Email categories classified automatically by the AI system.
            </p>
          </div>

          <div className="flex-1 flex items-center justify-center relative">
            {categoryBreakdown.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="count"
                    nameKey="category"
                  >
                    {categoryBreakdown.map((_entry: any, index: number) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold py-10">
                No data for this period
              </div>
            )}
          </div>

          {/* Simple Legend grid */}
          <div className="grid grid-cols-3 gap-2 border-t-4 border-black pt-4 text-[10px] font-semibold text-gray-800 font-bold text-left">
            {categoryBreakdown.slice(0, 6).map((item: any, idx: number) => (
              <div
                key={item.category}
                className="flex items-center gap-1.5 truncate"
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="truncate">
                  {item.category} ({item.count})
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Priority Trend Chart */}
        <div className="lg:col-span-2 neu-card p-6 relative overflow-hidden flex flex-col min-h-[380px] text-left">
          <div>
            <h3 className="text-sm font-semibold text-black mb-1">
              Average Priority Trend
            </h3>
            <p className="text-[10px] text-gray-700 font-bold mb-4">
              Evolution of average importance rating scored by decision pipeline
              models.
            </p>
          </div>

          <div className="flex-1 w-full min-h-[220px]">
            {priorityTrends.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={priorityTrends}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient
                      id="priorityGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(0,0,0,0.1)"
                  />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(tick) => format(parseISO(tick), 'MMM d')}
                    stroke="rgba(0,0,0,0.8)"
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                  />
                  <YAxis
                    stroke="rgba(0,0,0,0.8)"
                    tick={{ fill: '#9ca3af', fontSize: 9 }}
                    domain={[0, 'auto']}
                  />
                  <Tooltip content={<CustomLineTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="avgPriority"
                    stroke="#6366f1"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#priorityGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-gray-600 font-bold">
                No data for this period
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Volume Heatmap & Action Gauge & Senders Grid ────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Heatmap & Senders panel */}
        <div className="lg:col-span-2 space-y-8">
          {/* GitHub-style Volume Heatmap */}
          <div className="neu-card p-6 relative overflow-hidden text-left">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h3 className="text-sm font-semibold text-black mb-1">
                  Email Volume Heatmap
                </h3>
                <p className="text-[10px] text-gray-700 font-bold">
                  Total ingested emails showing density patterns for selected
                  timeframe.
                </p>
              </div>
            </div>

            {heatmapDaily.length > 0 ? (
              <div className="overflow-x-auto pb-2 -mx-4 px-4 scrollbar-thin">
                <div
                  className="grid grid-flow-col gap-1.5"
                  style={{ gridTemplateRows: 'repeat(7, minmax(0, 1fr))' }}
                >
                  {heatmapDaily.map((day: any) => {
                    let level = 'bg-white/5';
                    if (day.count >= 1 && day.count <= 2)
                      level = 'bg-emerald-500/25';
                    else if (day.count >= 3 && day.count <= 5)
                      level = 'bg-emerald-500/50';
                    else if (day.count >= 6 && day.count <= 9)
                      level = 'bg-emerald-500/75';
                    else if (day.count >= 10) level = 'bg-emerald-500';

                    return (
                      <div
                        key={day.date}
                        className={`w-3 h-3 rounded-[3px] transition-all duration-200 hover:scale-[1.15] hover:ring-1 hover:ring-white/40 cursor-pointer ${level}`}
                        title={`${format(parseISO(day.date), 'MMM d, yyyy')}: ${day.count} emails`}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-end gap-1.5 items-center mt-3 text-[9px] text-gray-600 font-bold font-semibold">
                  <span>Less</span>
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-white/5" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/25" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/50" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500/75" />
                  <div className="w-2.5 h-2.5 rounded-[2px] bg-emerald-500" />
                  <span>More</span>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold py-6">
                No data for this period
              </div>
            )}
          </div>

          {/* Top Senders Table */}
          <div className="neu-card p-6 relative overflow-hidden text-left">
            <div>
              <h3 className="text-sm font-semibold text-black mb-1">
                Top Active Senders
              </h3>
              <p className="text-[10px] text-gray-700 font-bold mb-4">
                Senders who broadcast emails most frequently to this inbox.
              </p>
            </div>

            {topSenders.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-800 font-bold">
                  <thead>
                    <tr className="border-b-4 border-black text-[9px] text-gray-700 font-bold uppercase tracking-widest font-bold">
                      <th className="pb-3 pl-2">Sender</th>
                      <th className="pb-3 text-right pr-2">Total Broadcasts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-y-white/5">
                    {topSenders.map((sender: any) => (
                      <tr
                        key={sender.sender}
                        className="hover:bg-white/3 transition-colors duration-150"
                      >
                        <td className="py-3.5 pl-2 flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-300 border border-indigo-500/10 font-bold flex items-center justify-center shrink-0">
                            {sender.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-100">
                              {sender.name}
                            </p>
                            <p className="text-[9px] text-gray-600 font-bold">
                              {sender.sender}
                            </p>
                          </div>
                        </td>
                        <td className="py-3.5 text-right pr-2 font-bold text-black">
                          {sender.count}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold py-6">
                No data for this period
              </div>
            )}
          </div>
        </div>

        {/* Action Completion Circular Gauge */}
        <div className="lg:col-span-1 neu-card p-6 relative overflow-hidden flex flex-col justify-between min-h-[320px] text-left">
          <div>
            <h3 className="text-sm font-semibold text-black mb-1">
              Resolution Rate Gauge
            </h3>
            <p className="text-[10px] text-gray-700 font-bold mb-4">
              Ratio of completed action items against pending workloads.
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center">
            {actionCompletion.total > 0 ? (
              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* SVG circular progress indicator */}
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    className="stroke-white/5"
                    strokeWidth="10"
                    fill="transparent"
                  />
                  <circle
                    cx="80"
                    cy="80"
                    r="64"
                    className="stroke-indigo-500 transition-all duration-500 ease-out"
                    strokeWidth="10"
                    fill="transparent"
                    strokeDasharray={2 * Math.PI * 64}
                    strokeDashoffset={
                      2 * Math.PI * 64 * (1 - completionRate / 100)
                    }
                    strokeLinecap="round"
                  />
                </svg>
                {/* Visual content inside */}
                <div className="absolute text-center">
                  <span className="text-3xl font-extrabold text-black tracking-tight">
                    {completionRate}%
                  </span>
                  <p className="text-[9px] text-gray-600 font-bold font-bold uppercase tracking-wider mt-0.5">
                    Resolved
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center text-xs text-gray-600 font-bold py-10">
                No action workloads found
              </div>
            )}
          </div>

          <div className="flex justify-around items-center border-t-4 border-black pt-4 text-center">
            <div>
              <p className="text-lg font-bold text-black">
                {actionCompletion.completed}
              </p>
              <p className="text-[9px] text-gray-600 font-bold font-semibold uppercase">
                Completed
              </p>
            </div>
            <div className="h-6 w-px bg-white/5" />
            <div>
              <p className="text-lg font-bold text-black">
                {actionCompletion.pending}
              </p>
              <p className="text-[9px] text-gray-600 font-bold font-semibold uppercase">
                Pending
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
