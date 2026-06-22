import { track } from "@vercel/analytics";

export const PWA_PROMPT_EVENT = "nest-pwa-engagement";

const DISMISSED_KEY = "nest_pwa_prompt_dismissed_at";
const INSTALLED_KEY = "nest_pwa_installed_seen";
const ENGAGED_KEY = "nest_pwa_engaged";
const VISITS_KEY = "nest_visit_count";

export function isWindows() {
  return /windows/i.test(navigator.userAgent);
}

export function isStandalonePwa() {
  if (isWindows()) return true;

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true
  );
}

export function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

export function markPwaEngagement(reason: string) {
  localStorage.setItem(ENGAGED_KEY, "true");
  window.dispatchEvent(
    new CustomEvent(PWA_PROMPT_EVENT, { detail: { reason } })
  );
}

export function registerVisitForPwaPrompt() {
  const visits = Number(localStorage.getItem(VISITS_KEY) || "0") + 1;
  localStorage.setItem(VISITS_KEY, String(visits));

  if (visits >= 2) {
    markPwaEngagement("second_visit");
  }
}

export function canShowPwaPrompt() {
  if (isStandalonePwa()) return false;
  if (localStorage.getItem(ENGAGED_KEY) !== "true") return false;

  const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || "0");
  if (!dismissedAt) return true;

  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - dismissedAt > sevenDays;
}

export function dismissPwaPrompt() {
  localStorage.setItem(DISMISSED_KEY, String(Date.now()));
}

export function markPwaInstalled() {
  localStorage.setItem(INSTALLED_KEY, "true");
  track("App installed");
}