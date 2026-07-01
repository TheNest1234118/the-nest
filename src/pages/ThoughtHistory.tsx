import React, { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { loadThoughts, deleteThought } from "@/lib/userData";

interface Thought {
  id: string;
  text: string;
  created_at: string;
}

export function ThoughtHistory() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function init() {
      const data = await loadThoughts();
      setThoughts(data || []);
    }

    init();
  }, []);

  const visibleThoughts = thoughts.filter((thought) =>
    thought.text.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    await deleteThought(id);
    setThoughts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        minHeight: "100svh",
        background: "#09090d",
        maxWidth: 480,
        margin: "0 auto",
        padding: "calc(env(safe-area-inset-top, 0px) + 52px) 20px 32px",
      }}
    >
      <header style={{ marginBottom: 28, display: "flex", gap: 14 }}>
        <Link href="/home">
          <button style={{ background: "none", border: "none", color: "rgba(185,162,128,.32)" }}>
            <ChevronLeft size={24} />
          </button>
        </Link>

        <div>
          <h2 style={{ fontFamily: "Georgia, serif", fontSize: 25, color: "rgba(235,215,180,.9)" }}>
            Thoughts
          </h2>
          <p style={{ fontSize: 13, color: "rgba(185,162,128,.48)" }}>
            Your saved thoughts.
          </p>
        </div>
      </header>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search thoughts..."
        style={{
          width: "100%",
          marginBottom: 18,
          background: "rgba(255,255,255,0.026)",
          border: "1px solid rgba(255,255,255,0.065)",
          borderRadius: 14,
          padding: "13px 15px",
          color: "rgba(225,210,188,0.84)",
          outline: "none",
          fontSize: 13,
        }}
      />

      {visibleThoughts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {visibleThoughts.map((thought) => (
            <div
              key={thought.id}
              style={{
                background: "rgba(255,255,255,0.026)",
                border: "1px solid rgba(255,255,255,0.065)",
                borderRadius: 16,
                padding: "18px 18px",
              }}
            >
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "rgba(220,205,182,.74)",
                  whiteSpace: "pre-wrap",
                  marginBottom: 14,
                }}
              >
                {thought.text}
              </p>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <time style={{ fontSize: 10, color: "rgba(175,158,132,.34)" }}>
                  {new Date(thought.created_at).toLocaleDateString()}
                </time>

                <button
                  onClick={() => handleDelete(thought.id)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "rgba(220,120,120,.6)",
                    fontSize: 10,
                    cursor: "pointer",
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ color: "rgba(175,158,132,.42)", textAlign: "center", marginTop: 60 }}>
          No thoughts found.
        </p>
      )}
    </motion.div>
  );
}