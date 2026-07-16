import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api, type AgentProfile } from "@/lib/api";

const COLORS = [
  { name: "Indigo", value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Orange", value: "#f97316" },
];

const LS_KEY = "msq_agent";

const ProSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    agencyName: "",
    tagline: "",
    phone: "",
    waNumber: "",
    serviceFee: "10000",
    color: "#6366f1",
    plan: "starter" as "starter" | "growth",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");

  // Pre-fill from localStorage if returning to edit; respect ?plan= param for Growth CTA
  useEffect(() => {
    const urlPlan = searchParams.get("plan") === "growth" ? "growth" : null;
    const saved = localStorage.getItem(LS_KEY);
    if (saved) {
      try {
        const a = JSON.parse(saved) as AgentProfile & { initials: string };
        setForm({
          agencyName: a.agencyName || "",
          tagline: a.tagline || "",
          phone: a.phone || "",
          waNumber: a.waNumber || "",
          serviceFee: String(a.serviceFee || 10000),
          color: a.color || "#6366f1",
          plan: urlPlan ?? (a.planType as "starter" | "growth") ?? "starter",
        });
      } catch { /* ignore corrupt data */ }
    } else if (urlPlan) {
      setForm((f) => ({ ...f, plan: urlPlan }));
    }
  }, [searchParams]);

  const initials = form.agencyName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "?";

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim() || !form.agencyName.trim()) return;
    setStatus("loading");
    setError("");
    try {
      const sanitisedPhone = form.phone.trim().replace(/\s+/g, "");
      await api.registerAgent({
        phone: sanitisedPhone,
        agencyName: form.agencyName.trim(),
        waNumber: (form.waNumber.trim() || sanitisedPhone),
        serviceFee: Number(form.serviceFee) || 10000,
        color: form.color,
        planType: form.plan,
        tagline: form.tagline.trim(),
      });
      localStorage.setItem(
        LS_KEY,
        JSON.stringify({
          phone: sanitisedPhone,
          agencyName: form.agencyName.trim(),
          waNumber: form.waNumber.trim() || sanitisedPhone,
          serviceFee: Number(form.serviceFee) || 10000,
          color: form.color,
          planType: form.plan,
          tagline: form.tagline.trim(),
          initials,
        })
      );
      navigate("/pro/dashboard");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 glass border-b border-border/50">
        <div className="mx-auto max-w-3xl px-6 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display font-semibold">
            <span className="grid place-items-center w-7 h-7 rounded-lg bg-gradient-primary text-primary-foreground">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2l3 7 7 .8-5.3 4.7L18.5 22 12 18l-6.5 4 1.8-7.5L2 9.8 9 9z" />
              </svg>
            </span>
            MySquadGo
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground text-background">Pro</span>
          </Link>
          <Link to="/pro" className="text-sm text-muted-foreground hover:text-foreground">← Back</Link>
        </div>
      </header>

      <div className="mx-auto max-w-xl px-6 py-16">
        <div className="text-center mb-12">
          <div
            className="w-16 h-16 rounded-2xl grid place-items-center text-white font-display font-bold text-xl mx-auto mb-4 transition-all"
            style={{ backgroundColor: form.color }}
          >
            {initials}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">Set up your agency</h1>
          <p className="mt-2 text-muted-foreground text-sm">Takes 2 minutes. Clients never see MySquadGo.</p>
        </div>

        <form onSubmit={submit} className="space-y-5">

          {/* Agency */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Your agency</div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Agency name *</label>
              <input
                required
                value={form.agencyName}
                onChange={(e) => set("agencyName", e.target.value)}
                placeholder="Chioma Travels"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Tagline <span className="opacity-50">(optional · shown on your public profile)</span>
              </label>
              <input
                value={form.tagline}
                onChange={(e) => set("tagline", e.target.value)}
                placeholder="West Africa's favourite squad trip planner"
                maxLength={80}
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          {/* Contact */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Your contact</div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Your phone number * <span className="opacity-50">(used as your login)</span>
              </label>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                placeholder="+234 801 234 5678"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                Client WhatsApp number <span className="opacity-50">(if different from above)</span>
              </label>
              <input
                type="tel"
                value={form.waNumber}
                onChange={(e) => set("waNumber", e.target.value)}
                placeholder="Same as above"
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
          </div>

          {/* Service fee */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Your service fee</div>
            <p className="text-xs text-muted-foreground">
              Charged per trip, split invisibly across squad members on Paystack. You keep 100%.
            </p>
            <div className="flex items-center gap-3">
              <span className="font-display text-lg font-semibold shrink-0">₦</span>
              <input
                type="number"
                min="0"
                step="500"
                value={form.serviceFee}
                onChange={(e) => set("serviceFee", e.target.value)}
                className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-3 text-sm font-display font-semibold tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
              />
            </div>
            {Number(form.serviceFee) > 0 && (
              <p className="text-[11px] text-muted-foreground">
                For an 8-person squad →{" "}
                <strong>₦{Math.round(Number(form.serviceFee) / 8).toLocaleString()} per person</strong> added to their Paystack link
              </p>
            )}
          </div>

          {/* Brand color */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Brand color</div>
            <div className="flex flex-wrap gap-3">
              {COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => set("color", c.value)}
                  title={c.name}
                  className={`w-9 h-9 rounded-full transition-all ${form.color === c.value ? "ring-2 ring-offset-2 ring-foreground/40 scale-110" : "hover:scale-105"}`}
                  style={{ backgroundColor: c.value }}
                />
              ))}
            </div>
            <div className="flex items-center gap-3 mt-1 p-3 rounded-xl bg-secondary/40">
              <div
                className="w-9 h-9 rounded-lg grid place-items-center text-white font-display font-bold text-xs shrink-0"
                style={{ backgroundColor: form.color }}
              >
                {initials}
              </div>
              <div>
                <div className="font-semibold text-sm">{form.agencyName || "Your Agency"}</div>
                {form.tagline && <div className="text-[11px] text-muted-foreground">{form.tagline}</div>}
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Choose your plan</div>
            <div className="grid grid-cols-2 gap-3">
              {([
                { key: "starter", label: "Pro Starter", price: "₦10,000/mo", desc: "Up to 3 active trips" },
                { key: "growth", label: "Pro Growth", price: "₦20,000/mo", desc: "Unlimited trips + analytics" },
              ] as const).map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => set("plan", p.key)}
                  className={`rounded-2xl p-4 text-left transition-all ${
                    form.plan === p.key
                      ? "bg-foreground text-background ring-2 ring-foreground"
                      : "bg-secondary/60 ring-hairline hover:bg-secondary"
                  }`}
                >
                  <div className="font-semibold text-sm">{p.label}</div>
                  <div className={`font-display text-lg font-semibold mt-1 tabular-nums`}>{p.price}</div>
                  <div className={`text-[11px] mt-0.5 ${form.plan === p.key ? "opacity-70" : "text-muted-foreground"}`}>{p.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-sm text-red-500 text-center">{error}</p>}

          <button
            type="submit"
            disabled={status === "loading" || !form.phone.trim() || !form.agencyName.trim()}
            className="w-full rounded-full bg-foreground text-background py-4 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {status === "loading" ? "Setting up..." : "Launch my agency →"}
          </button>

          <p className="text-center text-xs text-muted-foreground pb-8">
            No card charged today. Billed at the start of your first month.
          </p>
        </form>
      </div>
    </main>
  );
};

export default ProSetup;
