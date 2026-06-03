import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft, Plus, Image as ImageIcon } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { loadAnchors, saveTextAnchor, saveImageAnchor } from "@/lib/anchors";


interface Anchor {
  id: string;
  type: "text" | "image";
  content: string;
  created_at: string;
}

export function Anchors() {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
const [loading, setLoading] = useState(true);
useEffect(() => {
  async function init() {
    try {
      const data = await loadAnchors();
      setAnchors(data as Anchor[]);
    } catch (err) {
      console.error("Could not load anchors", err);
    } finally {
      setLoading(false);
    }
  }

  init();
}, []);
const [isAdding, setIsAdding] = useState(false);
  const [newText, setNewText] = useState("");

  const handleAddText = async () => {
    if (!newText.trim()) return;
  
    try {
      const saved = await saveTextAnchor(newText.trim());
      if (saved) {
        setAnchors([saved as Anchor, ...anchors]);
      }
      setNewText("");
      setIsAdding(false);
    } catch (err) {
      console.error("Could not save anchor", err);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
  
    try {
      const saved = await saveImageAnchor(file);
      if (saved) {
        setAnchors([saved as Anchor, ...anchors]);
      }
      setIsAdding(false);
    } catch (err) {
      console.error("Could not save image anchor", err);
    }
  
    e.target.value = "";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.7 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        position: "relative",
        overflow: "hidden",
        maxWidth: 480,
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse 70% 35% at 50% 10%, rgba(185, 120, 35, 0.05) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      <div
        style={{
          flex: 1,
          padding: "0 20px 32px",
          paddingTop: "calc(env(safe-area-inset-top, 0px) + 52px)",
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <motion.header
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.7 }}
          style={{
            marginBottom: 34,
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Link href="/home">
              <button
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "rgba(185, 162, 128, 0.32)",
                  padding: 2,
                }}
              >
                <ChevronLeft strokeWidth={1.3} size={24} />
              </button>
            </Link>

            <div>
              <h2
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 25,
                  fontWeight: 400,
                  color: "rgba(235, 215, 180, 0.90)",
                  letterSpacing: "0.03em",
                  lineHeight: 1.15,
                  marginBottom: 5,
                }}
              >
                Anchors
              </h2>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(185, 162, 128, 0.48)",
                  fontWeight: 300,
                  lineHeight: 1.5,
                  maxWidth: 260,
                  letterSpacing: "0.01em",
                }}
              >
                Real things. This room. Right now.
              </p>
            </div>
          </div>

          <Dialog open={isAdding} onOpenChange={setIsAdding}>
            <DialogTrigger asChild>
              <button
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 999,
                  background: "rgba(205, 170, 100, 0.05)",
                  border: "1px solid rgba(205, 170, 100, 0.14)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "rgba(205, 170, 100, 0.56)",
                  marginTop: 2,
                }}
              >
                <Plus size={17} strokeWidth={1.5} />
              </button>
            </DialogTrigger>

            <DialogContent
              style={{
                background: "#111015",
                border: "1px solid rgba(205, 170, 100, 0.12)",
                borderRadius: 22,
                padding: 24,
                maxWidth: 330,
              }}
            >
              <h3
                style={{
                  fontFamily: "Georgia, 'Times New Roman', serif",
                  fontSize: 21,
                  fontWeight: 400,
                  color: "rgba(235, 215, 180, 0.88)",
                  letterSpacing: "0.03em",
                  marginBottom: 20,
                }}
              >
                New Anchor
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <textarea
                  value={newText}
                  onChange={(e) => setNewText(e.target.value)}
                  placeholder="A small reality reminder..."
                  style={{
                    width: "100%",
                    minHeight: 110,
                    resize: "none",
                    background: "rgba(255, 255, 255, 0.026)",
                    border: "1px solid rgba(255, 255, 255, 0.07)",
                    borderRadius: 16,
                    padding: 15,
                    color: "rgba(225, 210, 188, 0.86)",
                    fontSize: 13,
                    fontWeight: 300,
                    lineHeight: 1.5,
                    outline: "none",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      cursor: "pointer",
                      fontSize: 10,
                      letterSpacing: "0.16em",
                      textTransform: "uppercase",
                      color: "rgba(185, 158, 115, 0.44)",
                    }}
                  >
                    <ImageIcon size={15} strokeWidth={1.4} />
                    Upload Photo
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleImageUpload}
                    />
                  </label>

                  <button
                    onClick={handleAddText}
                    disabled={!newText.trim()}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: newText.trim() ? "pointer" : "default",
                      opacity: newText.trim() ? 1 : 0.3,
                      fontSize: 10,
                      letterSpacing: "0.2em",
                      textTransform: "uppercase",
                      color: "rgba(205, 170, 100, 0.62)",
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.header>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16, duration: 0.7 }}
          style={{
            fontSize: 13,
            color: "rgba(175, 158, 132, 0.42)",
            fontWeight: 300,
            lineHeight: 1.6,
            letterSpacing: "0.01em",
            marginBottom: 24,
            maxWidth: 330,
          }}
        >
          Small, real things that connect you back to the physical world.
        </motion.p>

        {anchors.length > 0 ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 10,
              paddingBottom: 32,
            }}
          >
            {anchors.map((anchor, i) => (
              <motion.div
                key={anchor.id}
                initial={{ opacity: 0, y: 8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  duration: 0.65,
                  delay: Math.min(0.22 + i * 0.04, 0.55),
                }}
                style={{
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "rgba(255, 255, 255, 0.026)",
                  border: "1px solid rgba(255, 255, 255, 0.065)",
                  minHeight: anchor.type === "text" ? 150 : undefined,
                  aspectRatio: anchor.type === "image" ? "1 / 1" : undefined,
                  padding: anchor.type === "text" ? "18px 16px" : 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {anchor.type === "text" ? (
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 300,
                      textAlign: "center",
                      lineHeight: 1.55,
                      color: "rgba(220, 205, 182, 0.74)",
                      letterSpacing: "0.01em",
                    }}
                  >
                    {anchor.content}
                  </p>
                ) : (
                  <img
                    src={anchor.content}
                    alt="Reality anchor"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      opacity: 0.78,
                      filter: "grayscale(1)",
                      transition: "all 1000ms ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.filter = "grayscale(0)";
                      e.currentTarget.style.opacity = "0.95";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.filter = "grayscale(1)";
                      e.currentTarget.style.opacity = "0.78";
                    }}
                  />
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22, duration: 0.7 }}
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              paddingBottom: 80,
            }}
          >
            <div
              style={{
                background: "rgba(255, 255, 255, 0.024)",
                border: "1px solid rgba(255, 255, 255, 0.055)",
                borderRadius: 18,
                padding: "22px 24px",
                maxWidth: 260,
                textAlign: "center",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(175, 158, 132, 0.42)",
                  fontWeight: 300,
                  lineHeight: 1.6,
                  fontStyle: "italic",
                }}
              >
                No anchors yet. Add something that reminds you of the real world.
              </p>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}