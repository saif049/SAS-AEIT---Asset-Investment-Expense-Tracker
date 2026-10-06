/**
 * MODULE 5: Recharts 'Spending Trend' Line & Area Chart
 * Visualizes chronological daily expense history over the last 30 days
 * with 7-day rolling average trendline, BDT currency metrics, and momentum indicators.
 */

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Calendar,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Layers,
} from 'lucide-react';
import { EnrichedExpense } from '../../types/database';
import { formatBDT } from '../../utils/bdtFormatter';

interface SpendingTrendChartProps {
  expenses: EnrichedExpense[];
}

interface DayDataPoint {
  dateKey: string;
  dateLabel: string;
  dayOfWeek: string;
  amount: number;
  rollingAvg: number;
  transactionCount: number;
  topCategory: string;
}

export const SpendingTrendChart: React.FC<SpendingTrendChartProps> = ({ expenses }) => {
  const [timeRangeDays, setTimeRangeDays] = useState<30 | 14 | 7>(30);
  const [showTrendline, setShowTrendline] = useState<boolean>(true);

  // -------------------------------------------------------------------------
  // Process 30-Day Chronological Expense Series
  // -------------------------------------------------------------------------
  const { chartData, metrics } = useMemo(() => {
    // Generate dates for the selected window ending today
    const dataPoints: DayDataPoint[] = [];
    const today = new Date();

    // Map all expenses by YYYY-MM-DD
    const expenseByDate: Record<string, { total: number; count: number; cats: Record<string, number> }> = {};

    expenses.forEach((exp) => {
      if (!exp.date) return;
      const dStr = exp.date.split('T')[0];
      if (!expenseByDate[dStr]) {
        expenseByDate[dStr] = { total: 0, count: 0, cats: {} };
      }
      expenseByDate[dStr].total += exp.amount_bdt;
      expenseByDate[dStr].count += 1;

      const catName = exp.category_name || 'General';
      expenseByDate[dStr].cats[catName] = (expenseByDate[dStr].cats[catName] || 0) + exp.amount_bdt;
    });

    // Populate day by day
    for (let i = timeRangeDays - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];

      // Format label (e.g., "Oct 04")
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const dateLabel = `${monthNames[d.getMonth()]} ${String(d.getDate()).padStart(2, '0')}`;
      const dayOfWeek = dayNames[d.getDay()];

      const dayData = expenseByDate[dateKey] || { total: 0, count: 0, cats: {} };

      // Find top category for the day
      let topCat = 'None';
      let topCatVal = 0;
      for (const [cName, cVal] of Object.entries(dayData.cats)) {
        if (cVal > topCatVal) {
          topCatVal = cVal;
          topCat = cName;
        }
      }

      dataPoints.push({
        dateKey,
        dateLabel,
        dayOfWeek,
        amount: dayData.total,
        rollingAvg: 0, // calculated below
        transactionCount: dayData.count,
        topCategory: topCat,
      });
    }

    // Calculate 7-Day Moving Average for smooth trendline
    dataPoints.forEach((point, idx) => {
      const windowStart = Math.max(0, idx - 6);
      const windowSlice = dataPoints.slice(windowStart, idx + 1);
      const sum = windowSlice.reduce((acc, curr) => acc + curr.amount, 0);
      point.rollingAvg = Math.round(sum / windowSlice.length);
    });

    // Compute Summary Metrics
    const totalSpending = dataPoints.reduce((acc, curr) => acc + curr.amount, 0);
    const dailyAverage = totalSpending / (dataPoints.length || 1);

    let peakDay = dataPoints[0] || { dateLabel: 'N/A', amount: 0 };
    dataPoints.forEach((p) => {
      if (p.amount > peakDay.amount) {
        peakDay = p;
      }
    });

    // 7-day momentum: Compare last 7 days vs previous 7 days
    const recent7Days = dataPoints.slice(-7);
    const prev7Days = dataPoints.slice(-14, -7);
    const recent7Total = recent7Days.reduce((acc, p) => acc + p.amount, 0);
    const prev7Total = prev7Days.reduce((acc, p) => acc + p.amount, 0);

    let momentumPct = 0;
    if (prev7Total > 0) {
      momentumPct = ((recent7Total - prev7Total) / prev7Total) * 100;
    }

    return {
      chartData: dataPoints,
      metrics: {
        totalSpending,
        dailyAverage,
        peakDay,
        recent7Total,
        momentumPct,
      },
    };
  }, [expenses, timeRangeDays]);

  // Custom Recharts Dark Tooltip
  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: DayDataPoint }> }) => {
    if (active && payload && payload.length) {
      const data: DayDataPoint = payload[0].payload;
      return (
        <div className="bg-slate-950/95 border border-slate-700/80 rounded-2xl p-3.5 shadow-2xl backdrop-blur-md text-xs min-w-[200px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-2">
            <span className="font-bold text-white flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-rose-400" />
              <span>{data.dateLabel}</span>
              <span className="text-[10px] text-slate-400 font-normal">({data.dayOfWeek})</span>
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {data.transactionCount} {data.transactionCount === 1 ? 'txn' : 'txns'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Daily Expense:</span>
              <span className="font-mono font-bold text-rose-400 text-sm">
                {formatBDT(data.amount)}
              </span>
            </div>

            {showTrendline && (
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-cyan-400 flex items-center gap-1">
                  <span className="w-2 h-0.5 bg-cyan-400" />
                  <span>7D Trend Average:</span>
                </span>
                <span className="font-mono text-cyan-300 font-semibold">
                  {formatBDT(data.rollingAvg)}
                </span>
              </div>
            )}

            {data.topCategory !== 'None' && (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>Top Category:</span>
                <span className="text-slate-200 font-medium truncate max-w-[120px]">
                  {data.topCategory}
                </span>
              </div>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-7 shadow-xl space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20 font-bold">
              Recharts Analytics
            </span>
            <span className="text-xs text-slate-500">·</span>
            <span className="text-xs text-slate-400 font-medium">Last {timeRangeDays} Days History</span>
          </div>
          <h3 className="text-lg font-bold tracking-tight text-white flex items-center gap-2 mt-1">
            <TrendingDown className="w-5 h-5 text-rose-400" />
            <span>Spending Trend & Expense Velocity</span>
          </h3>
          <p className="text-xs text-slate-400">
            Chronological expense trajectory with 7-day rolling smoothed trendline
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Trendline Toggle */}
          <button
            type="button"
            onClick={() => setShowTrendline(!showTrendline)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 ${
              showTrendline
                ? 'bg-cyan-500/20 border-cyan-400/80 text-cyan-300 shadow-xs'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${showTrendline ? 'bg-cyan-400 animate-pulse' : 'bg-slate-600'}`} />
            <span>7-Day Trendline</span>
          </button>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl">
            {([7, 14, 30] as const).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setTimeRangeDays(days)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  timeRangeDays === days
                    ? 'bg-rose-500 text-white shadow-xs'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {days}D
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Highlight Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Total in Window */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            {timeRangeDays}-Day Total Spending
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-rose-400 block mt-0.5">
            {formatBDT(metrics.totalSpending)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            All classified outflows
          </span>
        </div>

        {/* Daily Average */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Daily Average Spend
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-slate-100 block mt-0.5">
            {formatBDT(metrics.dailyAverage)}
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            per day ({timeRangeDays} days)
          </span>
        </div>

        {/* Peak Single Day */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            Peak Expense Day
          </span>
          <span className="text-base sm:text-lg font-bold font-mono text-amber-400 block mt-0.5">
            {formatBDT(metrics.peakDay.amount)}
          </span>
          <span className="text-[10px] text-slate-400 truncate block mt-0.5">
            on {metrics.peakDay.dateLabel}
          </span>
        </div>

        {/* 7-Day Velocity / Momentum */}
        <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">
            7-Day Momentum
          </span>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span
              className={`text-base sm:text-lg font-bold font-mono ${
                metrics.momentumPct > 0 ? 'text-rose-400' : 'text-emerald-400'
              }`}
            >
              {metrics.momentumPct > 0 ? `+${metrics.momentumPct.toFixed(1)}%` : `${metrics.momentumPct.toFixed(1)}%`}
            </span>
            {metrics.momentumPct > 0 ? (
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            )}
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            vs prior 7 days
          </span>
        </div>
      </div>

      {/* Main Recharts Line & Area Chart Container */}
      <div className="w-full h-72 sm:h-80 bg-slate-950/50 rounded-2xl p-2 sm:p-4 border border-slate-800/80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="expenseTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="trendlineGlow" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="dateLabel"
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              interval={timeRangeDays > 14 ? 3 : 1}
            />

            <YAxis
              stroke="#64748b"
              fontSize={10}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={(v) => (v >= 1000 ? `৳${(v / 1000).toFixed(0)}k` : `৳${v}`)}
            />

            <Tooltip content={<CustomTooltip />} />

            {/* Daily Expense Area */}
            <Area
              type="monotone"
              dataKey="amount"
              name="Daily Expense"
              stroke="#f43f5e"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#expenseTrendGradient)"
            />

            {/* 7-Day Rolling Moving Average Line */}
            {showTrendline && (
              <Line
                type="monotone"
                dataKey="rollingAvg"
                name="7D Trend"
                stroke="url(#trendlineGlow)"
                strokeWidth={2.5}
                dot={false}
                strokeDasharray="4 4"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Insight Note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-300">
            <span className="w-3 h-1.5 rounded-full bg-rose-500" />
            <span>Daily Actual Outflow</span>
          </span>
          {showTrendline && (
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-3 h-0.5 bg-cyan-400 border-t border-dashed border-cyan-300" />
              <span>7-Day Moving Trendline</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 text-slate-500 text-[10px]">
          <Clock className="w-3 h-3 text-slate-400" />
          <span>Interactive tooltips show exact day totals & transaction counts</span>
        </div>
      </div>
    </div>
  );
};
