import React, { useEffect, useState } from "react";
import {
  CloudRain,
  Wind,
  Zap,
  CloudLightning,
  Volume2,
  Eye,
  Power,
} from "lucide-react";
import {
  readWeatherSettings,
  writeWeatherSettings,
  type WeatherSettings,
} from "@/components/WeatherLayer";

type WeatherKey = keyof WeatherSettings;

const CONTROL_ROWS: {
  key: WeatherKey;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    key: "rain",
    label: "Rain",
    desc: "How much rain falls on the screen",
    icon: CloudRain,
  },
  {
    key: "wind",
    label: "Wind",
    desc: "Pushes rain sideways",
    icon: Wind,
  },
  {
    key: "lightning",
    label: "Lightning",
    desc: "Visual flashes in the sky",
    icon: Zap,
  },
  {
    key: "thunder",
    label: "Thunder",
    desc: "Low rumble after lightning",
    icon: Volume2,
  },
  {
    key: "fog",
    label: "Mist",
    desc: "Soft haze over the room",
    icon: Eye,
  },
  {
    key: "storm",
    label: "Storm",
    desc: "Makes everything heavier",
    icon: CloudLightning,
  },
];

function Slider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={0}
      max={100}
      value={Math.round(value * 100)}
      onChange={(e) => onChange(Number(e.target.value) / 100)}
      style={{
        width: "100%",
        accentColor: "rgba(205, 170, 100, 0.9)",
        cursor: "pointer",
      }}
    />
  );
}

export function WeatherControls() {
  const [settings, setSettings] = useState<WeatherSettings>(() => readWeatherSettings());

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

  const update = (patch: Partial<WeatherSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    writeWeatherSettings(next);
  };

  const setWeatherValue = (key: WeatherKey, value: number) => {
    if (key === "enabled") return;
    update({ [key]: value } as Partial<WeatherSettings>);
  };

  const applyPreset = (preset: "soft" | "rain" | "storm" | "heavy") => {
    const presets: Record<typeof preset, WeatherSettings> = {
      soft: {
        enabled: true,
        rain: 0.18,
        wind: 0.12,
        lightning: 0,
        thunder: 0,
        fog: 0.24,
        storm: 0.05,
      },
      rain: {
        enabled: true,
        rain: 0.55,
        wind: 0.24,
        lightning: 0.04,
        thunder: 0.08,
        fog: 0.18,
        storm: 0.14,
      },
      storm: {
        enabled: true,
        rain: 0.82,
        wind: 0.62,
        lightning: 0.55,
        thunder: 0.65,
        fog: 0.30,
        storm: 0.72,
      },
      heavy: {
        enabled: true,
        rain: 1,
        wind: 0.86,
        lightning: 0.9,
        thunder: 0.9,
        fog: 0.45,
        storm: 1,
      },
    };

    update(presets[preset]);
  };

  return (
    <div>
      <p
        style={{
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "rgba(185,158,115,0.34)",
          fontWeight: 500,
          marginBottom: 10,
        }}
      >
        Weather
      </p>

      <div
        style={{
          background: "rgba(255,255,255,0.020)",
          border: "1px solid rgba(255,255,255,0.058)",
          borderRadius: 16,
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <button
          onClick={() => update({ enabled: !settings.enabled })}
          style={{
            width: "100%",
            background: settings.enabled
              ? "rgba(205,170,100,0.075)"
              : "rgba(255,255,255,0.018)",
            border: `1px solid ${
              settings.enabled ? "rgba(205,170,100,0.18)" : "rgba(255,255,255,0.052)"
            }`,
            borderRadius: 13,
            padding: "13px 14px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: settings.enabled ? "rgba(225,200,155,0.84)" : "rgba(178,162,136,0.42)",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Power size={15} strokeWidth={1.4} />
            <span style={{ fontSize: 13, letterSpacing: "0.02em" }}>
              {settings.enabled ? "Weather on" : "Weather off"}
            </span>
          </span>
          <span
            style={{
              fontSize: 10,
              textTransform: "uppercase",
              letterSpacing: "0.16em",
              opacity: 0.55,
            }}
          >
            toggle
          </span>
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
          {[
            ["soft", "Soft"],
            ["rain", "Rain"],
            ["storm", "Storm"],
            ["heavy", "Heavy"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => applyPreset(key as "soft" | "rain" | "storm" | "heavy")}
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.052)",
                borderRadius: 11,
                padding: "10px 4px",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 300,
                color: "rgba(178,162,136,0.50)",
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {CONTROL_ROWS.map((row) => {
          const Icon = row.icon;
          const value = Number(settings[row.key] ?? 0);

          return (
            <div key={row.key}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 4,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Icon size={14} strokeWidth={1.4} color="rgba(205,170,100,0.48)" />
                  <div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "rgba(225,205,175,0.72)",
                        fontWeight: 400,
                        letterSpacing: "0.01em",
                      }}
                    >
                      {row.label}
                    </div>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(148,134,112,0.30)",
                        fontWeight: 300,
                        marginTop: 1,
                      }}
                    >
                      {row.desc}
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 10,
                    color: "rgba(155,138,112,0.32)",
                    fontWeight: 300,
                    minWidth: 28,
                    textAlign: "right",
                  }}
                >
                  {Math.round(value * 100)}
                </span>
              </div>

              <Slider value={value} onChange={(v) => setWeatherValue(row.key, v)} />
            </div>
          );
        })}
      </div>
    </div>
  );
}
