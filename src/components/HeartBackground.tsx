import React, { useRef, useEffect } from "react";
import { useAtmosphere } from "@/hooks/use-atmosphere";

// ─── Emotional heartbeat background ────────────────────────────────────────
//
// A single SVG heart path rendered fixed behind all content via mix-blend-mode:screen.
// Three layers:
//   1. Wide blurred stroke halo  — outer pressure bloom
//   2. Filled body with soft glow — warm crimson mass
//   3. Thin crisp stroke           — the visible outline that defines the shape
//
// On bass kicks: scale spike + lateral shake + stroke expansion + haptic vibrate.
// Between kicks: slow ~10s breathing cycle keeps the heart alive and calm.
//
// All DOM writes happen in a RAF loop — zero React re-renders at 60fps.
// ──────────────────────────────────────────────────────────────────────────────

// Heart bezier centered at (180, 334): 276px wide, 269px tall in a 360×780 viewBox.
const HEART =
  "M 180,240 C 180,215 210,199 238,199 C 298,199 318,260 318,305 " +
  "C 318,362 264,408 180,468 C 96,408 42,362 42,305 " +
  "C 42,260 62,199 122,199 C 150,199 180,215 180,240 Z";

export function HeartBackground() {
  const { isPlaying, getAnalyserNode } = useAtmosphere();

  // Mirror isPlaying into a ref so the RAF loop reads it without stale closure
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  // SVG element refs — mutated directly, never via React state
  const svgRef        = useRef<SVGSVGElement>(null);
  const groupRef      = useRef<SVGGElement>(null);       // scale + shake pivot
  const bodyRef       = useRef<SVGPathElement>(null);    // filled glow body
  const innerCoreRef  = useRef<SVGPathElement>(null);    // warm amber inner core
  const strokeHaloRef = useRef<SVGPathElement>(null);    // wide blurred outer halo stroke
  const strokeRef     = useRef<SVGPathElement>(null);    // thin crisp outline
  const ambientRef    = useRef<SVGEllipseElement>(null); // large background haze

  // Audio / animation state (all plain refs — no setState)
  const freqBuf    = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const fast       = useRef(0);   // very fast smoothing — instant spike detector
  const slow       = useRef(0);   // slow baseline for transient comparison
  const kick       = useRef(0);   // 0–1, fast decay (~300ms) — drives scale/shake
  const kickGlow   = useRef(0);   // 0–1, slow decay (~800ms) — drives glow tail
  const shakePh    = useRef(0);   // oscillation counter for lateral shake
  const cooldown   = useRef(0);   // frames until next kick allowed
  const breathT    = useRef(0);   // monotonic counter for breathing sine
  const vis        = useRef(0);   // master opacity (fades in/out with playback)
  const rafId      = useRef<number | null>(null);

  useEffect(() => {
    const loop = () => {
      const playing = isPlayingRef.current;

      // ── Master visibility — slow fade in, very slow fade out ─────────────
      const vTarget = playing ? 1 : 0;
      vis.current  += (vTarget - vis.current) * (vTarget > vis.current ? 0.0032 : 0.0016) * 60;

      // ── Frequency analysis ────────────────────────────────────────────────
      const analyser = getAnalyserNode();
      if (analyser && playing) {
        if (!freqBuf.current || freqBuf.current.length !== analyser.frequencyBinCount) {
          freqBuf.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(freqBuf.current);
        const d = freqBuf.current;
        // Sub-bass bins 0-1 doubled (kick fundamental), plus bins 2-6
        const raw = (d[0] * 2.5 + d[1] * 2.0 + d[2] + d[3] + d[4] + d[5] + d[6]) / (10.5 * 255);
        fast.current = fast.current * 0.45 + raw * 0.55;  // very reactive
        slow.current = slow.current * 0.96 + raw * 0.04;  // slow baseline
      } else {
        fast.current *= 0.88;
        slow.current *= 0.97;
      }

      // ── Kick / transient detection ─────────────────────────────────────────
      // A kick fires when the fast energy significantly exceeds the slow baseline.
      // Cooldown prevents double-triggering on the same beat.
      if (cooldown.current > 0) {
        cooldown.current -= 1;
      } else {
        const excess = fast.current - slow.current * 1.6;
        if (excess > 0.045 && playing) {
          const strength        = Math.min(1, excess * 10);
          kick.current          = strength;
          kickGlow.current      = strength;
          shakePh.current       = 0;
          cooldown.current      = 20; // ~333ms at 60fps — prevents double-trigger
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(Math.round(12 + strength * 16));
          }
        }
      }

      kick.current     *= 0.80;   // sharp decay — shape/scale snaps back quickly
      kickGlow.current *= 0.90;   // softer decay — glow lingers
      if (kick.current     < 0.002) kick.current     = 0;
      if (kickGlow.current < 0.002) kickGlow.current = 0;

      breathT.current += 1;

      const kc  = kick.current;
      const kg  = kickGlow.current;
      const br  = Math.sin(breathT.current * 0.009) * 0.5 + 0.5; // 0–1, ~11s period
      const v   = vis.current;

      // ── Lateral shake — damped oscillation on kick ────────────────────────
      let shakeX = 0;
      if (kc > 0.015) {
        shakePh.current += 1;
        // Rapid oscillation (1.4 rad/frame), damped by kick decay
        shakeX = Math.sin(shakePh.current * 1.4) * kc * 5.5;
      }

      // ── Scale — breathing baseline × kick spike ───────────────────────────
      const baseScale = 0.970 + br * 0.042;  // 0.970 – 1.012
      const kickScale = 1     + kc * 0.130;  // up to 1.130 on strong kick
      const scale = baseScale * kickScale;

      // ── DOM mutations ─────────────────────────────────────────────────────
      if (svgRef.current) {
        svgRef.current.style.opacity = String(v);
      }

      if (groupRef.current) {
        // Scale from heart centre (180, 334); shake on X
        groupRef.current.setAttribute(
          "transform",
          `translate(${180 + shakeX},334) scale(${scale.toFixed(4)}) translate(-180,-334)`,
        );
      }

      if (bodyRef.current) {
        // Fill body: brightens on breathing + sustained glow tail
        bodyRef.current.style.opacity = String(
          Math.min(0.55 + br * 0.16 + kg * 0.26, 0.90),
        );
      }

      if (innerCoreRef.current) {
        // Warm amber core — pulses with kick, stays subtle between
        innerCoreRef.current.style.opacity = String(
          Math.min(0.32 + br * 0.12 + kg * 0.30, 0.72),
        );
      }

      if (strokeHaloRef.current) {
        // Wide pressure halo — expands dramatically on kick
        strokeHaloRef.current.setAttribute("stroke-width", String(12 + kc * 26));
        strokeHaloRef.current.style.opacity = String(
          Math.min(0.22 + br * 0.10 + kg * 0.32, 0.60),
        );
      }

      if (strokeRef.current) {
        // Crisp outline — thickens on kick for the "thump" moment
        strokeRef.current.setAttribute("stroke-width", String(1.4 + kc * 3.2));
        strokeRef.current.style.opacity = String(
          Math.min(0.42 + br * 0.18 + kg * 0.40, 0.92),
        );
      }

      if (ambientRef.current) {
        // Background haze — expands on kick, giving "pressure wave" feel
        ambientRef.current.setAttribute("rx", String(210 + br * 22 + kg * 55));
        ambientRef.current.setAttribute("ry", String(245 + br * 25 + kg * 62));
        ambientRef.current.style.opacity = String(
          Math.min(0.20 + br * 0.12 + kg * 0.26, 0.55),
        );
      }

      rafId.current = requestAnimationFrame(loop);
    };

    if (rafId.current) cancelAnimationFrame(rafId.current);
    rafId.current = requestAnimationFrame(loop);
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current); };
  }, [getAnalyserNode]);

  return (
    <div
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        1,
        pointerEvents: "none",
        mixBlendMode:  "screen" as React.CSSProperties["mixBlendMode"],
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
          {/* Deep blur for the filled body and halo stroke */}
          <filter id="nhbBodyGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="24" />
          </filter>
          {/* Inner core — slightly tighter blur keeps amber warmth focussed */}
          <filter id="nhbCoreGlow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="18" />
          </filter>
          {/* Thin stroke glow — soft but tight, keeps the outline crisp */}
          <filter id="nhbEdge" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
          {/* Large ambient haze */}
          <filter id="nhbHaze" x="-130%" y="-130%" width="360%" height="360%">
            <feGaussianBlur stdDeviation="56" />
          </filter>
        </defs>

        {/* ── 1. Ambient background haze — whole screen breathes with bass ── */}
        <ellipse
          ref={ambientRef}
          cx="180" cy="344"
          rx={210} ry={245}
          fill="hsl(352,42%,9%)"
          filter="url(#nhbHaze)"
          style={{ opacity: 0.20 }}
        />

        <g ref={groupRef}>
          {/* ── 2. Outer pressure halo — wide blurred stroke, blooms on kick ── */}
          <path
            ref={strokeHaloRef}
            d={HEART}
            fill="none"
            stroke="hsl(352,48%,16%)"
            strokeWidth={12}
            filter="url(#nhbBodyGlow)"
            style={{ opacity: 0.22 }}
          />

          {/* ── 3. Filled body — the warm mass of the heart ── */}
          <path
            ref={bodyRef}
            d={HEART}
            fill="hsl(352,56%,18%)"
            filter="url(#nhbBodyGlow)"
            style={{ opacity: 0.55 }}
          />

          {/* ── 4. Inner amber core — warmth at the emotional centre ── */}
          <path
            ref={innerCoreRef}
            d={HEART}
            fill="hsl(24,48%,14%)"
            filter="url(#nhbCoreGlow)"
            transform="translate(180,334) scale(0.62) translate(-180,-334)"
            style={{ opacity: 0.32 }}
          />

          {/* ── 5. Crisp outline — what makes the heart unmistakably a heart ── */}
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
