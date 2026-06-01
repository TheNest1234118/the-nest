import React, { useRef, useEffect } from "react";
import { useAtmosphere } from "@/hooks/use-atmosphere";

const HEART =
  "M 180,240 C 180,215 210,199 238,199 C 298,199 318,260 318,305 " +
  "C 318,362 264,408 180,468 C 96,408 42,362 42,305 " +
  "C 42,260 62,199 122,199 C 150,199 180,215 180,240 Z";

export function HeartBackground() {
  const { isPlaying, getAnalyserNode } = useAtmosphere();

  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  const svgRef = useRef<SVGSVGElement>(null);
  const groupRef = useRef<SVGGElement>(null);
  const bodyRef = useRef<SVGPathElement>(null);
  const innerCoreRef = useRef<SVGPathElement>(null);
  const strokeHaloRef = useRef<SVGPathElement>(null);
  const strokeRef = useRef<SVGPathElement>(null);
  const ambientRef = useRef<SVGEllipseElement>(null);

  const freqBuf = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const fast = useRef(0);
  const slow = useRef(0);

  const kick = useRef(0);
  const kickGlow = useRef(0);
  const ripple = useRef(0);

  const pulse = useRef(0);
  const pulseVel = useRef(0);

  const shakePh = useRef(0);
  const cooldown = useRef(0);
  const breathT = useRef(0);
  const vis = useRef(0);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      const playing = isPlayingRef.current;

      const vTarget = playing ? 1 : 0;
      vis.current +=
        (vTarget - vis.current) *
        (vTarget > vis.current ? 0.0032 : 0.0016) *
        60;

      const analyser = getAnalyserNode();

      if (analyser && playing) {
        if (
          !freqBuf.current ||
          freqBuf.current.length !== analyser.frequencyBinCount
        ) {
          freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
        }

        analyser.getByteFrequencyData(freqBuf.current);
      
        const d = freqBuf.current;

        const raw =
  (d[1] * 3.0 +
    d[2] * 2.5 +
    d[3] * 1.6 +
    d[4] * 0.7) /
  (7.8 * 255);

        fast.current = fast.current * 0.25 + raw * 0.75;
slow.current = slow.current * 0.985 + raw * 0.015;
      } else {
        fast.current *= 0.88;
        slow.current *= 0.97;
      }

      if (cooldown.current > 0) {
        cooldown.current -= 1;
      } else {
        const excess = fast.current - slow.current;

       const isKick =
  playing &&
  fast.current > 0.030 &&
  excess > 0.008 &&
  fast.current > slow.current * 1.09;

        if (isKick) {
const strength = Math.min(1, excess * 48);
          kick.current = Math.max(kick.current, strength * 0.55);
          kickGlow.current = Math.max(kickGlow.current, strength);
          ripple.current = Math.max(ripple.current, strength);

pulseVel.current += strength * 0.055;
          shakePh.current = 0;
          cooldown.current = 10;

          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(Math.round(8 + strength * 10));
          }
        }
      }

      pulseVel.current += (0 - pulse.current) * 0.035;
pulseVel.current *= 0.62;      pulse.current += pulseVel.current;

      kick.current *= 0.88;
      kickGlow.current *= 0.925;
      ripple.current *= 0.94;

      if (kick.current < 0.001) kick.current = 0;
      if (kickGlow.current < 0.001) kickGlow.current = 0;
      if (ripple.current < 0.001) ripple.current = 0;

      breathT.current += 1;

      const kc = kick.current;
      const kg = kickGlow.current;
      const rp = ripple.current;
      const br = Math.sin(breathT.current * 0.009) * 0.5 + 0.5;
      const v = vis.current;

      let shakeX = 0;

      if (kc > 0.015) {
        shakePh.current += 1;
        shakeX = Math.sin(shakePh.current * 0.9) * kc * 1.1;
      }

      const organicPulse = Math.max(0, pulse.current);

      const baseScale = 0.975 + br * 0.028;
const kickScale = 1 + organicPulse * 5.6 + kc * 0.045;      const scale = baseScale * kickScale;

      if (svgRef.current) {
        svgRef.current.style.opacity = String(v);
      }

      if (groupRef.current) {
        groupRef.current.setAttribute(
          "transform",
          `translate(${180 + shakeX},334) scale(${scale.toFixed(
            4,
          )}) translate(-180,-334)`,
        );
      }

      if (bodyRef.current) {
        bodyRef.current.style.opacity = String(
          Math.min(0.52 + br * 0.14 + kg * 0.22, 0.84),
        );
      }

      if (innerCoreRef.current) {
        innerCoreRef.current.style.opacity = String(
          Math.min(0.28 + br * 0.10 + kg * 0.28, 0.68),
        );
      }

      if (strokeHaloRef.current) {
        strokeHaloRef.current.setAttribute(
          "stroke-width",
          String(12 + kg * 18),
        );

        strokeHaloRef.current.style.opacity = String(
          Math.min(0.20 + br * 0.08 + kg * 0.24, 0.52),
        );
      }

      if (strokeRef.current) {
        strokeRef.current.setAttribute(
          "stroke-width",
          String(1.4 + kc * 2.2),
        );

        strokeRef.current.style.opacity = String(
          Math.min(0.40 + br * 0.16 + kg * 0.34, 0.86),
        );
      }

      if (ambientRef.current) {
        ambientRef.current.setAttribute("rx", String(210 + br * 18 + rp * 90));
        ambientRef.current.setAttribute("ry", String(245 + br * 20 + rp * 105));

        ambientRef.current.style.opacity = String(
          Math.min(0.16 + br * 0.1 + rp * 0.22, 0.46),
        );
      }

      rafId.current = requestAnimationFrame(loop);
    };

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(loop);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
    };
  }, [getAnalyserNode]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1,
        pointerEvents: "none",
        mixBlendMode: "screen" as React.CSSProperties["mixBlendMode"],
      }}
    >
      <svg
        ref={svgRef}
        viewBox="0 0 360 780"
        preserveAspectRatio="xMidYMid meet"
        width="100%"
        height="100%"
        style={{ opacity: 0, display: "block" }}
      >
        <defs>
          <filter id="nhbBodyGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="24" />
          </filter>

          <filter id="nhbCoreGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="18" />
          </filter>

          <filter id="nhbEdge" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>

          <filter id="nhbHaze" x="-130%" y="-130%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="56" />
          </filter>
        </defs>

        <ellipse
          ref={ambientRef}
          cx="180"
          cy="344"
          rx={210}
          ry={245}
          fill="hsl(352,42%,9%)"
          filter="url(#nhbHaze)"
          style={{ opacity: 0.2 }}
        />

        <g ref={groupRef}>
          <path
            ref={strokeHaloRef}
            d={HEART}
            fill="none"
            stroke="hsl(352,48%,16%)"
            strokeWidth={12}
            filter="url(#nhbBodyGlow)"
            style={{ opacity: 0.22 }}
          />

          <path
            ref={bodyRef}
            d={HEART}
            fill="hsl(352,56%,18%)"
            filter="url(#nhbBodyGlow)"
            style={{ opacity: 0.55 }}
          />

          <path
            ref={innerCoreRef}
            d={HEART}
            fill="hsl(24,48%,14%)"
            filter="url(#nhbCoreGlow)"
            transform="translate(180,334) scale(0.62) translate(-180,-334)"
            style={{ opacity: 0.32 }}
          />

          <path
            ref={strokeRef}
            d={HEART}
            fill="none"
            stroke="hsl(5,64%,34%)"
            strokeWidth={1.4}
            filter="url(#nhbEdge)"
            style={{ opacity: 0.42 }}
          />
        </g>
      </svg>
    </div>
  );
}