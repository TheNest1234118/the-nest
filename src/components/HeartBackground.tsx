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
  const rawRef = useRef(0);

  const fast = useRef(0);
  const slow = useRef(0);
  const primed = useRef(false);

  const kick = useRef(0);
  const kickGlow = useRef(0);
  const ripple = useRef(0);

  const pulse = useRef(0);
  const pulseVel = useRef(0);

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
        (vTarget > vis.current ? 0.004 : 0.002) *
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
          (d[1] * 2.4 +
            d[2] * 2.2 +
            d[3] * 1.6 +
            d[4] * 1.0 +
            d[5] * 0.5) /
          (7.7 * 255);

        rawRef.current = raw;

        if (!primed.current) {
          fast.current = raw;
          slow.current = raw;
          primed.current = true;
        } else {
          fast.current = fast.current * 0.16 + raw * 0.84;
          slow.current = slow.current * 0.97 + raw * 0.03;
        }
      } else {
        fast.current *= 0.88;
        slow.current *= 0.97;
      }

      if (cooldown.current > 0) {
        cooldown.current -= 1;
      }

      const excess = fast.current - slow.current;

      const isKick =
        playing &&
        primed.current &&
        cooldown.current <= 0 &&
        rawRef.current > 0.01 &&
        excess > 0.0022 &&
        fast.current > slow.current * 1.025;

      if (isKick) {
        const strength = Math.min(1, excess * 70);

        kick.current = Math.max(kick.current, strength * 0.35);
        kickGlow.current = Math.max(kickGlow.current, strength * 0.65);
        ripple.current = Math.max(ripple.current, strength * 0.55);

        pulseVel.current += strength * 0.018;

        cooldown.current = 6;
      }

      pulseVel.current += (0 - pulse.current) * 0.12;
      pulseVel.current *= 0.5;
      pulse.current += pulseVel.current;

      kick.current *= 0.72;
      kickGlow.current *= 0.86;
      ripple.current *= 0.88;

      if (kick.current < 0.001) kick.current = 0;
      if (kickGlow.current < 0.001) kickGlow.current = 0;
      if (ripple.current < 0.001) ripple.current = 0;

      breathT.current += 1;

      const kc = kick.current;
      const kg = kickGlow.current;
      const rp = ripple.current;
      const br = Math.sin(breathT.current * 0.009) * 0.5 + 0.5;
      const v = vis.current;

      const organicPulse = Math.max(0, pulse.current);

      const baseScale = 0.82 + br * 0.012;
      const kickScale = 1 + organicPulse * 0.45 + kc * 0.018;
      const scale = baseScale * kickScale;

      if (svgRef.current) {
        svgRef.current.style.opacity = String(v * 0.05);
      }

      if (groupRef.current) {
        groupRef.current.setAttribute(
          "transform",
          `translate(180,334) scale(${scale.toFixed(4)}) translate(-180,-334)`,
        );
      }

      if (bodyRef.current) {
        bodyRef.current.style.opacity = String(
          Math.min(0.16 + br * 0.04 + kg * 0.08, 0.32),
        );
      }

      if (innerCoreRef.current) {
        innerCoreRef.current.style.opacity = String(
          Math.min(0.08 + br * 0.03 + kg * 0.08, 0.22),
        );
      }

      if (strokeHaloRef.current) {
        strokeHaloRef.current.setAttribute("stroke-width", String(6 + kg * 6));
        strokeHaloRef.current.style.opacity = String(
          Math.min(0.08 + br * 0.03 + kg * 0.08, 0.22),
        );
      }

      if (strokeRef.current) {
        strokeRef.current.setAttribute("stroke-width", String(0.9 + kc * 0.8));
        strokeRef.current.style.opacity = String(
          Math.min(0.18 + br * 0.05 + kg * 0.10, 0.38),
        );
      }

      if (ambientRef.current) {
        ambientRef.current.setAttribute("rx", String(180 + br * 12 + rp * 35));
        ambientRef.current.setAttribute("ry", String(210 + br * 14 + rp * 42));
        ambientRef.current.style.opacity = String(
          Math.min(0.06 + br * 0.04 + rp * 0.08, 0.18),
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
        zIndex: 0,
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
        style={{
          opacity: 0,
          display: "block",
          transform: "scale(0.8)",
        }}
      >
        <ellipse
          ref={ambientRef}
          cx="180"
          cy="344"
          rx={180}
          ry={210}
          fill="hsl(352,36%,8%)"
          filter="none"
          style={{ opacity: 0.08 }}
        />

        <g ref={groupRef}>
          <path
            ref={strokeHaloRef}
            d={HEART}
            fill="none"
            stroke="hsl(352,38%,14%)"
            strokeWidth={6}
            filter="none"
            style={{ opacity: 0.08 }}
          />

          <path
            ref={bodyRef}
            d={HEART}
            fill="hsl(352,40%,10%)"
            filter="none"
            style={{ opacity: 0.16 }}
          />

          <path
            ref={innerCoreRef}
            d={HEART}
            fill="hsl(24,38%,10%)"
            filter="none"
            transform="translate(180,334) scale(0.62) translate(-180,-334)"
            style={{ opacity: 0.08 }}
          />

          <path
            ref={strokeRef}
            d={HEART}
            fill="none"
            stroke="hsl(5,40%,22%)"
            strokeWidth={0.9}
            filter="none"
            style={{ opacity: 0.18 }}
          />
        </g>
      </svg>
    </div>
  );
}