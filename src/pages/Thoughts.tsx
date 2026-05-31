import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ChevronLeft } from "lucide-react";

interface Thought {
  id: string;
  text: string;
  timestamp: number;
}

export function Thoughts() {
  const [thoughts, setThoughts] = useLocalStorage<Thought[]>("nest_thoughts", []);
  const [newThought, setNewThought] = useState("");

  const handleSave = () => {
    if (!newThought.trim()) return;
    const thought: Thought = {
      id: crypto.randomUUID(),
      text: newThought.trim(),
      timestamp: Date.now()
    };
    setThoughts([thought, ...thoughts]);
    setNewThought("");
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-background text-foreground p-6 pt-12 flex flex-col max-w-md mx-auto"
    >
      <header className="mb-12 flex items-center gap-4">
        <Link href="/home" className="text-muted-foreground hover:text-foreground transition-colors duration-500">
          <ChevronLeft strokeWidth={1} size={28} />
        </Link>
        <h2 className="font-serif text-2xl tracking-wider text-primary/80">Thoughts</h2>
      </header>

      <div className="mb-12">
        <textarea
          value={newThought}
          onChange={(e) => setNewThought(e.target.value)}
          placeholder="Leave a thought here..."
          className="w-full bg-card/30 border border-border/50 rounded-2xl p-6 text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none min-h-[120px] transition-all duration-700 font-light leading-relaxed"
        />
        <div className="flex justify-end mt-4">
          <button 
            onClick={handleSave}
            disabled={!newThought.trim()}
            className="text-xs uppercase tracking-[0.2em] text-primary/70 hover:text-primary transition-colors disabled:opacity-30 duration-500"
          >
            Leave it here
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-6 pb-20">
        {thoughts.map((thought, i) => (
          <motion.div 
            key={thought.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: Math.min(i * 0.1, 0.5) }}
            className="bg-card/20 p-6 rounded-2xl border border-border/30"
          >
            <p className="text-sm font-light leading-relaxed text-foreground/80 mb-4 whitespace-pre-wrap">
              {thought.text}
            </p>
            <time className="text-[10px] uppercase tracking-widest text-muted-foreground/40">
              {new Date(thought.timestamp).toLocaleDateString(undefined, { 
                weekday: 'short', month: 'short', day: 'numeric' 
              })}
              {' '}·{' '}
              {new Date(thought.timestamp).toLocaleTimeString(undefined, { 
                hour: 'numeric', minute: '2-digit' 
              })}
            </time>
          </motion.div>
        ))}
        {thoughts.length === 0 && (
          <p className="text-center text-muted-foreground/40 text-sm font-light py-10 italic">
            Your mind is quiet for now.
          </p>
        )}
      </div>
    </motion.div>
  );
}
