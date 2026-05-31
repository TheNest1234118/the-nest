import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RainDrop {
  id: number;
  left: number;
  height: number;
  duration: number;
  delay: number;
  opacity: number;
}

interface Particle {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
}

function generateRain(count: number): RainDrop[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 110 - 5,
    height: 8 + Math.random() * 18,
    duration: 0.6 + Math.random() * 0.6,
    delay: Math.random() * 3,
    opacity: 0.08 + Math.random() * 0.18,
  }));
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: 30 + Math.random() * 40,
    size: 1 + Math.random() * 2,
    duration: 8 + Math.random() * 16,
    delay: Math.random() * 12,
    drift: (Math.random() - 0.5) * 30,
  }));
}

const rainDrops = generateRain(55);
const particles = generateParticles(18);

function Bird() {
  const [blink, setBlink] = useState(false);
  const [headAngle, setHeadAngle] = useState(0);
  const [adjusting, setAdjusting] = useState(false);

  useEffect(() => {
    const blinkLoop = () => {
      const wait = 3000 + Math.random() * 5000;
      setTimeout(() => {
        setBlink(true);
        setTimeout(() => {
          setBlink(false);
          blinkLoop();
        }, 120);
      }, wait);
    };
    blinkLoop();
  }, []);

  useEffect(() => {
    const headLoop = () => {
      const wait = 5000 + Math.random() * 8000;
      setTimeout(() => {
        const angle = (Math.random() - 0.5) * 18;
        setHeadAngle(angle);
        headLoop();
      }, wait);
    };
    headLoop();
  }, []);

  useEffect(() => {
    const adjustLoop = () => {
      const wait = 12000 + Math.random() * 20000;
      setTimeout(() => {
        setAdjusting(true);
        setTimeout(() => {
          setAdjusting(false);
          adjustLoop();
        }, 1200);
      }, wait);
    };
    adjustLoop();
  }, []);

  return (
    <motion.g
      animate={{
        y: adjusting ? [-1, -3, -1, 1, 0] : [0, -1, 0],
        x: adjusting ? [0, 1, -1, 0] : [0],
      }}
      transition={{
        duration: adjusting ? 1.2 : 4,
        ease: "easeInOut",
      }}
    >
      {/* Body — small, round, nestled low */}
      <motion.ellipse
        cx="200" cy="208" rx="13" ry="10"
        fill="#1a1209"
        animate={{ scaleY: [1, 1.025, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Wing left */}
      <ellipse cx="192" cy="210" rx="7" ry="5" fill="#150e08" opacity="0.9" transform="rotate(-8,192,210)" />
      {/* Wing right */}
      <ellipse cx="208" cy="210" rx="7" ry="5" fill="#150e08" opacity="0.9" transform="rotate(8,208,210)" />
      {/* Tail */}
      <path d="M195,216 Q200,222 205,216" fill="#120c07" />

      {/* Head — rotates slowly */}
      <motion.g
        animate={{ rotate: headAngle }}
        transition={{ duration: 3, ease: "easeInOut" }}
        style={{ originX: "200px", originY: "200px" }}
      >
        <circle cx="200" cy="197" r="7" fill="#1e1409" />
        {/* Beak */}
        <path d="M203,197 L208,199 L203,200 Z" fill="#2a1c0e" />
        {/* Eye */}
        <motion.g
          animate={{ scaleY: blink ? 0.12 : 1 }}
          transition={{ duration: 0.08 }}
          style={{ originX: "202px", originY: "195px" }}
        >
          <ellipse cx="202" cy="195" rx="1.8" ry="1.8" fill="#6b4c2a" />
          <circle cx="202.4" cy="194.8" r="0.6" fill="#c8944a" opacity="0.6" />
        </motion.g>
        {/* Crown feathers */}
        <path d="M197,192 Q199,186 201,192" fill="#1a1108" />
        <path d="M200,191 Q202,185 204,191" fill="#16100700" stroke="#1a1108" strokeWidth="0.5" />
      </motion.g>
    </motion.g>
  );
}

export function NestScene({ isFullScreen = true }: { isFullScreen?: boolean }) {
  const [lightning, setLightning] = useState(false);
  const [lightningBright, setLightningBright] = useState(false);

  useEffect(() => {
    let timeoutA: ReturnType<typeof setTimeout>;
    let timeoutB: ReturnType<typeof setTimeout>;

    const triggerLightning = () => {
      setLightning(true);
      setLightningBright(true);
      timeoutA = setTimeout(() => setLightningBright(false), 80);
      timeoutB = setTimeout(() => {
        setLightning(false);
        const next = 40000 + Math.random() * 50000;
        setTimeout(triggerLightning, next);
      }, 600);
    };

    const initial = setTimeout(triggerLightning, 18000 + Math.random() * 15000);
    return () => {
      clearTimeout(initial);
      clearTimeout(timeoutA);
      clearTimeout(timeoutB);
    };
  }, []);

  return (
    <div
      className={`pointer-events-none fixed inset-0 z-[-1] overflow-hidden bg-background ${
        isFullScreen ? "opacity-100" : "opacity-50"
      }`}
    >
      {/* Deep sky gradient */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 30%, #1c1510 0%, #0e0b09 50%, #080706 100%)",
        }}
      />

      {/* Fog layer — drifting horizontally */}
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={{ x: [-20, 20, -20] }}
        transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 120% 40% at 50% 80%, #2a1f14 0%, transparent 70%)",
        }}
      />
      <motion.div
        className="absolute inset-0 opacity-10"
        animate={{ x: [15, -15, 15] }}
        transition={{ duration: 55, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(ellipse 90% 30% at 60% 60%, #1f1a14 0%, transparent 70%)",
        }}
      />

      {/* Lightning flash */}
      <AnimatePresence>
        {lightning && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: lightningBright ? 0.18 : 0.06 }}
            exit={{ opacity: 0 }}
            transition={{ duration: lightningBright ? 0.04 : 0.5 }}
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 40% at 25% 20%, rgba(200,210,255,1) 0%, transparent 70%)",
            }}
          />
        )}
      </AnimatePresence>

      {/* Rain */}
      <div className="absolute inset-0 overflow-hidden">
        {rainDrops.map((drop) => (
          <div
            key={drop.id}
            className="absolute"
            style={{
              left: `${drop.left}%`,
              top: 0,
              width: "1px",
              height: `${drop.height}px`,
              background: `linear-gradient(to bottom, transparent, rgba(180,195,210,${drop.opacity}), transparent)`,
              animation: `nestRain ${drop.duration}s linear ${drop.delay}s infinite`,
              transform: "rotate(12deg)",
            }}
          />
        ))}
      </div>

      {/* Warm particles / ember motes rising from nest */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p) => (
          <motion.div
            key={p.id}
            className="absolute rounded-full"
            style={{
              left: `${p.left}%`,
              bottom: "38%",
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: "hsl(35 80% 60%)",
            }}
            animate={{
              y: [0, -(80 + Math.random() * 120)],
              x: [0, p.drift],
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: p.duration,
              delay: p.delay,
              repeat: Infinity,
              ease: "easeOut",
            }}
          />
        ))}
      </div>

      {/* Main tree + nest SVG */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-full h-full max-w-2xl mx-auto">

          {/* Outer warm glow — large, soft, behind everything */}
          <motion.div
            className="absolute rounded-full blur-[100px]"
            style={{
              width: "280px",
              height: "180px",
              left: "50%",
              top: "52%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "hsl(35 60% 35%)",
            }}
            animate={{ opacity: [0.12, 0.22, 0.14, 0.2] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Inner nest glow — tight, warm amber */}
          <motion.div
            className="absolute rounded-full blur-[40px]"
            style={{
              width: "100px",
              height: "60px",
              left: "50%",
              top: "52%",
              transform: "translate(-50%, -50%)",
              backgroundColor: "hsl(38 75% 48%)",
            }}
            animate={{ opacity: [0.35, 0.55, 0.38, 0.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* The full scene SVG */}
          <motion.svg
            viewBox="0 0 500 600"
            className="absolute inset-0 w-full h-full"
            style={{ filter: "drop-shadow(0 30px 40px rgba(0,0,0,0.9))" }}
            animate={{ y: [-2, 2, -2] }}
            transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          >
            {/* ── BACKGROUND BRANCHES (far, dark, barely visible) ── */}
            <motion.g
              animate={{ rotate: [-0.3, 0.3, -0.3] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "250px", originY: "500px" }}
              opacity="0.4"
            >
              <path d="M50,600 Q120,450 80,300 Q60,200 100,100" fill="none" stroke="#0d0a07" strokeWidth="16" strokeLinecap="round"/>
              <path d="M80,300 Q150,270 200,220" fill="none" stroke="#0d0a07" strokeWidth="8" strokeLinecap="round"/>
            </motion.g>

            <motion.g
              animate={{ rotate: [0.2, -0.2, 0.2] }}
              transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "250px", originY: "500px" }}
              opacity="0.35"
            >
              <path d="M450,600 Q380,440 420,280 Q440,180 400,90" fill="none" stroke="#0d0a07" strokeWidth="14" strokeLinecap="round"/>
              <path d="M420,280 Q350,250 300,200" fill="none" stroke="#0d0a07" strokeWidth="7" strokeLinecap="round"/>
            </motion.g>

            {/* ── MAIN TRUNK ── */}
            <path
              d="M220,600 Q215,520 218,460 Q222,400 225,340 Q228,300 230,270"
              fill="none" stroke="#0e0b08" strokeWidth="32" strokeLinecap="round"
            />
            <path
              d="M220,600 Q215,520 218,460 Q222,400 225,340 Q228,300 230,270"
              fill="none" stroke="#100d09" strokeWidth="24" strokeLinecap="round"
            />

            {/* Trunk texture */}
            <path d="M221,540 Q217,500 220,470" fill="none" stroke="#0a0806" strokeWidth="3" strokeLinecap="round" opacity="0.6"/>
            <path d="M223,490 Q219,450 222,420" fill="none" stroke="#0a0806" strokeWidth="2" strokeLinecap="round" opacity="0.4"/>

            {/* ── LEFT BRANCHES ── */}
            <motion.g
              animate={{ rotate: [-0.8, 0.4, -0.8] }}
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "225px", originY: "380px" }}
            >
              <path d="M225,380 Q180,340 140,290 Q110,250 90,200" fill="none" stroke="#100d09" strokeWidth="14" strokeLinecap="round"/>
              <path d="M160,315 Q130,290 100,260 Q80,240 60,210" fill="none" stroke="#0e0b08" strokeWidth="8" strokeLinecap="round"/>
              <path d="M140,290 Q115,310 95,340" fill="none" stroke="#0d0a07" strokeWidth="5" strokeLinecap="round"/>
              <path d="M90,200 Q70,185 55,165" fill="none" stroke="#0c0907" strokeWidth="5" strokeLinecap="round"/>
              <path d="M90,200 Q100,175 95,150" fill="none" stroke="#0c0907" strokeWidth="4" strokeLinecap="round"/>
              {/* Leaf clusters */}
              <ellipse cx="60" cy="200" rx="18" ry="12" fill="#0b0a07" opacity="0.7" transform="rotate(-20,60,200)"/>
              <ellipse cx="55" cy="165" rx="14" ry="9" fill="#0c0a07" opacity="0.6" transform="rotate(-15,55,165)"/>
            </motion.g>

            {/* ── RIGHT BRANCHES (main — holds the nest) ── */}
            <motion.g
              animate={{ rotate: [0.6, -0.4, 0.6] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "228px", originY: "320px" }}
            >
              {/* Main right branch */}
              <path d="M228,320 Q270,290 310,280 Q350,270 390,268" fill="none" stroke="#13100c" strokeWidth="22" strokeLinecap="round"/>
              <path d="M228,320 Q270,290 310,280 Q350,270 390,268" fill="none" stroke="#161310" strokeWidth="14" strokeLinecap="round"/>
              {/* Branch texture */}
              <path d="M260,300 Q300,288 340,278" fill="none" stroke="#0e0b08" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>

              {/* Sub-branch going up-right */}
              <path d="M340,274 Q370,240 400,210 Q420,190 440,165" fill="none" stroke="#100d09" strokeWidth="10" strokeLinecap="round"/>
              <path d="M400,210 Q420,230 430,250" fill="none" stroke="#0d0a07" strokeWidth="5" strokeLinecap="round"/>
              <path d="M440,165 Q455,148 462,130" fill="none" stroke="#0c0907" strokeWidth="5" strokeLinecap="round"/>
              <ellipse cx="445" cy="155" rx="20" ry="13" fill="#0b0907" opacity="0.65" transform="rotate(20,445,155)"/>
              <ellipse cx="462" cy="128" rx="16" ry="10" fill="#0c0a07" opacity="0.55" transform="rotate(15,462,128)"/>

              {/* THE NEST on the right branch */}
              {/* Nest base / cup */}
              <path
                d="M155,278 Q165,302 200,310 Q235,318 270,302 Q290,292 295,278"
                fill="none" stroke="#1a1209" strokeWidth="3" strokeLinecap="round"
              />
              {/* Nest body — layered twigs */}
              <path d="M155,278 Q175,295 200,300 Q225,305 245,295 Q265,285 280,272 Q260,285 240,292 Q220,298 200,295 Q175,290 158,275 Z" fill="#0f0b07"/>
              <path d="M160,275 Q180,292 205,298 Q228,303 250,292 Q268,283 278,270" fill="none" stroke="#1c1510" strokeWidth="3.5" strokeLinecap="round"/>
              <path d="M165,272 Q185,288 210,294 Q232,299 252,288 Q268,279 275,267" fill="none" stroke="#1f1812" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M170,268 Q192,283 215,289 Q237,294 256,283 Q270,274 273,262" fill="none" stroke="#1a1410" strokeWidth="2" strokeLinecap="round"/>
              <path d="M158,278 Q170,275 185,273" fill="none" stroke="#23190e" strokeWidth="2" strokeLinecap="round"/>
              <path d="M265,272 Q278,269 290,268" fill="none" stroke="#23190e" strokeWidth="2" strokeLinecap="round"/>
              {/* Nest interior warm fill */}
              <ellipse cx="218" cy="285" rx="38" ry="18" fill="#0c0807" opacity="0.9"/>
              {/* Warm glow inside nest */}
              <ellipse cx="218" cy="283" rx="24" ry="11" fill="hsl(38 75% 40%)" opacity="0.18" style={{ filter: "blur(4px)" }}/>
              <ellipse cx="218" cy="282" rx="14" ry="6" fill="hsl(40 85% 60%)" opacity="0.25" style={{ filter: "blur(3px)" }}/>

              {/* THE BIRD inside the nest */}
              <Bird />
            </motion.g>

            {/* ── TOP BRANCHES (upper canopy) ── */}
            <motion.g
              animate={{ rotate: [-0.5, 0.6, -0.5] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
              style={{ originX: "228px", originY: "270px" }}
            >
              <path d="M228,270 Q240,220 245,170 Q248,130 240,90" fill="none" stroke="#0f0c09" strokeWidth="12" strokeLinecap="round"/>
              <path d="M245,170 Q215,150 185,130 Q165,115 145,95" fill="none" stroke="#0d0a07" strokeWidth="7" strokeLinecap="round"/>
              <path d="M245,170 Q270,155 295,140 Q315,128 335,110" fill="none" stroke="#0d0a07" strokeWidth="7" strokeLinecap="round"/>
              <path d="M240,90 Q225,75 210,58" fill="none" stroke="#0c0907" strokeWidth="5" strokeLinecap="round"/>
              <path d="M240,90 Q255,75 265,58" fill="none" stroke="#0c0907" strokeWidth="4" strokeLinecap="round"/>
              {/* Canopy leaf clusters */}
              <ellipse cx="215" cy="55" rx="22" ry="15" fill="#0c0a07" opacity="0.7" transform="rotate(-10,215,55)"/>
              <ellipse cx="145" cy="90" rx="20" ry="13" fill="#0b0907" opacity="0.65" transform="rotate(-25,145,90)"/>
              <ellipse cx="335" cy="107" rx="18" ry="12" fill="#0c0a07" opacity="0.6" transform="rotate(20,335,107)"/>
            </motion.g>

            {/* ── GROUND ROOTS (atmospheric base) ── */}
            <path d="M195,590 Q185,570 175,555 Q160,535 140,525" fill="none" stroke="#0a0807" strokeWidth="8" strokeLinecap="round" opacity="0.5"/>
            <path d="M225,592 Q230,575 235,560 Q245,540 260,530" fill="none" stroke="#0a0807" strokeWidth="6" strokeLinecap="round" opacity="0.4"/>
          </motion.svg>
        </div>
      </div>

      {/* Bottom fog vignette */}
      <div
        className="absolute bottom-0 left-0 right-0 h-32 pointer-events-none"
        style={{
          background: "linear-gradient(to top, hsl(14 10% 6%) 0%, transparent 100%)",
        }}
      />
      {/* Side vignettes */}
      <div
        className="absolute inset-y-0 left-0 w-20 pointer-events-none"
        style={{ background: "linear-gradient(to right, hsl(14 10% 7%) 0%, transparent 100%)" }}
      />
      <div
        className="absolute inset-y-0 right-0 w-20 pointer-events-none"
        style={{ background: "linear-gradient(to left, hsl(14 10% 7%) 0%, transparent 100%)" }}
      />

      <style>{`
        @keyframes nestRain {
          0%   { transform: translateY(-60px) rotate(12deg); opacity: 0; }
          8%   { opacity: 1; }
          88%  { opacity: 1; }
          100% { transform: translateY(105vh) rotate(12deg); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
