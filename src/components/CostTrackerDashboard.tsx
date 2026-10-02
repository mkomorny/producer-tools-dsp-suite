import React, { useState, useEffect, useMemo } from 'react';
import { 
  getStoredLogs, 
  clearStoredLogs, 
  formatUSD, 
  getOrCreateSessionId, 
  PRICING_RATES,
  resolveRate,
  CostLog 
} from '../lib/costTracker';
import { 
  DollarSign, 
  Calendar, 
  Clock, 
  Award, 
  Trash2, 
  FileText, 
  Activity, 
  CheckCircle, 
  XCircle, 
  ChevronDown, 
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

export function CostTrackerDashboard() {
  const [logs, setLogs] = useState<CostLog[]>([]);
  const { id: currentSessionId } = getOrCreateSessionId();

  // Filters state
  const [startDateStr, setStartDateStr] = useState<string>('');
  const [endDateStr, setEndDateStr] = useState<string>('');
  const [selectedModelFilter, setSelectedModelFilter] = useState<string>('all');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  
  // Clear confirm state
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  // Budget cap state
  const [budgetCap, setBudgetCap] = useState<number>(() => {
    const saved = localStorage.getItem('producer_lyria_budget_cap');
    return saved ? parseFloat(saved) : 10.0; // Default to $10.00
  });

  const handleBudgetCapChange = (val: string) => {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setBudgetCap(num);
      localStorage.setItem('producer_lyria_budget_cap', String(num));
    } else if (val === '') {
      setBudgetCap(0);
      localStorage.setItem('producer_lyria_budget_cap', '0');
    }
  };

  // Spent this calendar month
  const totalCostThisMonth = useMemo(() => {
    const today = new Date();
    return logs.reduce((sum, l) => {
      const logDate = new Date(l.timestamp);
      const isThisMonth = logDate.getMonth() === today.getMonth() && logDate.getFullYear() === today.getFullYear();
      return sum + (isThisMonth && l.success ? l.cost : 0);
    }, 0);
  }, [logs]);

  const percentSpent = budgetCap > 0 ? (totalCostThisMonth / budgetCap) * 100 : 0;
  const budgetProgress = Math.min(100, percentSpent);
  const isBudgetExceeded = budgetCap > 0 && totalCostThisMonth >= budgetCap;

  const isAt99Percent = budgetCap > 0 && percentSpent >= 99 && !isBudgetExceeded;
  const isAt90Percent = budgetCap > 0 && percentSpent >= 90 && percentSpent < 99;
  const isAt75Percent = budgetCap > 0 && percentSpent >= 75 && percentSpent < 90;

  const isBudgetWarning = budgetCap > 0 && percentSpent >= 75 && !isBudgetExceeded;

  const [dismissedWarnings, setDismissedWarnings] = useState<Record<string, boolean>>({});

  // Load logs initially & listen to storage events for real-time syncing
  const loadLogs = () => {
    setLogs(getStoredLogs());
  };

  useEffect(() => {
    loadLogs();
    window.addEventListener('storage', loadLogs);
    return () => {
      window.removeEventListener('storage', loadLogs);
    };
  }, []);

  // Compute stats
  const currentSessionLogs = logs.filter(l => l.sessionId === currentSessionId);
  const previousSessionLogs = logs.filter(l => l.sessionId !== currentSessionId);

  // Group by historical sessions
  const sessionsMap: Record<string, { startTime: number; logs: CostLog[]; cost: number; successCount: number }> = {};
  logs.forEach(l => {
    if (!sessionsMap[l.sessionId]) {
      sessionsMap[l.sessionId] = {
        startTime: l.sessionStartTime,
        logs: [],
        cost: 0,
        successCount: 0
      };
    }
    sessionsMap[l.sessionId].logs.push(l);
    if (l.success) {
      sessionsMap[l.sessionId].cost += l.cost;
      sessionsMap[l.sessionId].successCount++;
    }
  });

  const sortedSessions = Object.entries(sessionsMap).sort((a, b) => b[1].startTime - a[1].startTime);

  // Apply filters
  const filteredLogs = logs.filter(l => {
    // Model filter
    if (selectedModelFilter !== 'all') {
      const selectedName = resolveRate(selectedModelFilter).name;
      const logName = resolveRate(l.modelId).name;
      if (selectedName !== logName) {
        return false;
      }
    }

    // Date filters
    const logDate = new Date(l.timestamp);
    
    // Reset hours for pure date comparison
    logDate.setHours(0, 0, 0, 0);

    if (startDateStr) {
      const start = new Date(startDateStr);
      start.setHours(0, 0, 0, 0);
      if (logDate < start) return false;
    }

    if (endDateStr) {
      const end = new Date(endDateStr);
      end.setHours(0, 0, 0, 0);
      if (logDate > end) return false;
    }

    return true;
  });

  // Totals calculations
  const totalCostOverall = logs.reduce((sum, l) => sum + (l.success ? l.cost : 0), 0);
  const totalCostCurrentSession = currentSessionLogs.reduce((sum, l) => sum + (l.success ? l.cost : 0), 0);
  const totalCostFiltered = filteredLogs.reduce((sum, l) => sum + (l.success ? l.cost : 0), 0);
  
  const totalInputTokensFiltered = filteredLogs.reduce((sum, l) => sum + l.inputTokens, 0);
  const totalOutputTokensFiltered = filteredLogs.reduce((sum, l) => sum + l.outputTokens, 0);
  const totalCallsFiltered = filteredLogs.length;
  const successCallsFiltered = filteredLogs.filter(l => l.success).length;

  const logsByApiKey = useMemo(() => {
    const grouped: Record<string, { name: string; provider: string; logs: CostLog[]; totalCost: number; totalTokens: number }> = {};
    
    filteredLogs.forEach(log => {
      const keyId = log.apiKeyId || 'unknown';
      const keyName = log.apiKeyName || 'Unknown Key';
      const provider = log.provider || 'Unknown Provider';
      
      if (!grouped[keyId]) {
        grouped[keyId] = {
          name: keyName,
          provider: provider,
          logs: [],
          totalCost: 0,
          totalTokens: 0
        };
      }
      
      grouped[keyId].logs.push(log);
      if (log.success) {
        grouped[keyId].totalCost += log.cost;
        grouped[keyId].totalTokens += log.inputTokens + log.outputTokens;
      }
    });
    
    return grouped;
  }, [filteredLogs]);

  const handleApplyPreset = (preset: 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'reset') => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (preset === 'today') {
      const dateStr = today.toISOString().split('T')[0];
      setStartDateStr(dateStr);
      setEndDateStr(dateStr);
    } else if (preset === 'yesterday') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const dateStr = yesterday.toISOString().split('T')[0];
      setStartDateStr(dateStr);
      setEndDateStr(dateStr);
    } else if (preset === 'last7') {
      const lastWeek = new Date();
      lastWeek.setDate(lastWeek.getDate() - 7);
      setStartDateStr(lastWeek.toISOString().split('T')[0]);
      setEndDateStr(today.toISOString().split('T')[0]);
    } else if (preset === 'thisMonth') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      setStartDateStr(firstDay.toISOString().split('T')[0]);
      setEndDateStr(today.toISOString().split('T')[0]);
    } else if (preset === 'reset') {
      setStartDateStr('');
      setEndDateStr('');
      setSelectedModelFilter('all');
    }
  };

  const handleClearLogs = () => {
    if (confirmClear) {
      clearStoredLogs();
      setLogs([]);
      setConfirmClear(false);
    } else {
      setConfirmClear(true);
      setTimeout(() => setConfirmClear(false), 4000);
    }
  };

  return (
    <div className="bg-bg3 border border-border/85 rounded-2xl p-5 mb-6 text-text relative select-none" id="cost-tracker-dashboard-root">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-border/70 pb-4 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
            <DollarSign size={18} />
          </div>
          <div>
            <h2 className="font-sans text-[15px] font-normal uppercase tracking-wide text-text">
              Approx API Cost & Token Analytics
            </h2>
            <p className="text-[10px] text-text3 font-sans">
              REAL-TIME TRANSACTION METRICS & HYPOTHETICAL LYRIA RATES
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button 
            id="cost-tracker-refresh-btn"
            onClick={loadLogs}
            className="p-1.5 rounded-lg bg-bg2 hover:bg-neutral-800 text-text3 hover:text-text transition-colors border border-border/60 cursor-pointer text-xs flex items-center gap-1 font-mono uppercase font-black"
            title="Refresh logs state"
          >
            <RefreshCw size={11} />
            <span>Sync</span>
          </button>

          {logs.length > 0 && (
            <button
              id="cost-tracker-clear-btn"
              onClick={handleClearLogs}
              className={`p-1.5 px-3 rounded-lg text-xs font-black uppercase font-mono tracking-wider transition-all duration-200 border cursor-pointer flex items-center gap-1.5 ${
                confirmClear 
                  ? 'bg-red-500/20 border-red-500/50 text-red-400 animate-pulse' 
                  : 'bg-bg2 border-border/60 hover:border-red-500/20 hover:bg-red-500/10 hover:text-red-400 text-text3'
              }`}
            >
              <Trash2 size={11} />
              <span>{confirmClear ? 'Double-Click Confirm Reset' : 'Reset History'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Alert Banner for budget warnings */}
      {(() => {
        const currentWarningThreshold = (() => {
          if (isBudgetExceeded) return 100;
          if (isAt99Percent) return 99;
          if (isAt90Percent) return 90;
          if (isAt75Percent) return 75;
          return 0;
        })();

        if (budgetCap > 0 && currentWarningThreshold > 0 && !dismissedWarnings[currentWarningThreshold]) {
          return (
            <div 
              className={`border rounded-xl p-3.5 mb-4 flex items-start gap-3.5 relative transition-all animate-in fade-in slide-in-from-top-3 duration-300 ${
                currentWarningThreshold === 100 
                  ? 'bg-red-500/10 border-red-500/40 text-red-200' 
                  : currentWarningThreshold === 99 
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' 
                    : currentWarningThreshold === 90 
                      ? 'bg-amber-500/10 border-amber-500/30 text-amber-200' 
                      : 'bg-yellow-500/5 border-yellow-500/25 text-yellow-100'
              }`}
              id={`budget-warning-banner-${currentWarningThreshold}`}
            >
              <div className="pt-0.5 shrink-0">
                <AlertTriangle className={`w-5 h-5 ${
                  currentWarningThreshold >= 99 ? 'text-red-400 animate-bounce' : 'text-amber-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <h4 className="text-xs font-bold uppercase font-mono tracking-wider flex items-center gap-2">
                  {currentWarningThreshold === 100 && "🚨 CRITICAL: MONTHLY BUDGET EXCEEDED"}
                  {currentWarningThreshold === 99 && "⚠️ CRITICAL LIMIT: 99% BUDGET REACHED"}
                  {currentWarningThreshold === 90 && "⚡ WARNING: 90% BUDGET REACHED"}
                  {currentWarningThreshold === 75 && "📊 NOTICE: 75% BUDGET REACHED"}
                </h4>
                <p className="text-[11px] opacity-90 mt-1 leading-relaxed font-sans">
                  {currentWarningThreshold === 100 && (
                    <>You have spent <strong>{formatUSD(totalCostThisMonth)}</strong>, which is over your <strong>{formatUSD(budgetCap)}</strong> cap. Generation requests might be capped or paused to avoid further charges.</>
                  )}
                  {currentWarningThreshold === 99 && (
                    <>You are at <strong>{percentSpent.toFixed(1)}%</strong> of your monthly cap. Spent <strong>{formatUSD(totalCostThisMonth)}</strong> out of <strong>{formatUSD(budgetCap)}</strong> limit. Only 1% budget remaining!</>
                  )}
                  {currentWarningThreshold === 90 && (
                    <>You have used <strong>{percentSpent.toFixed(1)}%</strong> of your monthly cap. Spent <strong>{formatUSD(totalCostThisMonth)}</strong> of <strong>{formatUSD(budgetCap)}</strong> limit. Monitor your usage closely.</>
                  )}
                  {currentWarningThreshold === 75 && (
                    <>You have crossed 75% of your monthly limit. Spent <strong>{formatUSD(totalCostThisMonth)}</strong> of your <strong>{formatUSD(budgetCap)}</strong> cap.</>
                  )}
                </p>
              </div>
              <button 
                onClick={() => setDismissedWarnings(prev => ({ ...prev, [currentWarningThreshold]: true }))}
                className="text-text3 hover:text-white hover:bg-white/10 px-2 py-1 rounded-md transition-colors text-[10px] font-mono shrink-0 cursor-pointer border border-border/40"
                title="Dismiss Alert"
              >
                ✕ Dismiss
              </button>
            </div>
          );
        }
        return null;
      })()}

      {/* Monthly Budget Cap Controller & Visualizer */}
      <div className="bg-bg2/40 border border-border/60 rounded-xl p-4 mb-5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-5 animate-in fade-in slide-in-from-top-2 duration-300" id="monthly-budget-cap-panel">
        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-normal uppercase tracking-wider text-text font-sans">📅 Monthly Budget Cap</span>
            {isBudgetExceeded ? (
              <span className="text-[9px] font-sans font-normal uppercase text-red-400 bg-red-400/10 border border-red-500/20 px-2 py-0.5 rounded-full animate-pulse">
                Exceeded
              </span>
            ) : percentSpent >= 99 ? (
              <span className="text-[9px] font-sans font-normal uppercase text-rose-400 bg-rose-400/10 border border-rose-500/20 px-2 py-0.5 rounded-full animate-pulse">
                Limit (99%+)
              </span>
            ) : percentSpent >= 90 ? (
              <span className="text-[9px] font-sans font-normal uppercase text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full animate-pulse">
                Limit (90%+)
              </span>
            ) : percentSpent >= 75 ? (
              <span className="text-[9px] font-sans font-normal uppercase text-yellow-400 bg-yellow-400/10 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                Warning (75%+)
              </span>
            ) : (
              <span className="text-[9px] font-sans font-normal uppercase text-emerald-400 bg-emerald-400/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                Within Budget
              </span>
            )}
          </div>
          <p className="text-[12px] text-text3 font-sans leading-relaxed">
            MTD SPENDING: <strong className="text-text font-normal">{formatUSD(totalCostThisMonth)}</strong> OF <strong className="text-text font-normal">{budgetCap > 0 ? formatUSD(budgetCap) : 'UNLIMITED'}</strong> ({budgetProgress.toFixed(1)}%)
          </p>
          
          {/* Progress bar */}
          <div className="w-full bg-bg3 rounded-full h-2 mt-2.5 overflow-hidden border border-border/40 relative">
            <div 
              className={`h-full transition-all duration-500 ease-out rounded-full ${
                isBudgetExceeded 
                  ? 'bg-gradient-to-r from-red-500 to-rose-600' 
                  : percentSpent >= 99 
                    ? 'bg-gradient-to-r from-rose-500 to-red-500'
                    : percentSpent >= 90
                      ? 'bg-gradient-to-r from-amber-500 to-rose-400'
                      : percentSpent >= 75
                        ? 'bg-gradient-to-r from-yellow-400 to-amber-500' 
                        : 'bg-gradient-to-r from-emerald-400 to-teal-500'
              }`}
              style={{ width: `${budgetProgress}%` }}
            />
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-3 bg-bg3/60 p-3 rounded-xl border border-border/60 justify-between md:justify-start">
          <div className="text-left">
            <label htmlFor="budget-cap-val" className="block text-[9px] font-sans font-normal uppercase tracking-wider text-text3 mb-1">
              Monthly Limit (USD)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold text-text3">$</span>
              <input
                id="budget-cap-val"
                type="number"
                step="1"
                min="0"
                value={budgetCap || ''}
                onChange={(e) => handleBudgetCapChange(e.target.value)}
                className="w-24 bg-bg2 border border-border/80 rounded-lg p-1.5 px-2 text-xs font-mono font-normal text-white focus:outline-none focus:border-accent text-right cursor-text"
                placeholder="0.00"
              />
              <span className="text-[9px] font-sans text-text3 shrink-0">USD</span>
            </div>
          </div>
          <div className="flex flex-col gap-1 shrink-0 pt-3">
            <button
              onClick={() => handleBudgetCapChange('5')}
              className="px-1.5 py-0.5 text-[10px] font-sans font-normal uppercase rounded bg-bg2 border border-border/60 hover:text-accent hover:border-accent transition-colors cursor-pointer"
              title="Set $5 Cap"
            >
              $5
            </button>
            <button
              onClick={() => handleBudgetCapChange('10')}
              className="px-1.5 py-0.5 text-[10px] font-sans font-normal uppercase rounded bg-bg2 border border-border/60 hover:text-accent hover:border-accent transition-colors cursor-pointer"
              title="Set $10 Cap"
            >
              $10
            </button>
          </div>
        </div>
      </div>

      {/* Overview Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5" id="cost-summary-cards-grid">
        <div className="p-4 bg-bg2/60 border border-border/50 rounded-xl flex flex-col justify-between" id="cost-card-session-cost">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-normal tracking-wider uppercase text-text3 font-sans">Session Cost</span>
            <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.2 rounded-full font-sans uppercase">Active</span>
          </div>
          <div>
            <p className="text-[21px] font-sans text-text font-normal leading-tight">
              {formatUSD(totalCostCurrentSession)}
            </p>
            <p className="text-[9px] text-text3 truncate leading-none mt-1 font-sans">
              {currentSessionLogs.filter(l => l.success).length} successful actions
            </p>
          </div>
        </div>

        <div className="p-4 bg-bg2/60 border border-border/50 rounded-xl flex flex-col justify-between" id="cost-card-filtered-cost">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-normal tracking-wider uppercase text-text3 font-sans">Selected Cost</span>
            <span className="text-[9px] font-normal text-accent bg-accent/10 px-1.5 py-0.2 rounded-full font-sans uppercase">Filter</span>
          </div>
          <div>
            <p className="text-[21px] font-sans text-accent font-normal leading-tight">
              {formatUSD(totalCostFiltered)}
            </p>
            <p className="text-[9px] text-text3 truncate leading-none mt-1 font-sans">
              Dates matched: {totalCallsFiltered} records
            </p>
          </div>
        </div>

        <div className="p-4 bg-bg2/60 border border-border/50 rounded-xl flex flex-col justify-between" id="cost-card-estimated-tokens">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-normal tracking-wider uppercase text-text3 font-sans">Calculated Tokens</span>
            <Activity size={10} className="text-text3 font-sans" />
          </div>
          <div>
            <p className="text-[21px] font-sans text-text2 font-normal leading-tight">
              {new Intl.NumberFormat('en-US').format(totalInputTokensFiltered + totalOutputTokensFiltered)}
            </p>
            <p className="text-[9px] text-text3 truncate leading-none mt-1 font-sans">
              In: {new Intl.NumberFormat('en-US').format(totalInputTokensFiltered)} / Out: {new Intl.NumberFormat('en-US').format(totalOutputTokensFiltered)}
            </p>
          </div>
        </div>

        <div className="p-4 bg-bg2/60 border border-border/50 rounded-xl flex flex-col justify-between" id="cost-card-overall-cost">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[9px] font-normal tracking-wider uppercase text-text3 font-sans">Accumulated Total</span>
            <Award size={11} className="text-pink-400 font-sans" />
          </div>
          <div>
            <p className="text-[21px] font-sans text-pink-400 font-normal leading-tight">
              {formatUSD(totalCostOverall)}
            </p>
            <p className="text-[9px] text-text3 truncate leading-none mt-1 font-sans font-normal">
              All sessions in local cache
            </p>
          </div>
        </div>
      </div>

      {/* Date & Range Controller */}
      <div className="bg-bg2/40 p-4 border border-border/50 rounded-xl mb-5" id="cost-tracker-filters-board">
        <h3 className="text-[9px] font-normal uppercase tracking-wider text-text3 font-sans mb-3 flex items-center gap-1.5">
          <Calendar size={11} className="text-accent" />
          Filter Logs & Date Range Calculator
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 items-end">
          {/* Start Date */}
          <div id="filter-start-group">
            <label htmlFor="filter-start-date" className="block text-[9px] font-sans font-normal uppercase tracking-wider text-text3 mb-1">
              Start Date
            </label>
            <input 
              id="filter-start-date"
              type="date" 
              value={startDateStr}
              onChange={(e) => setStartDateStr(e.target.value)}
              className="w-full bg-bg3 border border-border/90 rounded-lg p-2 text-xs font-sans font-normal text-white focus:outline-none focus:border-accent cursor-text"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* End Date */}
          <div id="filter-end-group">
            <label htmlFor="filter-end-date" className="block text-[9px] font-sans font-normal uppercase tracking-wider text-text3 mb-1">
              End Date
            </label>
            <input 
              id="filter-end-date"
              type="date"
              value={endDateStr}
              onChange={(e) => setEndDateStr(e.target.value)}
              className="w-full bg-bg3 border border-border/90 rounded-lg p-2 text-xs font-sans font-normal text-white focus:outline-none focus:border-accent cursor-text"
              style={{ colorScheme: 'dark' }}
            />
          </div>

          {/* Model Filter */}
          <div id="filter-model-group">
            <label htmlFor="filter-model-select" className="block text-[9px] font-sans font-normal uppercase tracking-wider text-text3 mb-1">
              Filter by Model
            </label>
            <div className="relative">
              <select
                id="filter-model-select"
                value={selectedModelFilter}
                onChange={(e) => setSelectedModelFilter(e.target.value)}
                className="w-full bg-bg3 border border-border/90 rounded-lg p-2 text-xs font-sans font-normal text-white focus:outline-none focus:border-accent appearance-none cursor-pointer pr-8"
                style={{ colorScheme: 'dark' }}
              >
                <option value="all">Select All Models</option>
                {Array.from(new Set(Object.values(PRICING_RATES).map(r => r.name))).map(name => {
                  const key = Object.keys(PRICING_RATES).find(k => PRICING_RATES[k].name === name) || name;
                  return (
                    <option key={key} value={key}>{name}</option>
                  );
                })}
              </select>
              <ChevronDown size={12} className="absolute right-3 top-[50%] -translate-y-1/2 text-neutral-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-border/30" id="filter-presets-row">
          <span className="text-[9px] font-normal uppercase font-sans text-text3 py-1 mr-1">Presets:</span>
          {['today', 'yesterday', 'last7', 'thisMonth', 'reset'].map((preset) => {
            const labels: Record<string, string> = {
              today: 'Today',
              yesterday: 'Yesterday',
              last7: 'Last 7 Days',
              thisMonth: 'This Month',
              reset: 'Reset Filters'
            };
            return (
              <button
                key={preset}
                type="button"
                id={`preset-${preset}-btn`}
                onClick={() => handleApplyPreset(preset as any)}
                className={`px-2 py-0.5 text-[9px] uppercase font-sans rounded-md border transition-all cursor-pointer ${
                  preset === 'reset'
                    ? 'font-bold bg-neutral-800/50 border-neutral-700 hover:bg-neutral-800 hover:text-white'
                    : 'font-normal bg-bg2 hover:border-accent hover:text-accent border-border/50 text-text3'
                }`}
              >
                {labels[preset]}
              </button>
            );
          })}
        </div>
      </div>

      {/* Sessions and Transaction Log History list */}
      <div className="bg-bg2/25 border border-border/50 rounded-xl p-4" id="cost-tracker-logs-container">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-[11px] font-normal uppercase tracking-wider text-text3 font-sans flex items-center gap-1.5">
            <FileText size={11} className="text-pink-400" />
            Transactional Session History ({filteredLogs.length} Entries)
          </h3>
          <span className="text-[11px] font-sans text-text3">
            {successCallsFiltered} successful / {totalCallsFiltered - successCallsFiltered} failed
          </span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-text3 font-sans font-normal border border-dashed border-border/50 rounded-lg">
            No API transaction logs found block. Connect an API Key profile above and run generation cards to capture cost analytics.
          </div>
        ) : (
          <div className="space-y-4 max-h-72 overflow-y-auto pr-1 custom-scroll font-sans font-normal" id="cost-tracker-logs-scroller">
            {Object.entries(logsByApiKey).map(([keyId, group]) => (
              <div key={keyId} className="space-y-2">
                <div className="flex items-center justify-between sticky top-0 bg-bg2/95 backdrop-blur z-10 p-2 px-3 rounded-lg border border-border/50 mb-2 shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-text uppercase tracking-wider">{group.name}</span>
                    <span className="text-[9px] text-text3 font-mono">{group.provider}</span>
                  </div>
                  <div className="text-right flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-400">{formatUSD(group.totalCost)}</span>
                    <span className="text-[9px] text-text3 font-mono">{new Intl.NumberFormat('en-US').format(group.totalTokens)} tokens</span>
                  </div>
                </div>

                {group.logs.slice().reverse().map((log) => {
                  const rateDetails = resolveRate(log.modelId);
                  const isCurrentSession = log.sessionId === currentSessionId;
                  const formattedTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
                  const formattedDate = new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <div 
                      key={log.id}
                      className={`bg-bg2/80 rounded-lg border p-3 hover:border-border transition-all ml-2 ${
                        log.success ? 'border-border/40' : 'border-red-500/20'
                      }`}
                      id={`log-row-${log.id}`}
                    >
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0 pr-1">
                      {log.success ? (
                        <CheckCircle size={12} className="text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle size={12} className="text-red-400 shrink-0" />
                      )}
                      
                      <div className="truncate text-left">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-bold text-text truncate">
                            {rateDetails.name}
                          </span>
                          <span className="text-[9px] font-black uppercase font-mono px-1.5 py-0.2 bg-bg3 rounded text-text3">
                            {log.type}
                          </span>
                          {isCurrentSession && (
                            <span className="text-[8px] font-black uppercase font-mono px-1 text-emerald-400 bg-emerald-400/15 rounded">
                              Current Session
                            </span>
                          )}
                        </div>
                        <p className="text-[9px] font-mono text-text3 mt-0.5 whitespace-nowrap">
                          {formattedDate} @ {formattedTime} • ID: {log.id}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 text-right font-mono">
                      <div className="text-[10px] text-text3">
                        <p>{log.inputTokens + log.outputTokens} tkn</p>
                      </div>
                      <div>
                        {log.success ? (
                          <span className="text-xs font-bold text-emerald-400">
                            {formatUSD(log.cost)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-black uppercase text-red-500">
                            Failed
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-text3 hover:text-text p-0.5 rounded cursor-pointer"
                        title="Toggle parameters"
                      >
                        <ChevronDown size={11} className={`transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-border/30 text-[10px] font-mono text-text2 space-y-2 bg-black/20 p-2.5 rounded-lg animate-in slide-in-from-top-1">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <p className="text-text3 text-[8px] uppercase font-black">Prompt text length</p>
                          <p>{Math.round(log.inputTokens * 4)} characters ({log.inputTokens} estimated tokens)</p>
                        </div>
                        <div>
                          <p className="text-text3 text-[8px] uppercase font-black">Outputs size</p>
                          <p>{log.success ? `${Math.round(log.outputTokens * 4)} characters (${log.outputTokens} est. tokens)` : 'Empty'}</p>
                        </div>
                      </div>
                      <div>
                        <p className="text-text3 text-[8px] uppercase font-black">Hypothetical Billing Model pricing</p>
                        {rateDetails.flatRate !== undefined ? (
                          <p>Flat generator cost: {formatUSD(rateDetails.flatRate)} per batch action</p>
                        ) : rateDetails.ratePerSecond !== undefined ? (
                          <p>Streaming connection: {formatUSD(rateDetails.ratePerSecond)}/second of rendering</p>
                        ) : (
                          <p>Token usage: In {formatUSD((rateDetails as any).input * 1000000)}/1M, Out {formatUSD((rateDetails as any).output * 1000000)}/1M</p>
                        )}
                      </div>
                      <div className="text-[9px] text-text3 select-text bg-bg2/60 p-2 rounded max-h-16 overflow-y-auto break-all border border-border/45">
                        <strong className="text-[8px] uppercase font-bold text-text2 block mb-0.5">Session Signature</strong>
                        {log.sessionId}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
