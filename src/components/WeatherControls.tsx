import React, { useEffect, useState } from "react";
import {
  CloudRain,
  Wind,
  Zap,
  CloudLightning,
  Volume2,
  Power,
} from "lucide-react";
import {
  readWeatherSettings,
  writeWeatherSettings,
  type WeatherSettings,
} from "@/components/WeatherLayer";

type WeatherKey = keyof WeatherSettings;

const WEATHER_PRESETS: {
  key: string;
  label: string;
  desc: string;
  settings: WeatherSettings;
}[] = [
  {
    key: "quiet",
    label: "Quiet",
    desc: "No weather, just the room",
    settings: {
      enabled: false,
      rain: 0,
      wind: 0,
      lightning: 0,
      thunder: 0,
      storm: 0,
    },
  },
  {
    key: "light_rain",
    label: "Light Rain",
    desc: "Soft rain, almost no storm",
    settings: {
      enabled: true,
      rain: 0.25,
      wind: 0.04,
      lightning: 0,
      thunder: 0,
      storm: 0.02,
    },
  },
  {
    key: "steady_rain",
    label: "Steady Rain",
    desc: "Calm, full rain bed",
    settings: {
      enabled: true,
      rain: 0.55,
      wind: 0.12,
      lightning: 0.02,
      thunder: 0.04,
      storm: 0.12,
    },
  },
  {
    key: "heavy_rain",
    label: "Heavy Rain",
    desc: "Thick rain, darker room",
    settings: {
      enabled: true,
      rain: 0.9,
      wind: 0.22,
      lightning: 0.06,
      thunder: 0.08,
      storm: 0.32,
    },
  },
  {
    key: "windy",
    label: "Windy",
    desc: "Moving air, little rain",
    settings: {
      enabled: true,
      rain: 0.08,
      wind: 0.7,
      lightning: 0,
      thunder: 0,
      storm: 0.22,
    },
  },
  {
    key: "storm",
    label: "Storm",
    desc: "Rain, wind, thunder",
    settings: {
      enabled: true,
      rain: 0.8,
      wind: 0.55,
      lightning: 0.42,
      thunder: 0.62,
      storm: 0.72,
    },
  },
  {
    key: "heavy_storm",
    label: "Heavy Storm",
    desc: "Maximum weather pressure",
    settings: {
      enabled: true,
      rain: 1,
      wind: 0.86,
      lightning: 0.82,
      thunder: 0.9,
      storm: 1,
    },
  },
];

const CONTROL_ROWS: {
  key: WeatherKey;
  label: string;
  desc: string;
  icon: React.ElementType;
}[] = [
  {
    key: "rain",
    label: "Rain",
    desc: "Blends light, medium and heavy rain",
    icon: CloudRain,
  },
  {
    key: "wind",
    label: "Wind",
    desc: "Adds movement and pressure",
    icon: Wind,
  },
  {
    key: "lightning",
    label: "Lightning",
    desc: "Controls visual flashes",
    icon: Zap,
  },
  {
    key: "thunder",
    label: "Thunder",
    desc: "Controls the thunderstorm audio",
    icon: Volume2,
  },
  {
    key: "storm",
    label: "Storm",
    desc: "Makes rain, wind and lightning heavier",
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

  const applyPreset = (preset: WeatherSettings) => {
    setSettings(preset);
    writeWeatherSettings(preset);
  };

  const setWeatherValue = (key: WeatherKey, value: number) => {
    if (key === "enabled") return;
    update({ enabled: true, [key]: value } as Partial<WeatherSettings>);
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

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {WEATHER_PRESETS.map((preset) => (
            <button
              key={preset.key}
              onClick={() => applyPreset(preset.settings)}
              style={{
                background: "rgba(255,255,255,0.018)",
                border: "1px solid rgba(255,255,255,0.052)",
                borderRadius: 12,
                padding: "12px 12px",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: "rgba(225,205,175,0.70)",
                  fontWeight: 400,
                  marginBottom: 2,
                  letterSpacing: "0.01em",
                }}
              >
                {preset.label}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: "rgba(148,134,112,0.30)",
                  fontWeight: 300,
                  lineHeight: 1.35,
                }}
              >
                {preset.desc}
              </div>
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
