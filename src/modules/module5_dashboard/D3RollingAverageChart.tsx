/**
 * D3.js 30-Day Rolling Average Line Chart
 * Visualizes 30-day moving averages of Expenses versus Incomes with D3.js curves,
 * dynamic gradient fills, multi-window filtering, and interactive crosshair inspector.
 */

import React, { useRef, useState, useMemo, useEffect } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Layers,
  Calendar,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight,
  Percent,
} from 'lucide-react';
import { EnrichedExpense, EnrichedIncome } from '../../types/database';
import { formatBDT, formatBDTShort } from '../../utils/bdtFormatter';

interface D3RollingAverageChartProps {
  expenses: EnrichedExpense[];
  incomes: EnrichedIncome[];
}

export interface RollingDataPoint {
  date: Date;
  dateStr: string;
  dailyIncome: number;
  dailyExpense: number;
  rollingIncome: number;
  rollingExpense: number;
  rollingNet: number;
  windowDaysCount: number;
}

export const D3RollingAverageChart: React.FC<D3RollingAverageChartProps> = ({
  expenses,
  incomes,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  // Time window view selection: 30 Days, 60 Days, 90 Days, or All Time
  const [timeWindow, setTimeWindow] = useState<'30D' | '60D' | '90D' | 'ALL'>('60D');
  const [showIncomeLine, setShowIncomeLine] = useState<boolean>(true);
  const [showExpenseLine, setShowExpenseLine] = useState<boolean>(true);
  const [showAreaFill, setShowAreaFill] = useState<boolean>(true);

  // Hovered data point for crosshair & tooltip
  const [hoveredPoint, setHoveredPoint] = useState<RollingDataPoint | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Chart dimensions state
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({
    width: 600,
    height: 320,
  });

  // Observe container width for responsive D3 rendering
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      if (width > 0) {
        // Compute height proportionally: slightly taller on mobile for touch scrubbing
        const height = width < 480 ? 280 : 320;
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Compute Continuous Daily Data & 30-Day Rolling Moving Averages
  const { allPoints, displayedPoints, currentMetrics } = useMemo(() => {
    if (expenses.length === 0 && incomes.length === 0) {
      return { allPoints: [], displayedPoints: [], currentMetrics: null };
    }

    // 1. Determine timeline span
    const allDateStrs: string[] = [];
    expenses.forEach((e) => allDateStrs.push(e.date));
    incomes.forEach((i) => allDateStrs.push(i.date));

    allDateStrs.sort();
    const minDateStr = allDateStrs[0] || new Date().toISOString().slice(0, 10);
    const maxDateStr = allDateStrs[allDateStrs.length - 1] || new Date().toISOString().slice(0, 10);

    // Map amounts per date
    const dailyIncomeMap = new Map<string, number>();
    const dailyExpenseMap = new Map<string, number>();

    incomes.forEach((i) => {
      dailyIncomeMap.set(i.date, (dailyIncomeMap.get(i.date) || 0) + i.amount_bdt);
    });

    expenses.forEach((e) => {
      dailyExpenseMap.set(e.date, (dailyExpenseMap.get(e.date) || 0) + e.amount_bdt);
    });

    // 2. Build continuous chronological day sequence (no gaps)
    const startDate = new Date(minDateStr + 'T00:00:00');
    const endDate = new Date(maxDateStr + 'T00:00:00');

    // Ensure at least 30 continuous days exist for a proper rolling calculation
    const dayDiff = Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (dayDiff < 30) {
      startDate.setDate(startDate.getDate() - (30 - dayDiff));
    }

    const calendarDays: { dateStr: string; date: Date; income: number; expense: number }[] = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      const yyyy = curr.getFullYear();
      const mm = String(curr.getMonth() + 1).padStart(2, '0');
      const dd = String(curr.getDate()).padStart(2, '0');
      const dStr = `${yyyy}-${mm}-${dd}`;

      calendarDays.push({
        dateStr: dStr,
        date: new Date(curr),
        income: dailyIncomeMap.get(dStr) || 0,
        expense: dailyExpenseMap.get(dStr) || 0,
      });

      curr.setDate(curr.getDate() + 1);
    }

    // 3. Compute 30-Day Trailing Rolling Average for each day
    // Window: [i - 29, i] (up to 30 days)
    const points: RollingDataPoint[] = calendarDays.map((day, idx) => {
      const windowStartIdx = Math.max(0, idx - 29);
      const windowSlice = calendarDays.slice(windowStartIdx, idx + 1);
      const count = windowSlice.length;

      const sumIncome = windowSlice.reduce((acc, d) => acc + d.income, 0);
      const sumExpense = windowSlice.reduce((acc, d) => acc + d.expense, 0);

      // We normalize by 30 (or count if initial ramp-up)
      const denominator = Math.max(1, count);
      const rollingIncome = Math.round(sumIncome / denominator);
      const rollingExpense = Math.round(sumExpense / denominator);
      const rollingNet = rollingIncome - rollingExpense;

      return {
        date: day.date,
        dateStr: day.dateStr,
        dailyIncome: day.income,
        dailyExpense: day.expense,
        rollingIncome,
        rollingExpense,
        rollingNet,
        windowDaysCount: count,
      };
    });

    // 4. Filter according to user-selected window
    let filtered = points;
    if (timeWindow === '30D') {
      filtered = points.slice(-30);
    } else if (timeWindow === '60D') {
      filtered = points.slice(-60);
    } else if (timeWindow === '90D') {
      filtered = points.slice(-90);
    }

    // 5. Current Metrics & Trend Momentum
    const latestPoint = points[points.length - 1];
    // Previous 30-day point for velocity comparison
    const prevPoint = points.length > 30 ? points[points.length - 31] : points[0];

    const expenseVelocityDelta = latestPoint && prevPoint
      ? latestPoint.rollingExpense - prevPoint.rollingExpense
      : 0;

    const incomeVelocityDelta = latestPoint && prevPoint
      ? latestPoint.rollingIncome - prevPoint.rollingIncome
      : 0;

    return {
      allPoints: points,
      displayedPoints: filtered,
      currentMetrics: latestPoint
        ? {
            latest: latestPoint,
            expenseVelocityDelta,
            incomeVelocityDelta,
            totalRollingIncome30D: latestPoint.rollingIncome * 30,
            totalRollingExpense30D: latestPoint.rollingExpense * 30,
            savingsRatePct: latestPoint.rollingIncome > 0
              ? Math.max(0, Math.round(((latestPoint.rollingIncome - latestPoint.rollingExpense) / latestPoint.rollingIncome) * 100))
              : 0,
          }
        : null,
    };
  }, [expenses, incomes, timeWindow]);

  // Set default hovered point to latest
  useEffect(() => {
    if (displayedPoints.length > 0 && !hoveredPoint) {
      setHoveredPoint(displayedPoints[displayedPoints.length - 1]);
    }
  }, [displayedPoints, hoveredPoint]);

  // D3 Render Effect: Render curves, axes, grids, and interactions
  useEffect(() => {
    if (!svgRef.current || displayedPoints.length === 0) return;

    const { width, height } = dimensions;
    const margin = {
      top: 20,
      right: 25,
      bottom: 35,
      left: width < 480 ? 42 : 55,
    };

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    if (innerWidth <= 0 || innerHeight <= 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // 1. Scales
    const xExtent = d3.extent(displayedPoints, (d) => d.date) as [Date, Date];
    const xScale = d3.scaleTime().domain(xExtent).range([margin.left, width - margin.right]);

    const maxVal = d3.max(displayedPoints, (d) => Math.max(d.rollingIncome, d.rollingExpense)) || 1000;
    // Add 15% headroom for clean breathing room
    const yScale = d3
      .scaleLinear()
      .domain([0, maxVal * 1.18])
      .range([height - margin.bottom, margin.top]);

    // 2. SVG Definitions (Gradients & Drop Shadows)
    const defs = svg.append('defs');

    // Income Area Gradient (Emerald)
    const incomeGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-rolling-income-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    incomeGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.35);
    incomeGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#10b981')
      .attr('stop-opacity', 0.0);

    // Expense Area Gradient (Rose)
    const expenseGrad = defs
      .append('linearGradient')
      .attr('id', 'd3-rolling-expense-grad')
      .attr('x1', '0%')
      .attr('y1', '0%')
      .attr('x2', '0%')
      .attr('y2', '100%');
    expenseGrad
      .append('stop')
      .attr('offset', '0%')
      .attr('stop-color', '#f43f5e')
      .attr('stop-opacity', 0.35);
    expenseGrad
      .append('stop')
      .attr('offset', '100%')
      .attr('stop-color', '#f43f5e')
      .attr('stop-opacity', 0.0);

    // 3. Horizontal Gridlines
    const yTicks = yScale.ticks(5);
    const gridGroup = svg.append('g').attr('class', 'gridlines');

    yTicks.forEach((tickVal) => {
      gridGroup
        .append('line')
        .attr('x1', margin.left)
        .attr('x2', width - margin.right)
        .attr('y1', yScale(tickVal))
        .attr('y2', yScale(tickVal))
        .attr('stroke', '#1e293b')
        .attr('stroke-dasharray', '3 3')
        .attr('stroke-width', 1);
    });

    // 4. Area Generators
    if (showAreaFill) {
      if (showIncomeLine) {
        const incomeArea = d3
          .area<RollingDataPoint>()
          .x((d) => xScale(d.date))
          .y0(yScale(0))
          .y1((d) => yScale(d.rollingIncome))
          .curve(d3.curveMonotoneX);

        svg
          .append('path')
          .datum(displayedPoints)
          .attr('fill', 'url(#d3-rolling-income-grad)')
          .attr('d', incomeArea);
      }

      if (showExpenseLine) {
        const expenseArea = d3
          .area<RollingDataPoint>()
          .x((d) => xScale(d.date))
          .y0(yScale(0))
          .y1((d) => yScale(d.rollingExpense))
          .curve(d3.curveMonotoneX);

        svg
          .append('path')
          .datum(displayedPoints)
          .attr('fill', 'url(#d3-rolling-expense-grad)')
          .attr('d', expenseArea);
      }
    }

    // 5. Line Generators (Smooth Monotone Cubic Splines)
    if (showIncomeLine) {
      const incomeLine = d3
        .line<RollingDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.rollingIncome))
        .curve(d3.curveMonotoneX);

      // Income glow shadow
      svg
        .append('path')
        .datum(displayedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 4.5)
        .attr('stroke-opacity', 0.2)
        .attr('d', incomeLine);

      // Income crisp line
      svg
        .append('path')
        .datum(displayedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#10b981')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', incomeLine);
    }

    if (showExpenseLine) {
      const expenseLine = d3
        .line<RollingDataPoint>()
        .x((d) => xScale(d.date))
        .y((d) => yScale(d.rollingExpense))
        .curve(d3.curveMonotoneX);

      // Expense glow shadow
      svg
        .append('path')
        .datum(displayedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 4.5)
        .attr('stroke-opacity', 0.2)
        .attr('d', expenseLine);

      // Expense crisp line
      svg
        .append('path')
        .datum(displayedPoints)
        .attr('fill', 'none')
        .attr('stroke', '#f43f5e')
        .attr('stroke-width', 2.5)
        .attr('stroke-linecap', 'round')
        .attr('stroke-linejoin', 'round')
        .attr('d', expenseLine);
    }

    // 6. X-Axis (Dates)
    const tickCount = width < 480 ? 4 : 6;
    const xAxis = d3
      .axisBottom(xScale)
      .ticks(tickCount)
      .tickFormat((d) => {
        const dt = d as Date;
        return d3.timeFormat('%b %d')(dt);
      })
      .tickSize(4);

    const xAxisGroup = svg
      .append('g')
      .attr('transform', `translate(0, ${height - margin.bottom})`)
      .call(xAxis);

    xAxisGroup.select('.domain').attr('stroke', '#334155');
    xAxisGroup.selectAll('.tick line').attr('stroke', '#475569');
    xAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace');

    // 7. Y-Axis (Currency formatted BDT)
    const yAxis = d3
      .axisLeft(yScale)
      .ticks(5)
      .tickFormat((d) => formatBDTShort(Number(d)))
      .tickSize(4);

    const yAxisGroup = svg
      .append('g')
      .attr('transform', `translate(${margin.left}, 0)`)
      .call(yAxis);

    yAxisGroup.select('.domain').attr('stroke', '#334155');
    yAxisGroup.selectAll('.tick line').attr('stroke', '#475569');
    yAxisGroup
      .selectAll('.tick text')
      .attr('fill', '#94a3b8')
      .attr('font-size', '10px')
      .attr('font-family', 'ui-monospace, SFMono-Regular, monospace');

    // 8. Crosshair Group (Drawn when hovering / touch scrubbing)
    const crosshairGroup = svg.append('g').attr('class', 'crosshair').style('display', 'none');

    const vLine = crosshairGroup
      .append('line')
      .attr('y1', margin.top)
      .attr('y2', height - margin.bottom)
      .attr('stroke', '#64748b')
      .attr('stroke-dasharray', '3 3')
      .attr('stroke-width', 1.5);

    // Income Dot
    const incomeDotGlow = crosshairGroup
      .append('circle')
      .attr('r', 8)
      .attr('fill', '#10b981')
      .attr('fill-opacity', 0.25);
    const incomeDot = crosshairGroup
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#10b981')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Expense Dot
    const expenseDotGlow = crosshairGroup
      .append('circle')
      .attr('r', 8)
      .attr('fill', '#f43f5e')
      .attr('fill-opacity', 0.25);
    const expenseDot = crosshairGroup
      .append('circle')
      .attr('r', 4.5)
      .attr('fill', '#f43f5e')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2);

    // Bisector for pointer search
    const bisectDate = d3.bisector<RollingDataPoint, Date>((d) => d.date).center;

    // 9. Interactive Overlay for Hover & Touch Scrubbing
    const updateInteraction = (pointerX: number, pointerY: number) => {
      const clampedX = Math.max(margin.left, Math.min(width - margin.right, pointerX));
      const dateAtPointer = xScale.invert(clampedX);
      const index = bisectDate(displayedPoints, dateAtPointer);
      const point = displayedPoints[index];

      if (point) {
        setHoveredPoint(point);
        setHoverCoords({ x: clampedX, y: pointerY });

        crosshairGroup.style('display', null);

        const xPos = xScale(point.date);
        vLine.attr('x1', xPos).attr('x2', xPos);

        if (showIncomeLine) {
          const yInc = yScale(point.rollingIncome);
          incomeDotGlow.attr('cx', xPos).attr('cy', yInc).style('display', null);
          incomeDot.attr('cx', xPos).attr('cy', yInc).style('display', null);
        } else {
          incomeDotGlow.style('display', 'none');
          incomeDot.style('display', 'none');
        }

        if (showExpenseLine) {
          const yExp = yScale(point.rollingExpense);
          expenseDotGlow.attr('cx', xPos).attr('cy', yExp).style('display', null);
          expenseDot.attr('cx', xPos).attr('cy', yExp).style('display', null);
        } else {
          expenseDotGlow.style('display', 'none');
          expenseDot.style('display', 'none');
        }
      }
    };

    svg
      .append('rect')
      .attr('class', 'overlay')
      .attr('x', margin.left)
      .attr('y', margin.top)
      .attr('width', innerWidth)
      .attr('height', innerHeight)
      .attr('fill', 'transparent')
      .attr('cursor', 'crosshair')
      .on('pointermove', function (event) {
        const [px, py] = d3.pointer(event);
        updateInteraction(px, py);
      })
      .on('pointerleave', function () {
        // Keep hovered on last touched or default to last data point
      });

    // If a hovered point is already set, update dot positions
    if (hoveredPoint) {
      const pIdx = displayedPoints.findIndex((d) => d.dateStr === hoveredPoint.dateStr);
      if (pIdx >= 0) {
        const p = displayedPoints[pIdx];
        const xPos = xScale(p.date);
        crosshairGroup.style('display', null);
        vLine.attr('x1', xPos).attr('x2', xPos);

        if (showIncomeLine) {
          const yInc = yScale(p.rollingIncome);
          incomeDotGlow.attr('cx', xPos).attr('cy', yInc).style('display', null);
          incomeDot.attr('cx', xPos).attr('cy', yInc).style('display', null);
        }
        if (showExpenseLine) {
          const yExp = yScale(p.rollingExpense);
          expenseDotGlow.attr('cx', xPos).attr('cy', yExp).style('display', null);
          expenseDot.attr('cx', xPos).attr('cy', yExp).style('display', null);
        }
      }
    }
  }, [
    dimensions,
    displayedPoints,
    showIncomeLine,
    showExpenseLine,
    showAreaFill,
    hoveredPoint,
  ]);

  if (displayedPoints.length === 0) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 text-center">
        <Activity className="w-8 h-8 text-slate-500 mx-auto mb-2 animate-pulse" />
        <h3 className="text-sm font-bold text-white">Awaiting Sufficient Transaction Data</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
          Add expense and income records to activate the D3.js 30-day moving average visualization.
        </p>
      </div>
    );
  }

  const activePoint = hoveredPoint || displayedPoints[displayedPoints.length - 1];

  return (
    <div
      ref={containerRef}
      className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border-2 border-emerald-500/40 rounded-3xl p-4 sm:p-6 shadow-2xl relative overflow-hidden"
    >
      {/* Luminous Top Accent Glow */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />

      {/* Header & Title Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-800">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-500 text-slate-950 shadow-xs">
              <Activity className="w-3 h-3 animate-pulse" />
              D3.js Visualization
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-teal-500/20 border border-teal-500/40 text-teal-300">
              30-Day Moving Average
            </span>
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <span>Expenses vs. Income Rolling Trajectory</span>
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Smooths daily cashflow volatility into a 30-day trailing mean to reveal sustained expenditure burn versus inflow momentum.
          </p>
        </div>

        {/* Time Window Buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-950 border border-slate-800 rounded-xl self-start sm:self-auto">
          {(['30D', '60D', '90D', 'ALL'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setTimeWindow(w)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeWindow === w
                  ? 'bg-emerald-500 text-slate-950 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {w === 'ALL' ? 'All' : w}
            </button>
          ))}
        </div>
      </div>

      {/* Aggregate Metric Callout Cards */}
      {currentMetrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4">
          {/* 30D Rolling Daily Expense */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-rose-500/30 flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold text-rose-300">
                <span className="w-2 h-2 rounded-full bg-rose-500" />
                30D Rolling Expense
              </span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-rose-400">
              {formatBDT(currentMetrics.latest.rollingExpense)}
              <span className="text-[10px] text-slate-400 font-normal"> / day</span>
            </span>
            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
              <span>30D Run Rate:</span>
              <span className="font-semibold text-rose-300">
                {formatBDTShort(currentMetrics.totalRollingExpense30D)}
              </span>
            </div>
          </div>

          {/* 30D Rolling Daily Income */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-emerald-500/30 flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="flex items-center gap-1 font-semibold text-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                30D Rolling Income
              </span>
            </div>
            <span className="text-sm sm:text-base font-bold font-mono text-emerald-400">
              {formatBDT(currentMetrics.latest.rollingIncome)}
              <span className="text-[10px] text-slate-400 font-normal"> / day</span>
            </span>
            <div className="text-[10px] font-mono text-slate-400 mt-1 flex items-center gap-1">
              <span>30D Run Rate:</span>
              <span className="font-semibold text-emerald-300">
                {formatBDTShort(currentMetrics.totalRollingIncome30D)}
              </span>
            </div>
          </div>

          {/* Net Moving Margin */}
          <div
            className={`p-3 rounded-2xl bg-slate-950/80 border flex flex-col ${
              currentMetrics.latest.rollingNet >= 0
                ? 'border-emerald-500/40 text-emerald-300'
                : 'border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-semibold">Net Daily Margin</span>
              {currentMetrics.latest.rollingNet >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5 text-rose-400" />
              )}
            </div>
            <span
              className={`text-sm sm:text-base font-bold font-mono ${
                currentMetrics.latest.rollingNet >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currentMetrics.latest.rollingNet >= 0 ? '+' : ''}
              {formatBDT(currentMetrics.latest.rollingNet)}
              <span className="text-[10px] font-normal text-slate-400"> / day</span>
            </span>
            <span className="text-[10px] text-slate-400 mt-1 truncate">
              {currentMetrics.latest.rollingNet >= 0 ? 'Net Cash Surplus' : 'Net Cash Deficit'}
            </span>
          </div>

          {/* Trajectory Momentum */}
          <div className="p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex flex-col">
            <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
              <span className="font-semibold">Expense Velocity</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                  currentMetrics.expenseVelocityDelta <= 0
                    ? 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {currentMetrics.expenseVelocityDelta <= 0 ? 'Cooling' : 'Accelerating'}
              </span>
            </div>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span
                className={`text-sm sm:text-base font-bold font-mono ${
                  currentMetrics.expenseVelocityDelta <= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {currentMetrics.expenseVelocityDelta <= 0 ? '-' : '+'}
                {formatBDT(Math.abs(currentMetrics.expenseVelocityDelta))}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 mt-1 truncate">vs. Prior 30D Window</span>
          </div>
        </div>
      )}

      {/* Interactive Legend & Visibility Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2 mb-2 text-xs">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowIncomeLine(!showIncomeLine)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              showIncomeLine
                ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span>Income 30D Avg</span>
            {showIncomeLine ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            onClick={() => setShowExpenseLine(!showExpenseLine)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold cursor-pointer transition-colors ${
              showExpenseLine
                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-500'
            }`}
          >
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <span>Expense 30D Avg</span>
            {showExpenseLine ? <Eye className="w-3 h-3 ml-0.5" /> : <EyeOff className="w-3 h-3 ml-0.5" />}
          </button>

          <button
            onClick={() => setShowAreaFill(!showAreaFill)}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
              showAreaFill ? 'text-slate-300 bg-slate-800' : 'text-slate-500 hover:text-slate-400'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span className="hidden sm:inline">Area Glow</span>
          </button>
        </div>

        <span className="text-[11px] font-mono text-slate-400">
          Touch or drag to inspect any date
        </span>
      </div>

      {/* Primary D3 SVG Canvas */}
      <div className="relative w-full overflow-hidden select-none touch-none">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto overflow-visible"
        />
      </div>

      {/* Floating / Pinned Crosshair Details Inspector */}
      {activePoint && (
        <div className="mt-3 p-3 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="font-bold text-white font-mono">
                {activePoint.date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              <span className="text-[10px] text-slate-400 ml-2 font-mono">
                ({activePoint.windowDaysCount}-day sample window)
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              30D Inc: <strong>{formatBDT(activePoint.rollingIncome)}/d</strong>
            </span>
            <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400">
              30D Exp: <strong>{formatBDT(activePoint.rollingExpense)}/d</strong>
            </span>
            <span
              className={`px-2 py-0.5 rounded-lg font-bold ${
                activePoint.rollingNet >= 0
                  ? 'bg-blue-500/10 border border-blue-500/30 text-blue-400'
                  : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
              }`}
            >
              Net: {activePoint.rollingNet >= 0 ? '+' : ''}
              {formatBDT(activePoint.rollingNet)}/d
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
