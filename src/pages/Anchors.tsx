import React, { useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { ChevronLeft, Plus, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

interface Anchor {
  id: string;
  type: "text" | "image";
  content: string; // text or base64 data url
  createdAt: number;
}

export function Anchors() {
  const [anchors, setAnchors] = useLocalStorage<Anchor[]>("nest_anchors", []);
  const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");

  const handleAddText = () => {
    if (!newText.trim()) return;
    const anchor: Anchor = {
      id: crypto.randomUUID(),
      type: "text",
      content: newText.trim(),
      createdAt: Date.now()
    };
    setAnchors([anchor, ...anchors]);
    setNewText("");
    setIsAdding(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const anchor: Anchor = {
        id: crypto.randomUUID(),
        type: "image",
        content: reader.result as string,
        createdAt: Date.now()
      };
      setAnchors([anchor, ...anchors]);
      setIsAdding(false);
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 1 }}
      className="min-h-screen bg-background text-foreground p-6 pt-12 flex flex-col max-w-md mx-auto"
    >
      <header className="mb-12 flex flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/home" className="text-muted-foreground hover:text-foreground transition-colors duration-500">
            <ChevronLeft strokeWidth={1} size={28} />
          </Link>
          <h2 className="font-serif text-2xl tracking-wider text-primary/80">Anchors</h2>
        </div>

        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <button className="w-10 h-10 rounded-full border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/50 transition-all duration-500">
              <Plus size={18} strokeWidth={1.5} />
            </button>
          </DialogTrigger>
          <DialogContent className="bg-card border-border/30 rounded-2xl p-6 sm:rounded-2xl max-w-[320px]">
            <h3 className="font-serif text-xl text-primary/80 mb-6">New Anchor</h3>
            <div className="flex flex-col gap-4">
              <textarea
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="A small reality reminder..."
                className="w-full bg-background/50 border border-border/50 rounded-xl p-4 text-sm text-foreground/90 placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/40 resize-none min-h-[100px] transition-all duration-700 font-light"
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-muted-foreground hover:text-foreground transition-colors p-2 rounded-lg hover:bg-white/5">
                  <ImageIcon size={16} strokeWidth={1.5} />
                  <span className="uppercase tracking-widest">Upload Photo</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                </label>
                <button 
                  onClick={handleAddText}
                  disabled={!newText.trim()}
                  className="text-xs uppercase tracking-[0.2em] text-primary/70 hover:text-primary transition-colors disabled:opacity-30 duration-500"
                >
                  Save
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      <p className="text-muted-foreground/60 text-sm font-light mb-10 leading-relaxed">
        Small, real things that connect you back to the physical world.
      </p>

      <div className="grid grid-cols-2 gap-4 pb-20">
        {anchors.map((anchor, i) => (
          <motion.div 
            key={anchor.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: Math.min(i * 0.1, 0.5) }}
            className={`rounded-2xl border border-border/30 overflow-hidden bg-card/20 ${anchor.type === 'text' ? 'p-5 flex items-center justify-center min-h-[160px]' : 'aspect-square'}`}
          >
            {anchor.type === 'text' ? (
              <p className="text-sm font-light text-center leading-relaxed text-foreground/90">
                {anchor.content}
              </p>
            ) : (
              <img src={anchor.content} alt="Reality anchor" className="w-full h-full object-cover opacity-80 mix-blend-luminosity hover:mix-blend-normal transition-all duration-1000 grayscale hover:grayscale-0" />
            )}
          </motion.div>
        ))}
      </div>
      
      {anchors.length === 0 && (
        <div className="flex-1 flex items-center justify-center pb-20">
          <p className="text-muted-foreground/40 text-sm font-light italic text-center max-w-[200px]">
            No anchors yet. Add something that reminds you of the real world.
          </p>
        </div>
      )}
    </motion.div>
  );
}
