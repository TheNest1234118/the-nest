import React, { useEffect } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { NestScene } from "@/components/NestScene";
import { useAudioContext } from "@/hooks/use-audio-context";
import { AudioControls } from "@/components/AudioControls";

export function Home() {
  const { toggleMute, isMuted } = useAudioContext();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center relative overflow-hidden px-6">
      <NestScene isFullScreen={true} />
      
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
        className="z-10 text-center max-w-sm flex flex-col items-center"
      >
        <h1 className="text-5xl font-serif text-primary/90 tracking-wider mb-6 drop-shadow-lg">
          The Nest
        </h1>
        <p className="text-muted-foreground text-lg mb-16 tracking-wide font-light leading-relaxed">
          For when your mind still feels stuck online.
        </p>
        
        <Link href="/nest">
          <button 
            onClick={() => {
              if (isMuted) toggleMute();
            }}
            className="text-foreground/80 hover:text-primary transition-colors duration-700 uppercase tracking-[0.3em] text-sm border-b border-transparent hover:border-primary/50 pb-2 pb-1"
          >
            Enter Nest
          </button>
        </Link>
      </motion.div>

      <AudioControls />
    </div>
  );
}
