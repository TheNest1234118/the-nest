import { Rituals } from "@/pages/Rituals";
import { RitualPlayer } from "@/pages/RitualPlayer";
import { Analytics } from "@vercel/analytics/react";
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { WeatherLayer } from "@/components/WeatherLayer";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/rituals" component={Rituals} />
<Route path="/rituals/:id" component={RitualPlayer} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/home" component={Dashboard} />
      <Route path="/nest" component={Nest} />
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
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AudioProvider>
  <AtmosphereProvider>
  <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
  <AppLayers />
  <Router />
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
