import React, { useEffect, useMemo, useRef, useState } from "react";

export interface WeatherSettings {
  enabled: boolean;
  rain: number;
  wind: number;
  lightning: number;
  thunder: number;
  fog: number;
  storm: number;
}

const DEFAULT_WEATHER: WeatherSettings = {
  enabled: false,
  rain: 0.45,
  wind: 0.25,
  lightning: 0.15,
  thunder: 0.15,
  fog: 0.18,
  storm: 0.2,
};

export const WEATHER_STORAGE_KEY = "nest_weather_settings";

export function readWeatherSettings(): WeatherSettings {
  try {
    const raw = localStorage.getItem(WEATHER_STORAGE_KEY);
    if (!raw) return DEFAULT_WEATHER;

    return {
      ...DEFAULT_WEATHER,
      ...(JSON.parse(raw) as Partial<WeatherSettings>),
    };
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

export function WeatherLayer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lightningRef = useRef<HTMLDivElement | null>(null);
  const thunderRef = useRef<AudioContext | null>(null);
  const [settings, setSettings] = useState<WeatherSettings>(() => readWeatherSettings());
  const settingsRef = useRef(settings);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

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

  const drops = useMemo(() => {
    return Array.from({ length: 320 }, () => ({
      x: Math.random(),
      y: Math.random(),
      len: 0.25 + Math.random() * 0.75,
      speed: 0.45 + Math.random() * 0.75,
      alpha: 0.25 + Math.random() * 0.65,
      thickness: 0.55 + Math.random() * 0.9,
    }));
  }, []);

  const mist = useMemo(() => {
    return Array.from({ length: 36 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: 80 + Math.random() * 180,
      speed: 0.03 + Math.random() * 0.06,
      alpha: 0.04 + Math.random() * 0.08,
    }));
  }, []);

  const playThunder = (amount: number) => {
    const s = settingsRef.current;
    if (!s.enabled || s.thunder <= 0.02) return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = thunderRef.current ?? new AudioCtx();
      thunderRef.current = ctx;

      const duration = 1.4 + amount * 1.8;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const decay = Math.pow(1 - t, 2.4);
        data[i] = (Math.random() * 2 - 1) * decay;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 80 + amount * 120;

      const gain = ctx.createGain();
      gain.gain.value = Math.min(0.22, s.thunder * amount * 0.18);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noise.start();
      noise.stop(ctx.currentTime + duration);
    } catch (_) {}
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    let last = performance.now();
    let nextLightning = performance.now() + 3000 + Math.random() * 8000;

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

      el.style.opacity = String(0.2 + amount * 0.5);

      window.setTimeout(() => {
        el.style.opacity = "0";
      }, 55);

      if (amount > 0.35) {
        window.setTimeout(() => {
          el.style.opacity = String(0.08 + amount * 0.2);
          window.setTimeout(() => {
            el.style.opacity = "0";
          }, 70);
        }, 130);
      }

      window.setTimeout(() => playThunder(amount), 250 + Math.random() * 900);
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
        const fog = clamp01(s.fog);
        const storm = clamp01(s.storm);

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
            const count = Math.floor(200 + rain * 600 + storm * 300);
          const speedBase = 12 + rain * 28 + storm * 20;
          const angle = -12 + wind * 42 + storm * 12;
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
            const len = (30 + rain * 50 + storm * 40) * d.len;
            const alpha = (0.08 + rain * 0.22 + storm * 0.14) * d.alpha;

            ctx.strokeStyle = `rgba(255,255,255,0.95)`;
            ctx.lineWidth = d.thickness;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + dx * len, y + dy * len);
            ctx.stroke();
          }

          ctx.restore();
        }

        const lightningChance = clamp01(s.lightning) * (0.25 + storm * 1.2);

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

  if (!settings.enabled) return null;

  const fog = clamp01(settings.fog);
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
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            storm > 0.05
              ? `radial-gradient(ellipse 80% 50% at 50% 0%, rgba(90, 95, 120, ${0.03 + storm * 0.08}) 0%, transparent 70%)`
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

      {fog > 0.01 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: 0.08 + fog * 0.2,
            background:
              "linear-gradient(180deg, rgba(185,160,130,0.05), transparent 28%, rgba(120,105,100,0.08) 100%)",
          }}
        />
      )}
    </div>
  );
}
