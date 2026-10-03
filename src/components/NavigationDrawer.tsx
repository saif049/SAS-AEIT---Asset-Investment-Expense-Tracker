/**
 * Navigation Drawer Component
 * Replicates the behavior and aesthetic of @react-navigation/drawer
 * with left-folding menu, active route indicators, tablet/mobile view mode,
 * and direct Android APK installation.
 */

import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  FolderTree,
  Building,
  Shield,
  HardDrive,
  X,
  GraduationCap,
  Phone,
  Mail,
  Download,
  CheckCircle2,
  Target,
  Smartphone,
} from 'lucide-react';
import { NavigationScreen } from '../store/useAppStore';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { DeviceInfo } from '../hooks/useDeviceScreen';

interface NavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeScreen: NavigationScreen;
  onSelectScreen: (screen: NavigationScreen) => void;
  summary: {
    categoriesCount: number;
    expensesCount: number;
    incomesCount: number;
    systemLogsCount: number;
  };
  deviceInfo?: DeviceInfo;
  onOpenDeviceFitModal?: () => void;
}

export const NavigationDrawer: React.FC<NavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeScreen,
  onSelectScreen,
  summary,
  deviceInfo,
  onOpenDeviceFitModal,
}) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const navItems = [
    {
      id: 'dashboard' as NavigationScreen,
      label: 'Dashboard Overview',
      subtitle: 'Module 5 · Cards A–H & Metrics',
      icon: LayoutDashboard,
    },
    {
      id: 'savings_goals' as NavigationScreen,
      label: 'Savings Goals Hub',
      subtitle: 'Targets, BDT Tracking & Investments',
      icon: Target,
      highlight: true,
    },
    {
      id: 'entry' as NavigationScreen,
      label: 'Direct Entry Form',
      subtitle: 'Module 3 · BDT Formatter & Audit',
      icon: PlusCircle,
    },
    {
      id: 'categories' as NavigationScreen,
      label: 'Categories & Sub-Items',
      subtitle: 'Module 2 · Cascading Master Tree',
      icon: FolderTree,
      badge: summary.categoriesCount,
    },
    {
      id: 'investments' as NavigationScreen,
      label: 'Asset Modules',
      subtitle: 'Module 4 · Stocks, Land, Vehicles',
      icon: Building,
    },
    {
      id: 'audit_logs' as NavigationScreen,
      label: 'System Audit Logs',
      subtitle: 'Module 2 · SQLite SystemLogs',
      icon: Shield,
      badge: summary.systemLogsCount,
    },
    {
      id: 'backup_restore' as NavigationScreen,
      label: 'Backup & Restore',
      subtitle: 'Module 6 · Local JSON & Cloud Sync',
      icon: HardDrive,
    },
  ];

  return (
    <>
      {/* Backdrop for mobile drawer */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/85 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* Drawer Surface */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
              AE
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-white">SAS-AEIT</h1>
              <p className="text-[10px] text-slate-400">Asset, Investment &amp; Expense Tracker</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer transition-colors"
            aria-label="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Standalone Mobile App Status Banner */}
        <div className="p-3 mx-3 my-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Standalone Mobile App
            </span>
            <p className="text-[10px] text-slate-400 mt-0.5">SQLite Local Engine &middot; Offline PWA</p>
          </div>
          <span className="px-2 py-0.5 text-[9px] font-mono rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
            v1.0.0
          </span>
        </div>

        {/* Mobile Screen Fit Status Pill */}
        {deviceInfo && onOpenDeviceFitModal && (
          <button
            type="button"
            onClick={onOpenDeviceFitModal}
            className="mx-3 mb-2 p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all cursor-pointer flex items-center justify-between group"
          >
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 group-hover:scale-105 transition-transform">
                <Smartphone className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-slate-200 truncate">
                  {deviceInfo.modelName}
                </div>
                <div className="text-[9px] text-emerald-400 font-mono">
                  {deviceInfo.viewportWidth} × {deviceInfo.viewportHeight} px · {deviceInfo.screenCategory}
                </div>
              </div>
            </div>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0 ml-1">
              Screen Fit
            </span>
          </button>
        )}

        {/* In-App Direct Android Install Banner */}
        {isInstallable && !isInstalled && (
          <div className="mx-3 mb-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between">
            <div className="text-[11px]">
              <p className="font-semibold text-emerald-300">Android APK Ready</p>
              <p className="text-[10px] text-slate-400">Install native app</p>
            </div>
            <button
              onClick={install}
              className="px-2.5 py-1 rounded bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Download className="w-3 h-3" />
              <span>Install</span>
            </button>
          </div>
        )}

        {isInstalled && (
          <div className="mx-3 mb-2 p-2 rounded-lg bg-slate-900 border border-emerald-500/30 text-[11px] text-emerald-300 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Standalone Android Active</span>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeScreen === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onSelectScreen(item.id);
                  onClose();
                }}
                className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-white'
                    : item.highlight
                    ? 'bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 hover:bg-emerald-900/40'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? 'text-emerald-400'
                        : item.highlight
                        ? 'text-emerald-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <div className="truncate">
                    <p
                      className={`text-xs font-semibold truncate ${
                        isActive ? 'text-white' : item.highlight ? 'text-emerald-300' : 'text-slate-300'
                      }`}
                    >
                      {item.label}
                    </p>
                    <p className="text-[10px] text-slate-500 truncate">{item.subtitle}</p>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* SQLite Storage Status */}
        <div className="p-3 mx-3 mb-2 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SQLite Offline Active</span>
          </div>
          <span className="font-mono text-emerald-400">expo-sqlite</span>
        </div>

        {/* Drawer Footer Badge (Developer Info) */}
        <div className="p-3.5 border-t border-slate-800 bg-slate-950/80 text-[11px]">
          <div className="flex items-center gap-1.5 text-slate-200 font-semibold mb-0.5">
            <GraduationCap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span className="truncate">SAIF AHMED SAKIL</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight mb-2">
            MS in Applied Statistics, ISRT, DU & LL.B
          </p>
          <div className="flex flex-col gap-1 text-[10px] font-mono text-slate-400">
            <a href="tel:+8801611447765" className="hover:text-emerald-400 flex items-center gap-1">
              <Phone className="w-3 h-3 text-emerald-500" />
              <span>+8801611447765</span>
            </a>
            <a href="mailto:saif049@gmail.com" className="hover:text-emerald-400 flex items-center gap-1">
              <Mail className="w-3 h-3 text-blue-400" />
              <span>saif049@gmail.com</span>
            </a>
          </div>
        </div>
      </aside>
    </>
  );
};
