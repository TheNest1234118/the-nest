import React from "react";
import { Rituals } from "@/pages/Rituals";
import { RitualPlayer } from "@/pages/RitualPlayer";
import { Analytics } from "@vercel/analytics/react";
import { AIPatterns } from "@/pages/AIPatterns";
import { ProfilePremium } from "@/pages/ProfilePremium";
import { ProfileNotifications } from "@/pages/ProfileNotifications";
import { ProfileHelp } from "@/pages/ProfileHelp";
import { ProfilePrivacy } from "@/pages/ProfilePrivacy";
import { ProfileData } from "@/pages/ProfileData";
import { AskPast } from "@/pages/AskPast";
import { WeeklyReflection } from "@/pages/WeeklyReflection";
import { MonthlyReflection } from "@/pages/MonthlyReflection";
import { VoiceHistory } from "@/pages/VoiceHistory";
import { ThoughtHistory } from "@/pages/ThoughtHistory";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Reflections } from "@/pages/Reflections";
import { TooltipProvider } from "@/components/ui/tooltip";
import { MoodLog } from "@/pages/MoodLog";
import { trackNotificationOpenFromUrl } from "@/lib/notifications";
import NotFound from "@/pages/not-found";
import { Landing } from "@/pages/Landing";
import { PwaInstallFlow } from "@/components/PwaInstallFlow";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Nest } from "@/pages/Nest";
import { Thoughts } from "@/pages/Thoughts";
import { Reset } from "@/pages/Reset";
import { Anchors } from "@/pages/Anchors";
import { Memos } from "@/pages/Memos";
import { Atmosphere } from "@/pages/Atmosphere";
import { Settings } from "@/pages/Settings";
import { AudioProvider } from "@/hooks/use-audio-context";
import { AtmosphereProvider } from "@/hooks/use-atmosphere";
import { MiniPlayer } from "@/components/MiniPlayer";
import { HeartBackground } from "@/components/HeartBackground";
import { ProfileVoicePrompts } from "@/pages/ProfileVoicePrompts";
import { WeatherLayer } from "@/components/WeatherLayer";
import { initAnalytics, trackPage } from "@/lib/analytics";
import { initClarity } from "@/lib/clarity";


const queryClient = new QueryClient();
function AnalyticsTracker() {
  const [location] = useLocation();

  React.useEffect(() => {
    trackPage(location);
  }, [location]);

  return null;
}
function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/profile/premium" component={ProfilePremium} />
<Route path="/profile/notifications" component={ProfileNotifications} />
<Route path="/profile/help" component={ProfileHelp} />
<Route path="/profile/privacy" component={ProfilePrivacy} />
<Route path="/profile/data" component={ProfileData} />
<Route path="/profile/voice-prompts" component={ProfileVoicePrompts} />
      <Route path="/history/voice" component={VoiceHistory} />
      <Route path="/insights/weekly" component={WeeklyReflection} />
      <Route path="/insights/monthly" component={MonthlyReflection} />
<Route path="/history/thoughts" component={ThoughtHistory} />
      <Route path="/rituals" component={Rituals} />
      <Route path="/rituals/:id" component={RitualPlayer} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/home" component={Dashboard} />
      <Route path="/insights/ai-patterns" component={AIPatterns} />
      <Route path="/ask-past" component={AskPast} />
      <Route path="/mood-log" component={MoodLog} />
      <Route path="/nest" component={Nest} />
      <Route path="/reflections" component={Reflections} />
      <Route path="/thoughts" component={Thoughts} />
      <Route path="/memos" component={Memos} />
      <Route path="/reset" component={Reset} />
      <Route path="/anchors" component={Anchors} />
      <Route path="/atmosphere" component={Atmosphere} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppLayers() {
  const [location] = useLocation();

  const heavyEffectsAllowed =
    location !== "/" && location !== "/onboarding";

  if (!heavyEffectsAllowed) return null;

  return (
    <>
      <HeartBackground />
      <WeatherLayer />
    </>
  );
}

function App() {
  React.useEffect(() => {
    trackNotificationOpenFromUrl();
    initAnalytics();
    initClarity();
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AudioProvider>
          <AtmosphereProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <AppLayers />
              <Router />
              <AnalyticsTracker />
              <MiniPlayer />
              <PwaInstallFlow />
            </WouterRouter>

            <Toaster />
            <Analytics />
          </AtmosphereProvider>
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;