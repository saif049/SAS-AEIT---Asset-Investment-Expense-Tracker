/**
 * MODULE 2 (Audit Component): SQLite SystemLogs Live Inspector
 * Provides transparent view of all immutable audit entries recorded across the system.
 */

import React, { useState } from 'react';
import { Shield, Search, Filter, Clock, FileJson, CheckCircle2 } from 'lucide-react';
import { SystemLog, AuditAction } from '../../types/database';

interface AuditLogsViewerProps {
  logs: SystemLog[];
}

export const AuditLogsViewer: React.FC<AuditLogsViewerProps> = ({ logs }) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const filteredLogs = logs.filter((l) => {
    const matchesAction = filterAction === 'ALL' || l.action === filterAction;
    const matchesSearch =
      l.entity_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.details_json.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(l.entity_id).includes(searchQuery);
    return matchesAction && matchesSearch;
  });

  const getActionColor = (action: AuditAction) => {
    switch (action) {
      case 'CREATE':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'EDIT':
        return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
      case 'DELETE':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'STATUS_TOGGLE':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default:
        return 'text-slate-400 bg-slate-800 border-slate-700';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Shield className="w-5 h-5 text-emerald-400" />
            SystemLogs Immutable Audit Trail
          </h2>
          <p className="text-xs text-slate-400">
            Real-time audit records written to SQLite 'SystemLogs' table on every state alteration
          </p>
        </div>

        <span className="text-xs font-mono text-emerald-400 flex items-center gap-1.5 self-start sm:self-auto">
          <CheckCircle2 className="w-4 h-4" />
          <span>{logs.length} Audited Events In SQLite</span>
        </span>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Action Tabs */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 border border-slate-800 rounded-lg">
          {['ALL', 'CREATE', 'EDIT', 'DELETE', 'STATUS_TOGGLE'].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterAction === act
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {act}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-xs w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search payload JSON or entity..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-slate-900 border border-slate-800 text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No audit records match the current filter.
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredLogs.map((log) => {
              const isExpanded = expandedLogId === log.id;
              let parsedJson: Record<string, unknown> = {};
              try {
                parsedJson = JSON.parse(log.details_json);
              } catch {
                parsedJson = { raw: log.details_json };
              }

              return (
                <div key={log.id} className="p-4 hover:bg-slate-800/30 transition-colors text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getActionColor(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {log.entity_type} <span className="font-mono text-slate-400">#{log.entity_id}</span>
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-400 font-mono text-[11px]">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                      <button
                        onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                        className="text-emerald-400 hover:text-emerald-300 font-medium cursor-pointer"
                      >
                        {isExpanded ? 'Hide Payload' : 'View Payload JSON'}
                      </button>
                    </div>
                  </div>

                  {/* Summary preview */}
                  {!isExpanded && (
                    <p className="text-[11px] text-slate-400 font-mono mt-1.5 truncate">
                      {log.details_json}
                    </p>
                  )}

                  {/* Expandable JSON Payload Inspector */}
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-950 rounded-lg border border-slate-800 font-mono text-[11px] text-emerald-400 overflow-x-auto">
                      <div className="flex items-center justify-between text-slate-400 pb-1 mb-2 border-b border-slate-800">
                        <span className="flex items-center gap-1">
                          <FileJson className="w-3.5 h-3.5" />
                          <span>details_json (SQLite Serialized Payload)</span>
                        </span>
                        <span>Log ID: #{log.id}</span>
                      </div>
                      <pre className="whitespace-pre-wrap">
                        {JSON.stringify(parsedJson, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
