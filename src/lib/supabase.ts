import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log("SUPABASE URL =", url);

const supabase = createClient(url, key, {
  realtime: {
    params: {
      eventsPerSecond: 0,
    },
  },
});

export { supabase };