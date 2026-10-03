/**
 * Device & Mobile Screen Detection and Responsive Fit Hook
 * Detects device model, screen resolution, aspect ratio, safe areas,
 * and dynamically calculates optimal layouts for mobile phones.
 */

import { useState, useEffect } from 'react';

export type ScreenCategory = 'compact' | 'standard' | 'large-phone' | 'tablet' | 'desktop';

export interface DeviceInfo {
  modelName: string;
  os: 'iOS' | 'Android' | 'Windows' | 'macOS' | 'Linux' | 'Unknown';
  browser: string;
  isMobile: boolean;
  isTouch: boolean;
  screenWidth: number;
  screenHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  orientation: 'portrait' | 'landscape';
  screenCategory: ScreenCategory;
  hasNotch: boolean;
  safeAreaTop: number;
  safeAreaBottom: number;
}

export type SimulatedDevice =
  | 'auto'
  | 'iphone-15-pro'
  | 'iphone-15-promax'
  | 'iphone-se'
  | 'samsung-s24'
  | 'google-pixel-8';

export const SIMULATED_DEVICES: Record<
  SimulatedDevice,
  { name: string; width: number; height: number; dpr: number; os: string; notch: boolean }
> = {
  auto: {
    name: 'Auto-Detect (Current Device)',
    width: 0,
    height: 0,
    dpr: 1,
    os: 'Auto',
    notch: false,
  },
  'iphone-15-pro': {
    name: 'iPhone 15 / 16 Pro',
    width: 393,
    height: 852,
    dpr: 3,
    os: 'iOS',
    notch: true,
  },
  'iphone-15-promax': {
    name: 'iPhone 15 / 16 Pro Max',
    width: 430,
    height: 932,
    dpr: 3,
    os: 'iOS',
    notch: true,
  },
  'iphone-se': {
    name: 'iPhone SE (Compact)',
    width: 375,
    height: 667,
    dpr: 2,
    os: 'iOS',
    notch: false,
  },
  'samsung-s24': {
    name: 'Samsung Galaxy S24',
    width: 412,
    height: 915,
    dpr: 2.6,
    os: 'Android',
    notch: true,
  },
  'google-pixel-8': {
    name: 'Google Pixel 8',
    width: 412,
    height: 892,
    dpr: 2.6,
    os: 'Android',
    notch: true,
  },
};

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      modelName: 'Server Environment',
      os: 'Unknown',
      browser: 'Unknown',
      isMobile: false,
      isTouch: false,
      screenWidth: 390,
      screenHeight: 844,
      viewportWidth: 390,
      viewportHeight: 844,
      devicePixelRatio: 1,
      orientation: 'portrait',
      screenCategory: 'standard',
      hasNotch: false,
      safeAreaTop: 0,
      safeAreaBottom: 0,
    };
  }

  const ua = navigator.userAgent || '';
  const dpr = window.devicePixelRatio || 1;
  const sWidth = window.screen.width;
  const sHeight = window.screen.height;
  const vWidth = window.innerWidth;
  const vHeight = window.innerHeight;
  const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // OS Detection
  let os: DeviceInfo['os'] = 'Unknown';
  if (/iPad|iPhone|iPod/.test(ua)) os = 'iOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/Macintosh|Mac OS X/.test(ua)) os = 'macOS';
  else if (/Windows NT/.test(ua)) os = 'Windows';
  else if (/Linux/.test(ua)) os = 'Linux';

  // Browser Detection
  let browser = 'Browser';
  if (/Chrome|CriOS/.test(ua) && !/Edg/.test(ua)) browser = 'Chrome';
  else if (/Safari/.test(ua) && !/Chrome/.test(ua)) browser = 'Safari';
  else if (/Firefox|FxiOS/.test(ua)) browser = 'Firefox';
  else if (/Edg/.test(ua)) browser = 'Edge';
  else if (/SamsungBrowser/.test(ua)) browser = 'Samsung Internet';

  // Screen Category
  const minDim = Math.min(vWidth, vHeight);
  let screenCategory: ScreenCategory = 'standard';
  if (minDim < 375) screenCategory = 'compact';
  else if (minDim <= 414) screenCategory = 'standard';
  else if (minDim <= 600) screenCategory = 'large-phone';
  else if (minDim <= 900) screenCategory = 'tablet';
  else screenCategory = 'desktop';

  const isMobile =
    os === 'iOS' ||
    os === 'Android' ||
    /Mobile|Android|iP(hone|od)/.test(ua) ||
    (isTouch && minDim < 768);

  // Model Heuristic
  let modelName = 'Mobile Device';
  let hasNotch = false;

  if (os === 'iOS') {
    // Determine iPhone models by physical resolution & ratio
    const maxPhysical = Math.max(sWidth, sHeight);
    const minPhysical = Math.min(sWidth, sHeight);

    if (minPhysical === 430 && maxPhysical === 932) {
      modelName = 'Apple iPhone 15/16 Pro Max';
      hasNotch = true;
    } else if (minPhysical === 393 && maxPhysical === 852) {
      modelName = 'Apple iPhone 15/16 Pro';
      hasNotch = true;
    } else if (minPhysical === 428 && maxPhysical === 926) {
      modelName = 'Apple iPhone 14 Plus / 13 Pro Max';
      hasNotch = true;
    } else if (minPhysical === 390 && maxPhysical === 844) {
      modelName = 'Apple iPhone 14 / 13 / 12';
      hasNotch = true;
    } else if (minPhysical === 414 && maxPhysical === 896) {
      modelName = 'Apple iPhone 11 / XR';
      hasNotch = true;
    } else if (minPhysical === 375 && maxPhysical === 812) {
      modelName = 'Apple iPhone 13 mini / X';
      hasNotch = true;
    } else if (minPhysical === 375 && maxPhysical === 667) {
      modelName = 'Apple iPhone SE (Gen 3)';
      hasNotch = false;
    } else if (/iPad/.test(ua)) {
      modelName = 'Apple iPad';
      hasNotch = false;
    } else {
      modelName = 'Apple iPhone';
      hasNotch = minPhysical < 450 && maxPhysical > 750;
    }
  } else if (os === 'Android') {
    // Match common Android models in UA
    const samsungMatch = ua.match(/SM-[A-Z0-9]+/i);
    const pixelMatch = ua.match(/Pixel\s?[0-9a-zA-Z]+/i);
    const redmiMatch = ua.match(/(Redmi|POCO|Xiaomi)\s?[A-Z0-9\s]+/i);
    const onePlusMatch = ua.match(/OnePlus\s?[A-Z0-9]+/i);

    if (samsungMatch) {
      modelName = `Samsung Galaxy (${samsungMatch[0]})`;
      hasNotch = true;
    } else if (pixelMatch) {
      modelName = `Google ${pixelMatch[0]}`;
      hasNotch = true;
    } else if (redmiMatch) {
      modelName = redmiMatch[0].trim();
      hasNotch = true;
    } else if (onePlusMatch) {
      modelName = onePlusMatch[0].trim();
      hasNotch = true;
    } else {
      modelName = `Android Phone (${Math.round(minDim)}×${Math.round(Math.max(vWidth, vHeight))})`;
      hasNotch = true;
    }
  } else {
    modelName = `${os} Desktop / Workstation (${vWidth}×${vHeight})`;
  }

  // Safe area estimates
  const safeAreaTop = hasNotch ? 44 : 0;
  const safeAreaBottom = hasNotch ? 34 : 0;

  return {
    modelName,
    os,
    browser,
    isMobile,
    isTouch,
    screenWidth: sWidth,
    screenHeight: sHeight,
    viewportWidth: vWidth,
    viewportHeight: vHeight,
    devicePixelRatio: dpr,
    orientation: vWidth > vHeight ? 'landscape' : 'portrait',
    screenCategory,
    hasNotch,
    safeAreaTop,
    safeAreaBottom,
  };
}

export function useDeviceScreen() {
  const [deviceInfo, setDeviceInfo] = useState<DeviceInfo>(detectDevice);
  const [activeSimulation, setActiveSimulation] = useState<SimulatedDevice>('auto');

  useEffect(() => {
    const handleResize = () => {
      setDeviceInfo(detectDevice());
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return {
    deviceInfo,
    activeSimulation,
    setActiveSimulation,
    isSimulating: activeSimulation !== 'auto',
    simulatedConfig: SIMULATED_DEVICES[activeSimulation],
  };
}
