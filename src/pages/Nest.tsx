import React, { useState, useEffect, useRef } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { AudioControls } from "@/components/AudioControls";
import { useAtmosphere } from "@/hooks/use-atmosphere";
import { supabase } from "@/lib/supabase";

/* ─── Bird — calm small songbird, sits in nest ───────────── */
function Bird() {
  interface BirdPose { angle: number; shift: number; }
  const [blink, setBlink] = useState(false);
  const [pose, setPose] = useState<BirdPose>({ angle: 0, shift: 0 });

  /* ── Blink — soft eyelid close, no transform ── */
  useEffect(() => {
    let blinkId: ReturnType<typeof setTimeout>;
    let openId: ReturnType<typeof setTimeout>;
    const loop = () => {
      blinkId = setTimeout(() => {
        setBlink(true);
        openId = setTimeout(() => { setBlink(false); loop(); }, 130);
      }, 3200 + Math.random() * 6000);
    };
    loop();
    return () => { clearTimeout(blinkId); clearTimeout(openId); };
  }, []);

  /* ── Head poses — angle + body shift ── */
  useEffect(() => {
    const POSES: BirdPose[] = [
      { angle: 0,   shift: 0    },  // neutral (weighted 3×)
      { angle: 0,   shift: 0    },
      { angle: 0,   shift: 0    },
      { angle: -7,  shift: 0.5  },  // slight upper-left look
      { angle: -13, shift: 0.9  },  // looking left
      { angle: -17, shift: 1.3  },  // looking further left
      { angle: 7,   shift: -0.5 },  // glance down toward nest
      { angle: -3,  shift: 0.2  },  // tiny twitch left
      { angle: 3,   shift: -0.2 },  // tiny twitch right
      { angle: -10, shift: 0.7  },  // settled left
    ];
    let id: ReturnType<typeof setTimeout>;
    const loop = () => {
      const next = POSES[Math.floor(Math.random() * POSES.length)];
      id = setTimeout(() => { setPose(next); loop(); }, 7000 + Math.random() * 13000);
    };
    loop();
    return () => clearTimeout(id);
  }, []);

  return (
    <g>
      {/* ── Nest — woven twig cup ── */}
      <g>
        <path d="M 144,352 Q 180,364 216,352" fill="none" stroke="#13100a" strokeWidth="3.2" strokeLinecap="round"/>
        <path d="M 147,348 Q 180,360 213,348" fill="none" stroke="#1a1610" strokeWidth="2.2" strokeLinecap="round"/>
        <path d="M 150,344 Q 180,354 210,344" fill="none" stroke="#1e1812" strokeWidth="1.8" strokeLinecap="round"/>
        {/* Woven crossings */}
        <path d="M 151,351 Q 161,341 171,351 Q 180,343 189,351 Q 199,341 209,349" fill="none" stroke="#13100a" strokeWidth="1.3" strokeLinecap="round" opacity="0.65"/>
        <path d="M 153,355 Q 163,347 173,355 Q 183,347 193,355 Q 203,347 211,353" fill="none" stroke="#161108" strokeWidth="1" strokeLinecap="round" opacity="0.55"/>
        <path d="M 147,348 Q 157,340 165,347 Q 173,340 181,347 Q 189,340 197,347 Q 205,340 213,347" fill="none" stroke="#16120b" strokeWidth="1.1" strokeLinecap="round" opacity="0.60"/>
        {/* Side walls */}
        <path d="M 147,353 Q 142,343 146,331" fill="none" stroke="#13100a" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M 213,353 Q 218,343 214,331" fill="none" stroke="#13100a" strokeWidth="2.5" strokeLinecap="round"/>
        {/* Nest shadow interior */}
        <ellipse cx="180" cy="350" rx="30" ry="6" fill="#0a0705" opacity="0.55"/>
      </g>

      {/* ── Bird — outer breathing layer ── */}
      <motion.g
        animate={{ y: [0, -0.58, 0] }}
        transition={{ duration: 5.2, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Body shift — follows head turn for physical coherence */}
        <motion.g
          animate={{ x: pose.shift }}
          transition={{ duration: 3.8, ease: [0.42, 0, 0.22, 1] }}
        >
          {/* ── Body — natural perched songbird silhouette ──
              Compact oval: rounded breast left, flat back top, slight tail protrusion right.
              Width ≈ 78px, height ≈ 46px — believable sitting proportions. */}
          <path d="
            M 157,310
            C 162,302 176,297 194,300
            C 208,302 219,311 223,323
            C 226,334 220,343 209,345
            C 199,347 184,346 169,343
            C 156,340 147,332 147,321
            C 147,314 151,310 157,310
            Z
          " fill="hsl(30 18% 12%)"/>

          {/* Upper back — dark mantle overlay, keeps breast/belly warm */}
          <ellipse cx="193" cy="313" rx="24" ry="8" fill="#0a0807" opacity="0.58"/>

          {/* Scapular line — where folded wing meets back (subtle, natural) */}
          <path d="M 165,309 Q 185,303 207,307 Q 216,307 221,312"
            fill="none" stroke="#070503" strokeWidth="1.3"
            strokeLinecap="round" opacity="0.42"/>

          {/* Secondary wing panel hint — lower wing edge */}
          <path d="M 168,320 Q 188,316 210,320 Q 218,322 222,327"
            fill="none" stroke="#080604" strokeWidth="1.0"
            strokeLinecap="round" opacity="0.30"/>

          {/* Tail feathers — two subtle pointed strokes at rump */}
          <path d="M 208,343 Q 216,347 220,354"
            fill="none" stroke="#0b0907" strokeWidth="2.2"
            strokeLinecap="round" opacity="0.55"/>
          <path d="M 212,341 Q 220,344 225,350"
            fill="none" stroke="#090705" strokeWidth="1.4"
            strokeLinecap="round" opacity="0.38"/>

          {/* Belly — hollow glow illuminating underside from below */}
          <ellipse cx="172" cy="339" rx="19" ry="7" fill="hsl(33 48% 24%)" opacity="0.88"/>
          <ellipse cx="165" cy="342" rx="11" ry="4.5" fill="hsl(35 62% 36%)" opacity="0.72"/>
          <ellipse cx="159" cy="344" rx="7" ry="3" fill="hsl(36 78% 52%)" opacity="0.48"/>

          {/* ── Head — rotate from neck pivot (148, 313) ──
              transformBox:"view-box" anchors transformOrigin to SVG coordinate space.
              Head is r=11 — slightly smaller, more proportional to body.              */}
          <motion.g
            animate={{ rotate: pose.angle }}
            transition={{ duration: 3.8, ease: [0.42, 0, 0.22, 1] }}
            style={{
              transformBox: "view-box" as React.CSSProperties["transformBox"],
              transformOrigin: "148px 313px",
            }}
          >
            {/* Neck fill — blends head into body at junction */}
            <ellipse cx="155" cy="315" rx="7" ry="5.5" fill="#0e0c08"/>

            {/* Head — slightly flattened top (real birds aren't perfect spheres) */}
            <circle cx="148" cy="311" r="11" fill="#0f0d09"/>

            {/* Crown — subtle, suggests feather tufting, not a dome */}
            <ellipse cx="148" cy="302" rx="7.5" ry="5" fill="#0b0907" opacity="0.52"/>

            {/* Lore — small dark area between eye and beak (anatomically correct) */}
            <ellipse cx="140" cy="311" rx="4" ry="3" fill="#090705" opacity="0.55"/>

            {/* Beak — short, slightly pointed, songbird proportions */}
            <path d="M 138,311 L 126,315 L 138,319 Z" fill="#2a1c0b"/>
            {/* Beak ridge — subtle upper mandible line */}
            <path d="M 138,311 L 126,315" fill="none" stroke="#1c1108" strokeWidth="0.8" strokeLinecap="round" opacity="0.60"/>

            {/* Eye socket — natural size, not oversized */}
            <circle cx="142" cy="308" r="3.6" fill="#080604"/>

            {/* Eye iris — scaleY from exact center; calm, observant, not large */}
            <motion.g
              animate={{ scaleY: blink ? 0.05 : 1 }}
              transition={{ duration: 0.07, ease: "easeInOut" }}
              style={{
                transformBox: "view-box" as React.CSSProperties["transformBox"],
                transformOrigin: "142px 308px",
              }}
            >
              <circle cx="142" cy="308" r="2.9" fill="#0b0907"/>
            </motion.g>

            {/* Catchlight — small, warm, fades during blink */}
            <motion.circle
              cx="143"
              cy="307"
              r={1.0}
              fill="hsl(38 60% 72%)"
              animate={{ opacity: blink ? 0 : 0.90 }}
              transition={{ duration: 0.06 }}
            />
          </motion.g>
        </motion.g>
      </motion.g>
    </g>
  );
}

/* ─── Bark lines — procedural dark texture ───────────────── */
function BarkTexture() {
  return (
    <g>
      {/* Main deep fissures — left zone */}
      <path d="M 102,0 Q 99,55 97,130 Q 95,205 94,280 Q 93,355 95,430 Q 97,505 98,580 Q 99,640 99,700" fill="none" stroke="#070505" strokeWidth="3.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M 116,0 Q 113,65 111,140 Q 109,215 108,295 Q 107,370 109,445 Q 111,520 112,595 Q 113,650 113,700" fill="none" stroke="#080604" strokeWidth="2.5" opacity="0.55" strokeLinecap="round"/>
      <path d="M 128,10 Q 126,80 124,160 Q 122,240 121,320 Q 120,400 122,475 Q 124,550 125,625 Q 126,670 126,700" fill="none" stroke="#090704" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
      <path d="M 142,5 Q 140,75 138,155 Q 137,235 137,315 Q 137,395 139,470 Q 141,545 142,615 Q 143,660 143,700" fill="none" stroke="#090604" strokeWidth="1.5" opacity="0.38" strokeLinecap="round"/>

      {/* Main deep fissures — right zone */}
      <path d="M 258,0 Q 261,55 263,130 Q 265,205 266,280 Q 267,355 265,430 Q 263,505 262,580 Q 261,640 261,700" fill="none" stroke="#070505" strokeWidth="3.5" opacity="0.7" strokeLinecap="round"/>
      <path d="M 244,0 Q 247,65 249,140 Q 251,215 252,295 Q 253,370 251,445 Q 249,520 248,595 Q 247,650 247,700" fill="none" stroke="#080604" strokeWidth="2.5" opacity="0.55" strokeLinecap="round"/>
      <path d="M 232,10 Q 234,80 236,160 Q 238,240 239,320 Q 240,400 238,475 Q 236,550 235,625 Q 234,670 234,700" fill="none" stroke="#090704" strokeWidth="2" opacity="0.45" strokeLinecap="round"/>
      <path d="M 218,5 Q 220,75 222,155 Q 223,235 223,315 Q 223,395 221,470 Q 219,545 218,615 Q 217,660 217,700" fill="none" stroke="#090604" strokeWidth="1.5" opacity="0.38" strokeLinecap="round"/>

      {/* Secondary fissures — center-left */}
      <path d="M 155,20 Q 153,95 152,175 Q 151,255 151,330" fill="none" stroke="#0a0705" strokeWidth="1.2" opacity="0.32" strokeLinecap="round"/>
      <path d="M 163,0 Q 161,70 160,150 Q 159,230 159,310 Q 159,385 160,460" fill="none" stroke="#0b0806" strokeWidth="1" opacity="0.28" strokeLinecap="round"/>

      {/* Secondary fissures — center-right */}
      <path d="M 205,20 Q 207,95 208,175 Q 209,255 209,330" fill="none" stroke="#0a0705" strokeWidth="1.2" opacity="0.32" strokeLinecap="round"/>
      <path d="M 197,0 Q 199,70 200,150 Q 201,230 201,310 Q 201,385 200,460" fill="none" stroke="#0b0806" strokeWidth="1" opacity="0.28" strokeLinecap="round"/>

      {/* Horizontal bark ridges — scattered */}
      <path d="M 90,180 Q 102,177 114,179 Q 120,177 128,178" fill="none" stroke="#080604" strokeWidth="1.5" opacity="0.35" strokeLinecap="round"/>
      <path d="M 232,195 Q 244,192 256,194 Q 262,192 270,193" fill="none" stroke="#080604" strokeWidth="1.5" opacity="0.35" strokeLinecap="round"/>
      <path d="M 88,420 Q 100,417 112,419 Q 118,417 126,418" fill="none" stroke="#080604" strokeWidth="1.3" opacity="0.28" strokeLinecap="round"/>
      <path d="M 234,435 Q 246,432 258,434 Q 264,432 272,433" fill="none" stroke="#080604" strokeWidth="1.3" opacity="0.28" strokeLinecap="round"/>
      <path d="M 92,560 Q 104,557 116,559" fill="none" stroke="#070504" strokeWidth="1.2" opacity="0.25" strokeLinecap="round"/>
      <path d="M 244,565 Q 256,562 268,564" fill="none" stroke="#070504" strokeWidth="1.2" opacity="0.25" strokeLinecap="round"/>

      {/* Short diagonal cracks */}
      <path d="M 108,310 Q 116,305 122,308" fill="none" stroke="#090604" strokeWidth="1.2" opacity="0.30" strokeLinecap="round"/>
      <path d="M 238,295 Q 245,291 250,294" fill="none" stroke="#090604" strokeWidth="1.2" opacity="0.30" strokeLinecap="round"/>
      <path d="M 100,480 Q 106,476 112,479" fill="none" stroke="#080605" strokeWidth="1.1" opacity="0.25" strokeLinecap="round"/>
      <path d="M 248,490 Q 254,486 260,489" fill="none" stroke="#080605" strokeWidth="1.1" opacity="0.25" strokeLinecap="round"/>

      {/* Wood grain around hollow — concentric wood ring hints */}
      <path d="M 128,240 Q 145,232 165,230" fill="none" stroke="#0a0806" strokeWidth="1.3" opacity="0.35" strokeLinecap="round"/>
      <path d="M 195,230 Q 215,232 232,240" fill="none" stroke="#0a0806" strokeWidth="1.3" opacity="0.35" strokeLinecap="round"/>
      <path d="M 125,370 Q 143,378 165,380" fill="none" stroke="#0a0806" strokeWidth="1.3" opacity="0.30" strokeLinecap="round"/>
      <path d="M 195,380 Q 217,378 235,370" fill="none" stroke="#0a0806" strokeWidth="1.3" opacity="0.30" strokeLinecap="round"/>

      {/* Very thin hairline cracks */}
      <path d="M 135,450 Q 140,440 145,448 Q 148,438 153,445" fill="none" stroke="#090604" strokeWidth="0.8" opacity="0.22" strokeLinecap="round"/>
      <path d="M 207,460 Q 212,450 217,458 Q 220,448 225,455" fill="none" stroke="#090604" strokeWidth="0.8" opacity="0.22" strokeLinecap="round"/>

      {/* Warm bark ridge highlights — bark ridge tops catching ambient light */}
      {/* Left zone highlights — just inside each dark fissure */}
      <path d="M 107,0 Q 104,55 102,130 Q 100,205 99,280 Q 98,355 100,430 Q 102,505 103,580 Q 104,640 104,700" fill="none" stroke="hsl(30 10% 11%)" strokeWidth="1.2" opacity="0.50" strokeLinecap="round"/>
      <path d="M 121,0 Q 118,65 116,140 Q 114,215 113,295 Q 112,370 114,445 Q 116,520 117,595 Q 118,650 118,700" fill="none" stroke="hsl(30 8% 12%)" strokeWidth="1" opacity="0.42" strokeLinecap="round"/>
      <path d="M 133,10 Q 131,80 129,160 Q 127,240 126,320 Q 125,400 127,475 Q 129,550 130,625 Q 131,670 131,700" fill="none" stroke="hsl(30 7% 12%)" strokeWidth="0.9" opacity="0.36" strokeLinecap="round"/>
      <path d="M 147,5 Q 145,75 143,155 Q 142,235 142,315 Q 142,395 144,470 Q 146,545 147,615 Q 148,660 148,700" fill="none" stroke="hsl(30 6% 11%)" strokeWidth="0.8" opacity="0.30" strokeLinecap="round"/>

      {/* Right zone highlights */}
      <path d="M 253,0 Q 256,55 258,130 Q 260,205 261,280 Q 262,355 260,430 Q 258,505 257,580 Q 256,640 256,700" fill="none" stroke="hsl(30 10% 11%)" strokeWidth="1.2" opacity="0.50" strokeLinecap="round"/>
      <path d="M 239,0 Q 242,65 244,140 Q 246,215 247,295 Q 248,370 246,445 Q 244,520 243,595 Q 242,650 242,700" fill="none" stroke="hsl(30 8% 12%)" strokeWidth="1" opacity="0.42" strokeLinecap="round"/>
      <path d="M 227,10 Q 229,80 231,160 Q 233,240 234,320 Q 235,400 233,475 Q 231,550 230,625 Q 229,670 229,700" fill="none" stroke="hsl(30 7% 12%)" strokeWidth="0.9" opacity="0.36" strokeLinecap="round"/>
      <path d="M 213,5 Q 215,75 217,155 Q 218,235 218,315 Q 218,395 216,470 Q 214,545 213,615 Q 212,660 212,700" fill="none" stroke="hsl(30 6% 11%)" strokeWidth="0.8" opacity="0.30" strokeLinecap="round"/>
    </g>
  );
}

/* ─── Tree trunk SVG ─────────────────────────────────────── */
function TreeTrunk() {
  const [particles] = useState(() =>
    Array.from({ length: 14 }, (_, i) => ({
      id: i,
      x: 160 + Math.random() * 40,
      drift: (Math.random() - 0.5) * 22,
      dur: 5.5 + Math.random() * 8,
      delay: Math.random() * 8,
      size: 0.8 + Math.random() * 1.6,
    }))
  );

  // ── Bass-reactive hollow glow — updates a single SVG element at 60fps
  //    without re-rendering the whole component tree.
  const { isPlaying, getAnalyserNode } = useAtmosphere();
  const pulseGlowRef = useRef<SVGEllipseElement>(null);
  const nestFreqData = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const nestSmoothed = useRef(0);

  useEffect(() => {
    const el = pulseGlowRef.current;
    if (!el) return;
    if (!isPlaying) {
      el.style.opacity = "0";
      nestSmoothed.current *= 0.0; // reset on stop
      return;
    }
    let animId: number;
    const loop = () => {
      const analyser = getAnalyserNode();
      if (analyser) {
        if (!nestFreqData.current || nestFreqData.current.length !== analyser.frequencyBinCount) {
          nestFreqData.current = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(nestFreqData.current);
        const d = nestFreqData.current;
        const raw = (d[0] + d[1] + d[2] + d[3]) / (4 * 255);
        nestSmoothed.current = nestSmoothed.current * 0.78 + raw * 0.22;
      }
      // Subtle hollow halo brightens slightly on bass — max ±0.20 opacity range
      el.style.opacity = String(0.06 + nestSmoothed.current * 0.22);
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, getAnalyserNode]);

  return (
    <svg
      viewBox="0 0 360 700"
      className="w-full h-full"
      style={{ display: "block" }}
      preserveAspectRatio="xMidYMid meet"
    >
      <defs>
        {/* Trunk: very dark, deep cylindrical gradient */}
        <linearGradient id="trunkGrad" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#040303"/>
          <stop offset="12%"  stopColor="#0a0806"/>
          <stop offset="32%"  stopColor="#141008"/>
          <stop offset="50%"  stopColor="#18130e"/>
          <stop offset="68%"  stopColor="#141008"/>
          <stop offset="88%"  stopColor="#0a0806"/>
          <stop offset="100%" stopColor="#040303"/>
        </linearGradient>

        {/* Hollow: near-black interior with slight warm depth */}
        <radialGradient id="hollowDepth" cx="50%" cy="75%" r="58%">
          <stop offset="0%"   stopColor="#0c0906"/>
          <stop offset="100%" stopColor="#040302"/>
        </radialGradient>

        {/* Hollow warm glow — primary emotional focal point, bright enough to silhouette bird */}
        <radialGradient id="hollowGlow" cx="50%" cy="58%" r="52%">
          <stop offset="0%"  stopColor="hsl(38 96% 72%)" stopOpacity="1.0"/>
          <stop offset="18%" stopColor="hsl(36 85% 56%)" stopOpacity="0.90"/>
          <stop offset="40%" stopColor="hsl(33 68% 38%)" stopOpacity="0.64"/>
          <stop offset="70%" stopColor="hsl(28 40% 18%)" stopOpacity="0.28"/>
          <stop offset="100%" stopColor="hsl(24 18% 8%)" stopOpacity="0.03"/>
        </radialGradient>

        {/* Wide ambient halo — light spilling out of hollow */}
        <radialGradient id="glowHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%"  stopColor="hsl(35 70% 40%)" stopOpacity="0.28"/>
          <stop offset="45%" stopColor="hsl(33 55% 28%)" stopOpacity="0.10"/>
          <stop offset="100%" stopColor="hsl(30 40% 15%)" stopOpacity="0.0"/>
        </radialGradient>

        {/* Hollow overhang rim shadow */}
        <radialGradient id="hollowRim" cx="50%" cy="8%" r="85%">
          <stop offset="0%"  stopColor="#000" stopOpacity="0.65"/>
          <stop offset="100%" stopColor="#000" stopOpacity="0.0"/>
        </radialGradient>

        {/* Hollow rim warm glow — inner edge illumination */}
        <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
          <stop offset="85%" stopColor="hsl(35 70% 50%)" stopOpacity="0.0"/>
          <stop offset="100%" stopColor="hsl(35 70% 50%)" stopOpacity="0.22"/>
        </radialGradient>

        {/* Clip path for particles */}
        <clipPath id="hollowClip">
          <path d="M 180,240 C 198,240 226,262 230,297 C 234,333 222,366 180,371 C 138,366 126,333 130,297 C 134,262 162,240 180,240 Z"/>
        </clipPath>
      </defs>

      {/* ── Left branch ── */}
      <motion.g
        animate={{ rotate: [-0.5, 0.4, -0.5] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "90px", originY: "215px" }}
      >
        <path d="M 90,215 C 56,200 14,192 -34,186" fill="none" stroke="#060403" strokeWidth="30" strokeLinecap="round"/>
        <path d="M 90,215 C 56,200 14,192 -34,186" fill="none" stroke="#0f0c08" strokeWidth="20" strokeLinecap="round"/>
        <path d="M 90,215 C 56,200 14,192 -34,186" fill="none" stroke="#141008" strokeWidth="12" strokeLinecap="round"/>
        {/* Sub-branch */}
        <path d="M 18,197 C 0,178 -10,156 -18,130" fill="none" stroke="#060403" strokeWidth="16" strokeLinecap="round"/>
        <path d="M 18,197 C 0,178 -10,156 -18,130" fill="none" stroke="#0f0c08" strokeWidth="10" strokeLinecap="round"/>
        <path d="M 18,197 C 0,178 -10,156 -18,130" fill="none" stroke="#141008" strokeWidth="6" strokeLinecap="round"/>
        {/* Leaves — subtle, dark, slightly varied */}
        <ellipse cx="-32" cy="184" rx="24" ry="15" fill="#0a0806" transform="rotate(-16,-32,184)" opacity="0.92"/>
        <ellipse cx="-44" cy="174" rx="18" ry="11" fill="#090705" transform="rotate(-26,-44,174)" opacity="0.80"/>
        <ellipse cx="-16" cy="126" rx="22" ry="13" fill="#0c0906" transform="rotate(-10,-16,126)" opacity="0.88"/>
        <ellipse cx="-28" cy="118" rx="16" ry="10" fill="#090705" transform="rotate(-20,-28,118)" opacity="0.74"/>
        <ellipse cx="-4" cy="118" rx="14" ry="9" fill="#0b0805" transform="rotate(-5,-4,118)" opacity="0.70"/>
        {/* Bark texture on branch */}
        <path d="M 60,205 Q 52,200 44,197" fill="none" stroke="#060403" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
        <path d="M 30,195 Q 22,191 14,190" fill="none" stroke="#060403" strokeWidth="1.5" opacity="0.4" strokeLinecap="round"/>
      </motion.g>

      {/* ── Right branch ── */}
      <motion.g
        animate={{ rotate: [0.5, -0.4, 0.5] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "270px", originY: "248px" }}
      >
        <path d="M 270,248 C 306,234 348,224 394,218" fill="none" stroke="#060403" strokeWidth="28" strokeLinecap="round"/>
        <path d="M 270,248 C 306,234 348,224 394,218" fill="none" stroke="#0f0c08" strokeWidth="18" strokeLinecap="round"/>
        <path d="M 270,248 C 306,234 348,224 394,218" fill="none" stroke="#141008" strokeWidth="11" strokeLinecap="round"/>
        {/* Sub-branch */}
        <path d="M 342,226 C 358,207 365,185 368,162" fill="none" stroke="#060403" strokeWidth="14" strokeLinecap="round"/>
        <path d="M 342,226 C 358,207 365,185 368,162" fill="none" stroke="#0f0c08" strokeWidth="9" strokeLinecap="round"/>
        <path d="M 342,226 C 358,207 365,185 368,162" fill="none" stroke="#141008" strokeWidth="5.5" strokeLinecap="round"/>
        {/* Leaves */}
        <ellipse cx="394" cy="215" rx="23" ry="14" fill="#0a0806" transform="rotate(13,394,215)" opacity="0.90"/>
        <ellipse cx="371" cy="160" rx="20" ry="12" fill="#0c0906" transform="rotate(8,371,160)" opacity="0.85"/>
        <ellipse cx="382" cy="153" rx="15" ry="9" fill="#090705" transform="rotate(18,382,153)" opacity="0.72"/>
        <ellipse cx="390" cy="206" rx="17" ry="10" fill="#0a0806" transform="rotate(20,390,206)" opacity="0.75"/>
        {/* Bark on branch */}
        <path d="M 300,238 Q 308,234 316,232" fill="none" stroke="#060403" strokeWidth="1.5" opacity="0.5" strokeLinecap="round"/>
        <path d="M 330,229 Q 338,225 346,224" fill="none" stroke="#060403" strokeWidth="1.5" opacity="0.4" strokeLinecap="round"/>
      </motion.g>

      {/* ── Trunk ── */}
      <motion.g
        animate={{ rotate: [-0.1, 0.1, -0.1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
        style={{ originX: "180px", originY: "700px" }}
      >
        {/* Trunk base fill */}
        <path
          d="M 88,700 C 85,555 87,408 90,305 C 93,218 102,128 116,0 L 244,0 C 258,128 267,218 270,305 C 273,408 275,555 272,700 Z"
          fill="url(#trunkGrad)"
        />

        {/* Bark texture */}
        <BarkTexture />

        {/* ── Hollow ── */}
        {/* Large outer ambient halo — warm light spilling from hollow */}
        <ellipse cx="180" cy="305" rx="114" ry="128" fill="url(#glowHalo)"/>

        {/* Bass-reactive pulse ring — updated via DOM ref, no re-renders */}
        <ellipse
          ref={pulseGlowRef}
          cx="180" cy="305"
          rx="122" ry="136"
          fill="url(#glowHalo)"
          style={{ opacity: 0, transition: "opacity 1.8s ease-out" }}
        />

        {/* Hollow interior dark */}
        <path d="M 180,240 C 198,240 226,262 230,297 C 234,333 222,366 180,371 C 138,366 126,333 130,297 C 134,262 162,240 180,240 Z"
          fill="url(#hollowDepth)"/>

        {/* Warm glow — the emotional heart */}
        <motion.path
          d="M 180,240 C 198,240 226,262 230,297 C 234,333 222,366 180,371 C 138,366 126,333 130,297 C 134,262 162,240 180,240 Z"
          fill="url(#hollowGlow)"
          animate={{ opacity: [0.90, 1, 0.93, 0.98] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* No stroke rim - the glow gradient defines the hollow edge naturally */}

        {/* Overhang shadow — top of hollow in shadow */}
        <path d="M 180,240 C 198,240 226,262 230,297 L 130,297 C 134,262 162,240 180,240 Z"
          fill="url(#hollowRim)" opacity="0.70"/>

        {/* Rim glow — inner edge of hollow catches warm light */}
        <path d="M 180,240 C 198,240 226,262 230,297 C 234,333 222,366 180,371 C 138,366 126,333 130,297 C 134,262 162,240 180,240 Z"
          fill="url(#rimGlow)" opacity="0.7"/>

        {/* Warm ember particles */}
        <g clipPath="url(#hollowClip)">
          {particles.map((p) => (
            <motion.g
              key={p.id}
              animate={{ y: [0, -131], x: [0, p.drift], opacity: [0, 0.70, 0.28, 0] }}
              transition={{ duration: p.dur, delay: p.delay, repeat: Infinity, ease: "easeOut" }}
            >
              <circle cx={p.x} cy={366} r={p.size} fill="hsl(37 82% 64%)" />
            </motion.g>
          ))}
        </g>

        {/* Bird + nest */}
        <Bird />

        {/* Edge shadows — deep cylindrical rounding */}
        <path d="M 88,700 C 85,555 87,408 90,305 C 93,218 102,128 116,0 L 132,0 C 118,128 110,218 108,305 C 106,408 105,555 106,700 Z"
          fill="#000" opacity="0.40"/>
        <path d="M 272,700 C 275,555 273,408 270,305 C 267,218 258,128 244,0 L 228,0 C 242,128 251,218 254,305 C 257,408 258,555 256,700 Z"
          fill="#000" opacity="0.40"/>

        {/* Center shadow channel — adds depth to trunk face */}
        <path d="M 168,0 Q 166,175 165,350 Q 165,500 166,700 L 194,700 Q 195,500 195,350 Q 194,175 192,0 Z"
          fill="#000" opacity="0.08"/>
      </motion.g>
    </svg>
  );
}

type ThoughtMemory = {
  text: string;
  created_at: string;
};

type NestInsight = {
  topWords: string[];
  activeMonth: string;
  thoughtsLast30: number;
  monthlyThoughts: number;
  monthlyMemos: number;
  monthlyResets: number;
};
type ReflectionLookback = {
  label: string;
  thought: ThoughtMemory | null;
};

type RitualMemory = {
  name: string;
  created_at: string;
};

function daysAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  return Math.max(1, Math.floor(diff / 86400000));
}

function monthName(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
function nextMilestone(streak: number) {
  const milestones = [7, 30, 100, 365];
  return milestones.find((m) => m > streak) ?? 365;
}

function calculateStreak(dates: string[]) {
  const unique = new Set(dates);
  let streak = 0;

  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (unique.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

function pickDailyPrompts() {
  const prompts = [
    "What is on your mind right now?",
    "What are you proud of today?",
    "What should you let go of?",
    "What gave you energy today?",
    "What would you tell your younger self?",
  ];

  const day = new Date().getDate();
  return [
    prompts[day % prompts.length],
    prompts[(day + 2) % prompts.length],
    prompts[(day + 4) % prompts.length],
  ];
}

function findClosestThought(thoughts: ThoughtMemory[], days: number) {
  const target = Date.now() - days * 86400000;
  const tolerance = 3 * 86400000;

  return (
    thoughts
      .map((t) => ({
        thought: t,
        distance: Math.abs(new Date(t.created_at).getTime() - target),
      }))
      .filter((item) => item.distance <= tolerance)
      .sort((a, b) => a.distance - b.distance)[0]?.thought ?? null
  );
}
function buildInsights(thoughts: ThoughtMemory[]): NestInsight {
  const stopWords = new Set([
    "ich", "und", "der", "die", "das", "ist", "bin", "mit", "nicht", "mir",
    "mich", "ein", "eine", "es", "zu", "so", "im", "in", "auf", "für",
    "the", "and", "you", "that", "this", "with", "have", "was", "but",
  ]);

  const words = thoughts
    .flatMap((t) =>
      t.text.toLowerCase().replace(/[^\p{L}\s]/gu, "").split(/\s+/)
    )
    .filter((w) => w.length > 3 && !stopWords.has(w));

  const counts = new Map<string, number>();
  words.forEach((w) => counts.set(w, (counts.get(w) ?? 0) + 1));

  const topWords = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([word]) => word);

  const monthCounts = new Map<string, number>();
  thoughts.forEach((t) => {
    const key = monthName(t.created_at);
    monthCounts.set(key, (monthCounts.get(key) ?? 0) + 1);
  });

  const activeMonth =
    [...monthCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "still open";

  const thirtyDaysAgo = Date.now() - 30 * 86400000;
  const thoughtsLast30 = thoughts.filter(
    (t) => new Date(t.created_at).getTime() >= thirtyDaysAgo
  ).length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  
  const monthlyThoughts = thoughts.filter(
    (t) => new Date(t.created_at).getTime() >= monthStart.getTime()
  ).length;
  
  return {
    topWords: topWords.length ? topWords : ["Calm", "Future", "Confidence"],
    activeMonth,
    thoughtsLast30,
    monthlyThoughts,
    monthlyMemos: 0,
    monthlyResets: 0,
  };
}
/* ─── Nest Screen ─────────────────────────────────────────── */
export function Nest() {
  const [stats, setStats] = useState({
    thoughts: 0,
    memos: 0,
    resets: 0,
    lookbacks: [] as ReflectionLookback[],
streak: 0,
prompts: pickDailyPrompts(),
rituals: [] as RitualMemory[],
    visits: 0,
    memberDays: 1,
    firstEntryDays: 1,
    memory: null as ThoughtMemory | null,
    deepMemory: null as ThoughtMemory | null,
    insights: {
      topWords: ["Calm", "Future", "Confidence"],
      activeMonth: "still open",
      thoughtsLast30: 0,
      monthlyThoughts: 0,
      monthlyMemos: 0,
      monthlyResets: 0,
    } as NestInsight,
  });

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase.from("nest_visits").insert({ user_id: user.id });

      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      
      const today = new Date().toISOString().slice(0, 10);
      
      await supabase
        .from("nest_daily_activity")
        .upsert(
          { user_id: user.id, activity_date: today },
          { onConflict: "user_id,activity_date" }
        );
      
      const [
        thoughtsCount,
        memosCount,
        resetsCount,
        visitsCount,
        thoughtsData,
        monthlyMemos,
        monthlyResets,
        activityData,
        ritualsData,
      ] = await Promise.all([
        supabase.from("thoughts").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("memos").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("reset_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("nest_visits").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("thoughts").select("text, created_at").eq("user_id", user.id).order("created_at", { ascending: true }),
        supabase.from("memos").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", monthStart.toISOString()),
        supabase.from("reset_sessions").select("id", { count: "exact", head: true }).eq("user_id", user.id).gte("created_at", monthStart.toISOString()),
        supabase.from("nest_daily_activity").select("activity_date").eq("user_id", user.id),
        supabase.from("rituals").select("name, created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(3),
      ]);

      const thoughts = thoughtsData.data ?? [];

const memory = thoughts.length
  ? thoughts[Math.floor(Math.random() * thoughts.length)]
  : null;

const deepMemory = thoughts.length > 0 ? thoughts[0] : null;

const memberDays = Math.max(
  1,
  Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
);

const lookbackTargets = [7, 30, 60].filter((days) => days <= memberDays);

const lookbacks: ReflectionLookback[] = lookbackTargets
  .map((days) => ({
    label: `${days} days ago`,
    thought: findClosestThought(thoughts, days),
  }))
  .filter((item) => item.thought);

const streak = calculateStreak(
  (activityData.data ?? []).map((d) => d.activity_date)
);
    
    const insights = buildInsights(thoughts);
    insights.monthlyMemos = monthlyMemos.count ?? 0;
    insights.monthlyResets = monthlyResets.count ?? 0;
      const firstEntry = thoughts[0]?.created_at ?? user.created_at;

      setStats({
        thoughts: thoughtsCount.count ?? 0,
        memos: memosCount.count ?? 0,
        resets: resetsCount.count ?? 0,
        visits: visitsCount.count ?? 0,
        memberDays: Math.max(
          1,
          Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
        ),
        firstEntryDays: Math.max(
          1,
          Math.floor((Date.now() - new Date(firstEntry).getTime()) / 86400000)
        ),
        memory,
        deepMemory,
        lookbacks,
        streak,
        prompts: pickDailyPrompts(),
        rituals: ritualsData.data ?? [],
        insights,
      });
    }

    load().catch(console.error);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.9 }}
      style={{
        minHeight: "100svh",
        background: "#09080b",
        position: "relative",
        overflowY: "auto",
        overflowX: "hidden",
        display: "flex",
        flexDirection: "column",
        maxWidth: 480,
        margin: "0 auto",
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "46px 20px 0" }}>
        <Link href="/home">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.32 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            style={{ background: "none", border: "none", cursor: "pointer", color: "rgba(190,170,135,0.7)", padding: 4 }}
          >
            <ChevronLeft size={19} strokeWidth={1.4} />
          </motion.button>
        </Link>
        <div style={{ width: 27 }} />
      </div>

      <div style={{ position: "fixed", inset: 0, bottom: 92, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.20, pointerEvents: "none" }}>
        <div style={{ width: "100%", height: "100%" }}>
          <TreeTrunk />
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.9 }}
        style={{
          position: "relative",
          zIndex: 12,
          padding: "104px 20px 128px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <Link href="/mood-log">
  <div style={{
    background: "rgba(255,255,255,0.024)",
    border: "1px solid rgba(255,255,255,0.055)",
    borderRadius: 18,
    padding: "18px 18px",
    cursor: "pointer",
  }}>
    <p style={{
      fontSize: 10,
      letterSpacing: "0.18em",
      textTransform: "uppercase",
      color: "rgba(205,170,100,0.40)",
      marginBottom: 8,
    }}>
      Mood Log
    </p>
    <p style={{
      fontSize: 13,
      color: "rgba(220,205,182,0.68)",
      lineHeight: 1.6,
    }}>
      See how your days have felt over time.
    </p>
  </div>
</Link>
      <NestCard>
      <p style={eyebrow}>🌙 Your Nest</p>
      <h2 style={title}>Your nest is growing.</h2>
  <p style={softText}>
    {stats.thoughts} thoughts have found their place here.
    <br />
    {stats.memos} Voice Capsules preserve memories.
    <br />
    {stats.resets} Reality Resets brought you back.
    <br />
    Part of your journey for {stats.memberDays} days.
  </p>
  <p style={{ ...softText, marginTop: 12 }}>
    {stats.visits > 3
      ? "You are returning regularly right now."
      : "Your nest is slowly growing."}
  </p>
</NestCard>

        {stats.memory && (
          <NestCard>
            <p style={eyebrow}>🕯️ Memory</p>
            <p style={softText}>
            {daysAgo(stats.memory.created_at)} days ago you wrote:
            </p>
            <p style={quote}>“{stats.memory.text}”</p>
            <Link href="/thoughts">
              <button style={quietButton}>View then →</button>
            </Link>
          </NestCard>
        )}
<NestCard>
  <p style={eyebrow}>🕯️ Reflections</p>

  {stats.lookbacks.length > 0 ? (
    stats.lookbacks.map((item) => (
      <div key={item.label} style={{ marginBottom: 14 }}>
        <p style={softText}>{item.label}:</p>
        <p style={quote}>“{item.thought?.text}”</p>
      </div>
    ))
  ) : (
    <p style={softText}>Your first older memories will appear here as your journey grows.</p>
  )}
</NestCard>
<NestCard>
  <p style={eyebrow}>✨ Insights</p>
  <p style={softText}>Recently appearing themes:</p>
  <p style={quote}>{stats.insights.topWords.join("\n")}</p>
  <p style={{ ...softText, marginTop: 10 }}>
    The theme {stats.insights.topWords[0]} has been with you often lately.
    <br />
    Your most reflective month was {stats.insights.activeMonth}.
  </p>
</NestCard>

       <NestCard>
  <p style={eyebrow}>🌿 Your Journey</p>
  <p style={softText}>
    You have returned {stats.visits} times.
    <br />
    You captured {stats.insights.thoughtsLast30} thoughts in the last 30 days.
    <br />
    You recorded {stats.memos} voice memos.
  </p>
</NestCard>
<NestCard>
  <p style={eyebrow}>🔥 Consistency</p>
  <h2 style={title}>{stats.streak} days</h2>
  <p style={softText}>
  You've returned for {stats.streak} days.
    <br />
    {Math.max(0, nextMilestone(stats.streak) - stats.streak)} days until your next milestone.
  </p>
</NestCard>
<NestCard>
  <p style={eyebrow}>📝 Today</p>
  {stats.prompts.map((prompt) => (
    <p key={prompt} style={softText}>• {prompt}</p>
  ))}

  <Link href="/thoughts">
    <button style={quietButton}>Reflect on this</button>
  </Link>
</NestCard>

<NestCard>
  <p style={eyebrow}>📅 This Month</p>
  <p style={softText}>
    {stats.insights.monthlyThoughts} thoughts.
    <br />
    {stats.insights.monthlyMemos} voice memos.
    <br />
    {stats.insights.monthlyResets} Reality Resets.
  </p>
  <p style={{ ...softText, marginTop: 10 }}>
    {stats.insights.topWords[0]} was your most frequent theme.
  </p>
</NestCard>
{stats.deepMemory && (
  <NestCard>
    <p style={eyebrow}>🌱 Then vs Now</p>
    <p style={softText}>Then:</p>
    <p style={quote}>“{stats.deepMemory.text}”</p>
    <p style={{ ...softText, marginTop: 12 }}>
      Now:<br />This thought is no longer alone.<br />It has become part of your story.
    </p>
  </NestCard>
)}
{stats.deepMemory && (
  <NestCard>
    <p style={eyebrow}>🪶 From the Depths of the Nest</p>

    <p style={softText}>
      {daysAgo(stats.deepMemory.created_at)} days ago:
    </p>

    <p style={quote}>
      “{stats.deepMemory.text}”
    </p>

    <Link href="/thoughts">
      <button style={quietButton}>Rediscover</button>
    </Link>
  </NestCard>
)}
<NestCard>
  <p style={eyebrow}>🌧️ My Rituals</p>

  {stats.rituals.length > 0 ? (
    stats.rituals.map((ritual) => (
      <p
        key={ritual.name}
        style={{
          ...softText,
          marginBottom: 10,
        }}
      >
        {ritual.name}
      </p>
    ))
  ) : (
    <p style={softText}>
      Your personal rituals will appear here.
    </p>
  )}
</NestCard>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.8 }}
        style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, zIndex: 20, padding: "0 14px 28px" }}
      >
        <div style={{
          background: "rgba(12, 9, 6, 0.86)",
          border: "1px solid rgba(220, 195, 140, 0.08)",
          borderRadius: "32px 36px 30px 34px / 30px 34px 32px 36px",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          boxShadow: "0 4px 32px rgba(0,0,0,0.70)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}>
          <span style={{ color: "rgba(165, 140, 92, 0.45)", fontSize: 18, lineHeight: 1, fontFamily: "Georgia, serif", flexShrink: 0, marginTop: -2 }}>
            &#8220;
          </span>
          <p style={{ flex: 1, margin: 0, color: "rgba(192,172,140,0.58)", fontSize: 12.5, lineHeight: 1.6, letterSpacing: "0.02em", fontWeight: 300 }}>
            The Nest remembers what you carried.
          </p>
          <AudioControls minimal />
        </div>
      </motion.div>
    </motion.div>
  );
}
function NestCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: "rgba(10, 7, 5, 0.62)",
        border: "1px solid rgba(220, 195, 140, 0.08)",
        borderRadius: 24,
        padding: 18,
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        boxShadow: "0 18px 60px rgba(0,0,0,0.34)",
      }}
    >
      {children}
    </div>
  );
}

const eyebrow: React.CSSProperties = {
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  color: "rgba(205,170,100,0.42)",
  marginBottom: 10,
};

const title: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 25,
  fontWeight: 400,
  lineHeight: 1.25,
  color: "rgba(235,215,180,0.92)",
  marginBottom: 12,
};

const softText: React.CSSProperties = {
  fontSize: 13,
  lineHeight: 1.75,
  color: "rgba(198,178,150,0.64)",
};

const quote: React.CSSProperties = {
  fontFamily: "Georgia, serif",
  fontSize: 17,
  lineHeight: 1.55,
  color: "rgba(235,218,192,0.82)",
  marginTop: 8,
};

const quietButton: React.CSSProperties = {
  marginTop: 16,
  background: "none",
  border: "none",
  borderBottom: "1px solid rgba(205,170,100,0.22)",
  color: "rgba(205,170,100,0.62)",
  fontSize: 10,
  letterSpacing: "0.18em",
  textTransform: "uppercase",
  padding: "8px 0",
  cursor: "pointer",
};
