export type VoicePrompt = {
    id: string;
    text: string;
    source: "default" | "custom" | "ai";
    enabled: boolean;
  };
  
  const STORAGE_KEY = "nest_voice_prompts";
  
  export const DEFAULT_VOICE_PROMPTS: VoicePrompt[] = [
    {
      id: "feeling-today",
      text: "How are you feeling today?",
      source: "default",
      enabled: true,
    },
    {
      id: "why-feeling",
      text: "Why do you think you feel this way?",
      source: "default",
      enabled: true,
    },
    {
      id: "what-mattered",
      text: "What happened today that mattered?",
      source: "default",
      enabled: true,
    },
    {
      id: "better-worse",
      text: "Did anything make you feel better or worse?",
      source: "default",
      enabled: true,
    },
    {
      id: "dont-forget",
      text: "What’s one thing you don’t want to forget?",
      source: "default",
      enabled: true,
    },
    {
      id: "learned-today",
      text: "What did you learn today?",
      source: "default",
      enabled: true,
    },
    {
      id: "avoiding",
      text: "What are you avoiding?",
      source: "default",
      enabled: true,
    },
    {
      id: "future-self",
      text: "What should your future self remember?",
      source: "default",
      enabled: true,
    },
  ];
  
  export function loadVoicePrompts(): VoicePrompt[] {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return DEFAULT_VOICE_PROMPTS;
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return DEFAULT_VOICE_PROMPTS;
      return parsed;
    } catch {
      return DEFAULT_VOICE_PROMPTS;
    }
  }
  
  export function saveVoicePrompts(prompts: VoicePrompt[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prompts));
  }
  
  export function resetVoicePrompts() {
    saveVoicePrompts(DEFAULT_VOICE_PROMPTS);
    return DEFAULT_VOICE_PROMPTS;
  }
  
  export function getEnabledVoicePrompts(limit = 4): VoicePrompt[] {
    return loadVoicePrompts()
      .filter((prompt) => prompt.enabled)
      .slice(0, limit);
  }
  
  export function addCustomVoicePrompt(text: string) {
    const prompts = loadVoicePrompts();
  
    const next: VoicePrompt[] = [
      ...prompts,
      {
        id: `custom-${crypto.randomUUID()}`,
        text,
        source: "custom",
        enabled: true,
      },
    ];
  
    saveVoicePrompts(next);
    return next;
  }