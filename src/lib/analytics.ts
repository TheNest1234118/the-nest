import ReactGA from "react-ga4";

export function initAnalytics() {
  ReactGA.initialize(import.meta.env.VITE_GA_ID);
}

export function trackPage(path: string) {
  ReactGA.send({
    hitType: "pageview",
    page: path,
  });
}

export function trackEvent(action: string, category: string, label?: string) {
  ReactGA.event({
    action,
    category,
    label,
  });
}