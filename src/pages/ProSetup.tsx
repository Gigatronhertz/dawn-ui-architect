import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, imageUrl } from "@/lib/api";


// ── Colour swatches ───────────────────────────────────────────────────────────
const COLORS = [
  { name: "Indigo",  value: "#6366f1" },
  { name: "Emerald", value: "#10b981" },
  { name: "Rose",    value: "#f43f5e" },
  { name: "Amber",   value: "#f59e0b" },
  { name: "Sky",     value: "#0ea5e9" },
  { name: "Orange",  value: "#f97316" },
];

// ── Main page ─────────────────────────────────────────────────────────────────
const ProSetup = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading, getIdToken } = useAuth();

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
  // Held until the profile is saved. On first onboarding there is no agency
  // yet, and the upload route needs one — so the file waits for the save.
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Pre-fill plan from URL (?plan=growth) and any existing saved form
  useEffect(() => {
    const urlPlan = searchParams.get("plan") === "growth" ? "growth" : null;
    if (urlPlan) setForm((f) => ({ ...f, plan: urlPlan }));

    // Load any existing agency profile for this user
    if (!user) return;
    const token = getIdToken();
    if (!token) return;
    api.getProMe(token)
      .then(({ agent }) => {
        setForm({
          agencyName: agent.agencyName  || agent.agency_name || "",
          tagline:    agent.tagline                          || "",
          phone:      agent.phone                           || "",
          waNumber:   agent.waNumber    || agent.wa_number  || "",
          serviceFee: String(agent.serviceFee ?? agent.service_fee ?? 10000),
          color:      agent.color                           || "#6366f1",
          plan:       (urlPlan ?? agent.planType ?? agent.plan_type ?? "starter") as "starter" | "growth",
        });
        if (agent.logo_image_id) {
          setLogoPreview(imageUrl(`/api/trip-image/${agent.logo_image_id}`));
        }
      })
      .catch(() => { /* first time — no profile yet */ });
  }, [user, getIdToken, searchParams]);

  const initials = form.agencyName
    .trim().split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "?";

  const set = (key: string, val: string) => setForm((f) => ({ ...f, [key]: val }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.phone.trim() || !form.agencyName.trim()) return;
    const token = getIdToken();
    if (!token) { setError("Not signed in."); return; }

    setStatus("loading");
    setError("");
    try {
      await api.setupPro(
        {
          agencyName:  form.agencyName.trim(),
          tagline:     form.tagline.trim(),
          phone:       form.phone.trim().replace(/\s+/g, ""),
          waNumber:    form.waNumber.trim().replace(/\s+/g, "") || undefined,
          serviceFee:  Number(form.serviceFee) || 10000,
          color:       form.color,
          planType:    form.plan,
        },
        token,
      );
      // The agency has to exist before it can own a logo, so this follows the
      // profile save rather than racing it.
      if (logoFile) {
        try {
          await api.uploadAgencyLogo(logoFile, token);
        } catch (uploadErr) {
          // The profile saved; only the logo failed. Say so plainly instead of
          // making them redo the whole form.
          setStatus("error");
          setError(
            uploadErr instanceof Error
              ? `Your agency was saved, but the logo did not upload: ${uploadErr.message}`
              : "Your agency was saved, but the logo did not upload."
          );
          return;
        }
      }
      navigate("/pro/dashboard");
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  // ── Not signed in — send to the dedicated login page ─────────────────────
  if (!user) return <Navigate to="/pro/login" replace />;

  // ── Setup form ─────────────────────────────────────────────────────────────
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
            Karije
            <span className="ml-1 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-foreground text-background">Pro</span>
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs text-muted-foreground truncate max-w-[200px]">{user.email}</span>
            <Link to="/pro/dashboard" className="text-xs text-muted-foreground hover:text-foreground">Dashboard →</Link>
          </div>
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
          <p className="mt-2 text-muted-foreground text-sm">Takes 2 minutes. Your clients never see Karije.</p>
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

          {/* WhatsApp contact */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Contact number</div>
            <p className="text-xs text-muted-foreground -mt-1">
              How we reach you about your agency, and the number that identifies it. <strong>Not used for sign-in</strong> — you sign in with {user.email}.
            </p>
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">Your phone number *</label>
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
                WhatsApp number <span className="opacity-50">(optional — for check-ins once WhatsApp is live)</span>
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
            <p className="text-xs text-muted-foreground">Your own margin per trip. Karije takes no cut of what you collect — the ₦10,000/month covers the platform. You keep 100%.</p>
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

          {/* Logo */}
          <div className="rounded-3xl bg-card ring-hairline p-6 space-y-4">
            <div className="font-semibold text-sm">Your logo</div>
            <p className="text-xs text-muted-foreground -mt-1">
              Shown on your dashboard, on every trip you build, and on the plan page
              your travellers open. JPEG, PNG or WebP, up to 2MB.
            </p>

            <div className="flex items-center gap-4">
              <div
                className="w-16 h-16 rounded-xl grid place-items-center overflow-hidden shrink-0 ring-hairline bg-secondary/40"
                style={logoPreview ? undefined : { backgroundColor: form.color }}
              >
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-contain" />
                ) : (
                  <span className="text-white font-display font-bold text-sm">{initials}</span>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <label className="inline-flex items-center gap-2 text-xs font-medium cursor-pointer rounded-lg bg-secondary/60 ring-hairline px-4 py-2 hover:bg-secondary transition">
                  {logoPreview ? "Choose a different file" : "Choose a file"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        setError("That logo is over 2MB — pick a smaller file.");
                        return;
                      }
                      setError("");
                      setLogoFile(file);
                      setLogoPreview(URL.createObjectURL(file));
                    }}
                  />
                </label>
                {logoPreview && (
                  <button
                    type="button"
                    onClick={async () => {
                      setLogoFile(null);
                      setLogoPreview(null);
                      const token = getIdToken();
                      // Only meaningful if one was already saved; harmless otherwise.
                      if (token) { try { await api.removeAgencyLogo(token); } catch { /* nothing saved yet */ } }
                    }}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition text-left"
                  >
                    Remove logo
                  </button>
                )}
              </div>
            </div>
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
                className="w-9 h-9 rounded-lg grid place-items-center text-white font-display font-bold text-xs shrink-0 overflow-hidden"
                style={logoPreview ? undefined : { backgroundColor: form.color }}
              >
                {logoPreview
                  ? <img src={logoPreview} alt="" className="w-full h-full object-contain" />
                  : initials}
              </div>
              <div>
                <div className="font-semibold text-sm">{form.agencyName || "Your Agency"}</div>
                {form.tagline && <div className="text-[11px] text-muted-foreground">{form.tagline}</div>}
              </div>
            </div>
          </div>

          {/* Plan — one plan, so there is nothing to choose */}
          <div className="rounded-3xl bg-card ring-hairline p-6">
            <div className="flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <div className="font-semibold text-sm">Karije Pro</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Unlimited trips · keep 100% of what you collect
                </div>
              </div>
              <div className="font-display text-2xl font-semibold tabular-nums">₦10,000<span className="text-sm font-normal text-muted-foreground">/mo</span></div>
            </div>
          </div>

          {error && <p className="text-sm text-destructive text-center">{error}</p>}

          <button
            type="submit"
            disabled={status === "loading" || !form.phone.trim() || !form.agencyName.trim()}
            className="w-full rounded-lg bg-foreground text-background py-4 text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {status === "loading" ? "Saving…" : "Launch my agency →"}
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
