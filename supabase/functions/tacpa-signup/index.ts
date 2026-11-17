import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const allowedOrigins = new Set(["https://jointacpa.com", "https://www.jointacpa.com", "https://mariah504.github.io"]);
const json = (data: unknown, status: number, origin: string | null) =>
 new Response(JSON.stringify(data), {
  status,
  headers: {
   "Content-Type": "application/json; charset=utf-8",
   "Cache-Control": "no-store",
   "Vary": "Origin",
   ...(origin && allowedOrigins.has(origin) ? { "Access-Control-Allow-Origin": origin } : {}),
  },
 });
const clean = (value: unknown, max: number): string | null =>
 typeof value === "string" && value.trim().length <= max ? value.trim() : null;

Deno.serve(async (req) => {
 const origin = req.headers.get("origin");
 if (req.method === "OPTIONS") {
  if (!origin || !allowedOrigins.has(origin)) return new Response(null, { status: 403 });
  return new Response(null, { status: 204, headers: {
   "Access-Control-Allow-Origin": origin,
   "Access-Control-Allow-Methods": "POST, OPTIONS",
   "Access-Control-Allow-Headers": "content-type",
   "Access-Control-Max-Age": "3600",
   "Vary": "Origin",
  } });
 }
 if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
 if (!origin || !allowedOrigins.has(origin)) return json({ error: "Forbidden origin" }, 403, origin);
 if (!(req.headers.get("content-type") || "").toLowerCase().includes("application/json")) return json({ error: "JSON required" }, 415, origin);
 if (Number(req.headers.get("content-length") || 0) > 4096) return json({ error: "Submission too large" }, 413, origin);
 let data: Record<string, unknown>;
 try { const body = await req.text(); if (new TextEncoder().encode(body).length > 4096) return json({error:"Submission too large"},413,origin); data = JSON.parse(body); } catch { return json({ error: "Invalid JSON" }, 400, origin); }
 if (!data || typeof data !== "object" || Array.isArray(data)) return json({ error: "Invalid payload" }, 400, origin);
 if (data.website) return json({ error: "Invalid submission" }, 400, origin);
 const parent_name = clean(data.parent_name, 150);
 const athlete_name = data.athlete_name == null || data.athlete_name === "" ? null : clean(data.athlete_name, 150);
 const email = clean(data.email, 254)?.toLowerCase();
 const phone = data.phone == null || data.phone === "" ? null : clean(data.phone, 30);
 const team_name = data.team_name == null || data.team_name === "" ? null : clean(data.team_name, 100);
 if (!parent_name || parent_name.length < 2 || (data.athlete_name && (!athlete_name || athlete_name.length < 2)) ||
  !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
  (data.phone && (!phone || phone.replace(/\D/g,"").length < 7 || !/^[+\d\s().-]+$/.test(phone))) ||
  (data.team_name && team_name === null) || data.consent_to_contact !== true) {
  return json({ error: "Please provide valid contact details and consent." }, 400, origin);
 }
 const url = Deno.env.get("SUPABASE_URL");
 const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
 if (!url || !key) return json({ error: "Service temporarily unavailable" }, 503, origin);
 const db = createClient(url, key, { auth: { persistSession: false } });
 const { data: saved, error } = await db.from("tacpa_registrations")
  .insert({ parent_name, athlete_name, email, phone, team_name, consent_to_contact: true, volunteer_interest: data.volunteer_interest === true })
  .select("id").single();
 if (error?.code === "23505") return json({ error: "A request already exists for this email. Contact TACPA to check or update it." }, 409, origin);
 if (error || !saved?.id) {
  console.error("registration insert failed", error?.code ?? "no_record");
  return json({ error: "Unable to confirm your registration. Please try again." }, 503, origin);
 }
 return json({ success: true, registration_id: saved.id }, 201, origin);
});
