/**
 * Android APK & PWA Installation Hub
 * Supports:
 * 1. One-tap direct Android WebAPK installation
 * 2. Expo EAS APK build configuration & app.json download
 * 3. Google Bubblewrap TWA (Trusted Web Activity) APK build guide
 * 4. Step-by-step sideloading and Android tablet & mobile guidelines
 */

import React, { useState } from 'react';
import {
  Smartphone,
  Download,
  CheckCircle2,
  Terminal,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  Layers,
  Tablet,
  Sparkles,
  Info,
} from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const AndroidApkInstallHub: React.FC = () => {
  const { isInstallable, isInstalled, isAndroid, isIOS, install } = usePWAInstall();
  const [copiedSection, setCopiedSection] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'direct_apk' | 'android_widget' | 'expo_eas' | 'twa_bubblewrap'>('direct_apk');

  const copyToClipboard = async (text: string, sectionId: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(sectionId);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  // Pre-configured Expo app.json for Android APK compilation
  const expoAppJson = {
    expo: {
      name: "SAS-AEIT - Asset, Investment & Expense Tracker",
      slug: "sas-aeit-tracker",
      version: "1.0.0",
      orientation: "default",
      icon: "./public/pwa-512x512.png",
      userInterfaceStyle: "dark",
      splash: {
        image: "./public/pwa-512x512.png",
        resizeMode: "contain",
        backgroundColor: "#020617"
      },
      assetBundlePatterns: ["**/*"],
      ios: {
        supportsTablet: true,
        bundleIdentifier: "com.saifahmed.sasaeit"
      },
      android: {
        adaptiveIcon: {
          foregroundImage: "./public/pwa-maskable-512x512.png",
          backgroundColor: "#020617"
        },
        package: "com.saifahmed.sasaeit",
        versionCode: 1,
        permissions: [
          "READ_EXTERNAL_STORAGE",
          "WRITE_EXTERNAL_STORAGE"
        ]
      },
      web: {
        favicon: "./public/icon.svg",
        bundler: "metro"
      },
      plugins: [
        [
          "expo-sqlite",
          {
            enableFTS: true
          }
        ]
      ]
    }
  };

  const easJson = {
    cli: {
      version: ">= 12.0.0"
    },
    build: {
      development: {
        developmentClient: true,
        distribution: "internal"
      },
      preview: {
        distribution: "internal",
        android: {
          buildType: "apk"
        }
      },
      production: {
        android: {
          buildType: "apk"
        }
      }
    },
    submit: {
      production: {}
    }
  };

  const handleDownloadAppJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(expoAppJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "app.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadEasJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(easJson, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "eas.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const easBuildCommand = `# Step 1: Install EAS CLI globally (if not already installed)
npm install -g eas-cli

# Step 2: Log in to Expo account
eas login

# Step 3: Configure Android build profile
eas build:configure

# Step 4: Build standalone Android APK file for direct sideloading
eas build -p android --profile preview`;

  const bubblewrapCommand = `# Step 1: Install Google Bubblewrap CLI
npm i -g @bubblewrap/cli

# Step 2: Initialize Android APK project from this app's PWA Manifest
bubblewrap init --manifest="${window.location.origin}/manifest.webmanifest"

# Step 3: Compile into signed Android APK
bubblewrap build

# Output: app-release-signed.apk ready to install directly on any Android phone or tablet!`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-500/30 rounded-2xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Android Deployment Ready
            </span>
            <h2 className="text-xl font-bold tracking-tight text-white mt-1.5 flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-emerald-400" />
              Android APK & Tablet/Mobile Installation
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl">
              Install directly onto any Android smartphone or tablet as an offline-first native app
              (WebAPK), or compile standalone <code>.apk</code> packages via Expo EAS or Google Bubblewrap.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {isInstalled ? (
              <div className="px-4 py-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-semibold text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Running in Standalone Mode</span>
              </div>
            ) : isInstallable ? (
              <button
                onClick={install}
                className="px-5 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Install Android App (WebAPK)</span>
              </button>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs flex items-center gap-2">
                <Info className="w-4 h-4 text-blue-400" />
                <span>Ready for Android & Tablet Install</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
        <button
          onClick={() => setActiveTab('direct_apk')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'direct_apk'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>1. Direct Android WebAPK</span>
        </button>

        <button
          onClick={() => setActiveTab('android_widget')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'android_widget'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-400" />
          <span>2. Android Home Screen Widget</span>
        </button>

        <button
          onClick={() => setActiveTab('expo_eas')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'expo_eas'
              ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>3. Expo Standalone APK Build</span>
        </button>

        <button
          onClick={() => setActiveTab('twa_bubblewrap')}
          className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
            activeTab === 'twa_bubblewrap'
              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>4. Google Bubblewrap CLI APK</span>
        </button>
      </div>

      {/* TAB 1: Direct WebAPK Install */}
      {activeTab === 'direct_apk' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Direct Installation on Android Phone / Tablet
            </h3>
            <p className="text-xs text-slate-400">
              When opened in Chrome, Edge, or Samsung Internet on Android, the operating system directly packages SAS-AEIT into a real <strong>WebAPK</strong>.
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  1
                </span>
                <div className="text-xs">
                  <strong className="text-slate-200">Open on your Android device</strong>
                  <p className="text-slate-400 mt-0.5">Visit this app's preview URL in Chrome or your device browser.</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  2
                </span>
                <div className="text-xs">
                  <strong className="text-slate-200">Tap "Install App" or "Add to Home Screen"</strong>
                  <p className="text-slate-400 mt-0.5">
                    Click the in-app install button or open the browser menu (⋮) and select <strong>Install App</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                  3
                </span>
                <div className="text-xs">
                  <strong className="text-slate-200">Native Android App Launcher</strong>
                  <p className="text-slate-400 mt-0.5">
                    The app appears in your Android App Drawer alongside native APKs, with dedicated notifications, full screen layout, and offline SQLite cache!
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tablet & Mobile Features Card */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Tablet className="w-4 h-4 text-blue-400" />
              Tablet & Mobile Form-Factor Capabilities
            </h3>
            <p className="text-xs text-slate-400">
              The application provides dynamic responsive adaptation for phones, phablets, and tablets:
            </p>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <strong className="text-emerald-300 block mb-1">📱 Mobile Smartphone Ergonomics</strong>
                <ul className="text-slate-400 space-y-1 list-disc pl-4">
                  <li>Collapsible left drawer navigation with touch gesture support</li>
                  <li>Bottom quick action bar for rapid transaction logging on the go</li>
                  <li>BDT numeric keypad input optimized for thumb reach</li>
                </ul>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <strong className="text-blue-300 block mb-1">📟 Android Tablet Dual-Pane Mode</strong>
                <ul className="text-slate-400 space-y-1 list-disc pl-4">
                  <li>Side-by-side master categories and cascading subcategories list</li>
                  <li>Full horizontal orientation with 30-day bar diagram expanded</li>
                  <li>Touch targets compliant with WCAG AA (≥ 44px)</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Android Home Screen Widget */}
      {activeTab === 'android_widget' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="pb-3 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                  Android 14 / 15 Native Home Screen Widget
                </span>
                <span className="text-xs text-slate-500">·</span>
                <span className="text-xs text-slate-400">Jetpack Glance &amp; AppWidgetProvider</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Future Purchase Tasks Android Widget ("Android Wetget")</span>
              </h3>
              <p className="text-xs text-slate-400">
                Place interactive purchase tasks directly onto your Android phone or tablet home screen with 1-tap check-off, quantity units (No / Kg / Litre), target dates, and remarks.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center font-mono text-[11px]">1</span>
                <span>Long-Press Home Screen</span>
              </div>
              <p className="text-slate-400">
                Press and hold any blank area on your Android home screen, then tap the <strong>"Widgets"</strong> menu item.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center font-mono text-[11px]">2</span>
                <span>Select SAS-AEIT</span>
              </div>
              <p className="text-slate-400">
                Scroll to <strong>SAS-AEIT</strong> and select the <strong>Purchase Tasks Widget</strong>. Choose between 4×2 (List), 3×2 (Compact), or 2×2 (Glance).
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center font-mono text-[11px]">3</span>
                <span>Instant 1-Tap Check-Off</span>
              </div>
              <p className="text-slate-400">
                Tap the circle icon next to any item to mark it as purchased in real time. Quantities (No / Kg / Litre) and dates update automatically.
              </p>
            </div>
          </div>

          {/* Widget Features Strip */}
          <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="space-y-1">
              <strong className="text-emerald-300 font-semibold block">
                Live Simulator Available in Module 8
              </strong>
              <p className="text-slate-300 text-[11px]">
                You can also preview and interact with the live Material You Android Widget simulator inside Module 8 at any time.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(`// Android Jetpack Glance Widget: PurchaseTaskWidget.kt
package com.saifahmed.sasaeit
class PurchaseTaskWidget : GlanceAppWidget() { ... }`, 'widget_code')}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              >
                {copiedSection === 'widget_code' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'widget_code' ? 'Copied Kotlin!' : 'Copy Glance Kotlin'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Expo EAS Standalone APK */}
      {activeTab === 'expo_eas' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Compile Standalone Android APK (.apk) with Expo EAS
              </h3>
              <p className="text-xs text-slate-400">
                Generate an installable APK file that you can directly sideload onto any Android phone or tablet without Google Play.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              <button
                onClick={handleDownloadAppJson}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download Expo project configuration"
              >
                <Download className="w-3.5 h-3.5" />
                <span>app.json</span>
              </button>
              <button
                onClick={handleDownloadEasJson}
                className="px-3 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Download EAS pure APK build profile"
              >
                <Download className="w-3.5 h-3.5" />
                <span>eas.json (Pure APK)</span>
              </button>
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-300">Terminal Build Commands</span>
              <button
                onClick={() => copyToClipboard(easBuildCommand, 'eas')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiedSection === 'eas' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'eas' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
              <code>{easBuildCommand}</code>
            </pre>
          </div>
        </div>
      )}

      {/* TAB 3: Google Bubblewrap CLI */}
      {activeTab === 'twa_bubblewrap' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
          <div className="pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Google Bubblewrap TWA (Trusted Web Activity) Builder
            </h3>
            <p className="text-xs text-slate-400">
              Uses Google's official command line utility to wrap the PWA into a native signed Android APK ready for testing or Google Play Store release.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800 text-xs">
              <span className="font-mono text-slate-300">Bubblewrap Commands</span>
              <button
                onClick={() => copyToClipboard(bubblewrapCommand, 'bubblewrap')}
                className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px] cursor-pointer"
              >
                {copiedSection === 'bubblewrap' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedSection === 'bubblewrap' ? 'Copied' : 'Copy Commands'}</span>
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-emerald-300/90 overflow-x-auto leading-relaxed">
              <code>{bubblewrapCommand}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
