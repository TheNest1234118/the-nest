import React from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/toaster";
import { AudioProvider } from "@/hooks/use-audio-context";
import { AtmosphereProvider } from "@/hooks/use-atmosphere";
import NotFound from "@/pages/not-found";
import { Landing } from "@/pages/Landing";
import { Onboarding } from "@/pages/Onboarding";
import { Dashboard } from "@/pages/Dashboard";
import { Rituals } from "@/pages/Rituals";
import { RitualPlayer } from "@/pages/RitualPlayer";
import { AIPatterns } from "@/pages/AIPatterns";
import { ProfilePremium } from "@/pages/ProfilePremium";
import { ProfileNotifications } from "@/pages/ProfileNotifications";
import { ProfileHelp } from "@/pages/ProfileHelp";
import { ProfilePrivacy } from "@/pages/ProfilePrivacy";
import { ProfileData } from "@/pages/ProfileData";
import { ProfileVoicePrompts } from "@/pages/ProfileVoicePrompts";
import { AskPast } from "@/pages/AskPast";
import { WeeklyReflection } from "@/pages/WeeklyReflection";
import { MonthlyReflection } from "@/pages/MonthlyReflection";
import { VoiceHistory } from "@/pages/VoiceHistory";
import { ThoughtHistory } from "@/pages/ThoughtHistory";
import { Reflections } from "@/pages/Reflections";
import { MoodLog } from "@/pages/MoodLog";
import { Nest } from "@/pages/Nest";
import { Thoughts } from "@/pages/Thoughts";
import { Reset } from "@/pages/Reset";
import { Anchors } from "@/pages/Anchors";
import { Memos } from "@/pages/Memos";
import { Atmosphere } from "@/pages/Atmosphere";
import { Settings } from "@/pages/Settings";

const queryClient = new QueryClient();

const routerBase =
  import.meta.env.BASE_URL === "/"
    ? undefined
    : import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={Landing} />
      <Route path="/onboarding" component={Onboarding} />
      <Route path="/home" component={Dashboard} />

      <Route path="/profile/premium" component={ProfilePremium} />
      <Route path="/profile/notifications" component={ProfileNotifications} />
      <Route path="/profile/help" component={ProfileHelp} />
      <Route path="/profile/privacy" component={ProfilePrivacy} />
      <Route path="/profile/data" component={ProfileData} />
      <Route path="/profile/voice-prompts" component={ProfileVoicePrompts} />

      <Route path="/history/voice" component={VoiceHistory} />
      <Route path="/history/thoughts" component={ThoughtHistory} />

      <Route path="/insights/weekly" component={WeeklyReflection} />
      <Route path="/insights/monthly" component={MonthlyReflection} />
      <Route path="/insights/ai-patterns" component={AIPatterns} />

      <Route path="/rituals" component={Rituals} />
      <Route path="/rituals/:id" component={RitualPlayer} />

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
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AudioProvider>
          <AtmosphereProvider>
            <WouterRouter base={routerBase}>
              <AppRouter />
            </WouterRouter>

            <Toaster />
          </AtmosphereProvider>
        </AudioProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;