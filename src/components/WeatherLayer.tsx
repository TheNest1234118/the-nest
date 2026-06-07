import React, { useEffect, useMemo, useRef, useState } from "react";

export interface WeatherSettings {
  enabled: boolean;
  rain: number;
  wind: number;
  lightning: number;
  thunder: number;
  storm: number;
}

const DEFAULT_WEATHER: WeatherSettings = {
  enabled: false,
  rain: 0,
  wind: 0,
  lightning: 0,
  thunder: 0,
  storm: 0,
};

export const WEATHER_STORAGE_KEY = "nest_weather_settings";

const AUDIO_PATHS = {
    rainLight: "https://res.cloudinary.com/db3kqfbko/video/upload/v1780399812/rain-light_sx3lbe.mp3",
    rainMedium: "https://res.cloudinary.com/db3kqfbko/video/upload/v1780399812/rain-medium_te3fdp.mp3",
    rainHeavy: "https://res.cloudinary.com/db3kqfbko/video/upload/v1780402352/rain-heavy_rhiei9.mp3",
    wind: "https://res.cloudinary.com/db3kqfbko/video/upload/v1780399812/wind_k3swcr.mp3",
    thunder: "https://res.cloudinary.com/db3kqfbko/video/upload/v1780399812/thunder_npodvb.mp3",
  };

export function readWeatherSettings(): WeatherSettings {
  try {
    const raw = localStorage.getItem(WEATHER_STORAGE_KEY);
    if (!raw) return DEFAULT_WEATHER;
    return { ...DEFAULT_WEATHER, ...(JSON.parse(raw) as Partial<WeatherSettings>) };
  } catch (_) {
    return DEFAULT_WEATHER;
  }
}

export function writeWeatherSettings(settings: WeatherSettings) {
  try {
    localStorage.setItem(WEATHER_STORAGE_KEY, JSON.stringify(settings));
    window.dispatchEvent(new CustomEvent("nest-weather-change", { detail: settings }));
  } catch (_) {}
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
function isMobileAudioDevice() {
  return /iphone|ipad|ipod|android/i.test(navigator.userAgent);
}

function safeVolume(v: number) {
  const x = clamp01(v);

  if (!isMobileAudioDevice()) return x;

  // Mobile: viel sanfter, damit 1% nicht direkt laut wirkt
  return Math.pow(x, 2.2) * 0.55;
}
function makeLoop(src: string) {
  const audio = new Audio(src);
  audio.loop = true;
  audio.preload = "auto";
  audio.crossOrigin = "anonymous";
  audio.volume = 0;
  return audio;
}

function setVolume(audio: HTMLAudioElement | null, volume: number) {
  if (!audio) return;

  const raw = clamp01(volume);
  const output = safeVolume(raw);

  if (raw <= 0.02 || output <= 0.001) {
    audio.volume = 0;
    audio.pause();
    audio.currentTime = 0;
    return;
  }

  audio.volume = output;

  if (audio.paused) {
    audio.play().catch(() => {});
  }
}
function fadeTowards(current: number, target: number, speed = 0.22) {
  if (target === 0 && current < 0.03) return 0;
  return current + (target - current) * speed;
}

export function WeatherLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightningRef = useRef<HTMLDivElement | null>(null);

  const [settings, setSettings] = useState<WeatherSettings>(() => readWeatherSettings());
  const settingsRef = useRef(settings);

  const audioRef = useRef<{
    rainLight: HTMLAudioElement;
    rainMedium: HTMLAudioElement;
    rainHeavy: HTMLAudioElement;
    wind: HTMLAudioElement;
    thunder: HTMLAudioElement;
  } | null>(null);

  const audioUnlockedRef = useRef(false);
  const rafAudioRef = useRef<number | null>(null);
  const currentVolumesRef = useRef({
    rainLight: 0,
    rainMedium: 0,
    rainHeavy: 0,
    wind: 0,
    thunder: 0,
  });

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  useEffect(() => {
    const unlock = () => {
      const s = settingsRef.current;
  
      if (s.enabled) {
        startAudio();
      }
  
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("touchstart", unlock, { once: true });
    window.addEventListener("click", unlock, { once: true });
  
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("click", unlock);
    };
  }, []);
  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<WeatherSettings>).detail;
      if (detail) setSettings(detail);
      else setSettings(readWeatherSettings());
    };

    window.addEventListener("nest-weather-change", onChange);
    window.addEventListener("storage", onChange);

    return () => {
      window.removeEventListener("nest-weather-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);

  const ensureAudio = () => {
    if (audioRef.current) return audioRef.current;

    audioRef.current = {
      rainLight: makeLoop(AUDIO_PATHS.rainLight),
      rainMedium: makeLoop(AUDIO_PATHS.rainMedium),
      rainHeavy: makeLoop(AUDIO_PATHS.rainHeavy),
      wind: makeLoop(AUDIO_PATHS.wind),
      thunder: makeLoop(AUDIO_PATHS.thunder),
    };

    return audioRef.current;
  };

  const startAudio = () => {
    ensureAudio();
    audioUnlockedRef.current = true;
  
  };
  const stopAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;

    Object.values(audio).forEach((a) => {
      a.pause();
      a.currentTime = 0;
      a.volume = 0;
    });

    audioUnlockedRef.current = false;
    currentVolumesRef.current = {
      rainLight: 0,
      rainMedium: 0,
      rainHeavy: 0,
      wind: 0,
      thunder: 0,
    };
  };

  useEffect(() => {
    if (settings.enabled) {
      startAudio();
      return;
    }
  
    const audio = audioRef.current;
    if (!audio) return;
  
    currentVolumesRef.current = {
      rainLight: 0,
      rainMedium: 0,
      rainHeavy: 0,
      wind: 0,
      thunder: 0,
    };
  
    Object.values(audio).forEach((a) => {
      a.volume = 0;
      a.pause();
      a.currentTime = 0;
    });
  
    audioUnlockedRef.current = false;
  }, [settings.enabled]);

  useEffect(() => {
    const tick = () => {
      const audio = audioRef.current;
      const s = settingsRef.current;

      if (audio && audioUnlockedRef.current) {
        const rain = s.enabled ? clamp01(s.rain) : 0;
        const wind = s.enabled ? clamp01(s.wind) : 0;
        const thunder = s.enabled ? clamp01(s.thunder) : 0;
        const storm = s.enabled ? clamp01(s.storm) : 0;

        let targetRainLight = 0;
        let targetRainMedium = 0;
        let targetRainHeavy = 0;

        const isMobile = /iphone|ipad|ipod|android/i.test(navigator.userAgent);

if (rain > 0) {
  if (isMobile) {
    if (rain < 0.34) {
      targetRainLight = rain;
    } else if (rain < 0.67) {
      targetRainMedium = rain;
    } else {
      targetRainHeavy = rain;
    }
  } else {
    if (rain <= 0.5) {
      const t = rain / 0.5;
      targetRainLight = (1 - t) * Math.min(1, rain * 2.2);
      targetRainMedium = t * Math.min(1, rain * 1.55);
    } else {
      const t = (rain - 0.5) / 0.5;
      targetRainMedium = (1 - t) * 0.82;
      targetRainHeavy = t;
    }
  }
}

        targetRainLight *= 0.75;
        targetRainMedium *= 0.9;
        targetRainHeavy *= 1.0;
        const mobileScale = /iphone|ipad|ipod|android/i.test(navigator.userAgent)
        ? 0.18
        : 1;
      
      const targetWind = (wind * 0.75 + storm * 0.2) * mobileScale;
      const targetThunder = thunder * 0.75 * mobileScale;

        const cv = currentVolumesRef.current;
        cv.rainLight = fadeTowards(cv.rainLight, targetRainLight);
        cv.rainMedium = fadeTowards(cv.rainMedium, targetRainMedium);
        cv.rainHeavy = fadeTowards(cv.rainHeavy, targetRainHeavy);
        cv.wind = fadeTowards(cv.wind, targetWind);
        cv.thunder = fadeTowards(cv.thunder, targetThunder);

        setVolume(audio.rainLight, cv.rainLight);
        setVolume(audio.rainMedium, cv.rainMedium);
        setVolume(audio.rainHeavy, cv.rainHeavy);
        setVolume(audio.wind, cv.wind);
        setVolume(audio.thunder, cv.thunder);
        const almostSilent =
  cv.rainLight < 0.003 &&
  cv.rainMedium < 0.003 &&
  cv.rainHeavy < 0.003 &&
  cv.wind < 0.003 &&
  cv.thunder < 0.003;

if (!s.enabled && almostSilent) {
  Object.values(audio).forEach((a) => {
    a.pause();
    a.currentTime = 0;
  });

  audioUnlockedRef.current = false;
}
      }

      rafAudioRef.current = requestAnimationFrame(tick);
    };

    rafAudioRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafAudioRef.current) cancelAnimationFrame(rafAudioRef.current);
    };
  }, []);

  const drops = useMemo(() => {
    return Array.from({ length: 360 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: 0.25 + Math.random() * 0.75,
      speed: 0.45 + Math.random() * 0.75,
      alpha: 0.25 + Math.random() * 0.65,
      thickness: 0.55 + Math.random() * 0.9,
    }));
  }, []);

  const mist = useMemo(() => {
    return Array.from({ length: 34 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 80 + Math.random() * 180,
      speed: 0.03 + Math.random() * 0.06,
      alpha: 0.04 + Math.random() * 0.08,
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let nextLightning = performance.now() + 2500 + Math.random() * 7000;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const flash = (amount: number) => {
      const el = lightningRef.current;
      if (!el) return;

      el.style.opacity = String(0.22 + amount * 0.48);

      window.setTimeout(() => {
        el.style.opacity = "0";
      }, 55);

      if (amount > 0.35) {
        window.setTimeout(() => {
          el.style.opacity = String(0.09 + amount * 0.2);
          window.setTimeout(() => {
            el.style.opacity = "0";
          }, 70);
        }, 135);
      }
    };

    const loop = (now: number) => {
      const dt = Math.min(33, now - last);
      last = now;

      const s = settingsRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      ctx.clearRect(0, 0, w, h);

      if (s.enabled) {
        const rain = clamp01(s.rain);
        const wind = clamp01(s.wind);
        const lightning = clamp01(s.lightning);
        const thunder = clamp01(s.thunder);
        const storm = clamp01(s.storm);
        const fog = Math.min(1, rain * 0.13 + wind * 0.18 + storm * 0.28);

        if (fog > 0.01) {
          ctx.save();
          ctx.globalCompositeOperation = "screen";

          mist.forEach((m) => {
            m.x += m.speed * (0.25 + wind) * (dt / 16.67);
            if (m.x > 1.25) m.x = -0.25;

            const gx = m.x * w;
            const gy = m.y * h;
            const grad = ctx.createRadialGradient(gx, gy, 0, gx, gy, m.size);
            grad.addColorStop(0, `rgba(160, 135, 110, ${m.alpha * fog})`);
            grad.addColorStop(1, "rgba(160, 135, 110, 0)");

            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(gx, gy, m.size, 0, Math.PI * 2);
            ctx.fill();
          });

          ctx.restore();
        }

        if (rain > 0.01) {
          const count = Math.floor(70 + rain * 380 + storm * 170);
          const speedBase = 12 + rain * 30 + storm * 22;
          const angle = -12 + wind * 46 + storm * 12;
          const angleRad = (angle * Math.PI) / 180;
          const dx = Math.sin(angleRad);
          const dy = Math.cos(angleRad);

          ctx.save();
          ctx.lineCap = "round";
          ctx.globalCompositeOperation = "screen";

          for (let i = 0; i < count; i++) {
            const d = drops[i % drops.length];

            d.x += (dx * speedBase * d.speed * dt) / 10000;
            d.y += (dy * speedBase * d.speed * dt) / 1000;

            if (d.y > 1.08 || d.x > 1.15 || d.x < -0.15) {
              d.y = -0.08 - Math.random() * 0.1;
              d.x = Math.random();
            }

            const x = d.x * w;
            const y = d.y * h;
            const len = (20 + rain * 42 + storm * 32) * d.len;
            const alpha = (0.10 + rain * 0.32 + storm * 0.18) * d.alpha;

            ctx.strokeStyle = `rgba(210, 225, 235, ${alpha})`;
            ctx.lineWidth = d.thickness;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx * len, y + dy * len);
            ctx.stroke();
          }

          ctx.restore();
        }

        const lightningChance = Math.max(lightning, thunder * 0.35) * (0.25 + storm * 1.2);

        if (lightningChance > 0.01 && now > nextLightning) {
          flash(lightningChance);
          nextLightning = now + 1400 + Math.random() * (9000 - lightningChance * 6500);
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [drops, mist]);

const storm = clamp01(settings.storm);

return (
    <div
    aria-hidden="true"
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 46,
      pointerEvents: "none",
      overflow: "hidden",
      mixBlendMode: "screen",
      opacity: settings.enabled ? 1 : 0,
      transition: "opacity 600ms ease",
    }}
  >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            storm > 0.05
              ? `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(90, 95, 120, ${
                  0.03 + storm * 0.08
                }) 0%, transparent 70%)`
              : "transparent",
        }}
      />

      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100vw",
          height: "100vh",
          opacity: 0.92,
        }}
      />

      <div
        ref={lightningRef}
        style={{
          position: "absolute",
          inset: 0,
          opacity: 0,
          transition: "opacity 80ms linear",
          background:
            "radial-gradient(ellipse 70% 45% at 50% 8%, rgba(210,225,255,0.95) 0%, rgba(145,170,240,0.20) 38%, transparent 72%)",
        }}
      />
    </div>
  );
}
