import { useState } from "react";
import { api } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export const AgencyForm = ({ className = "" }: { className?: string }) => {
  const [form, setForm] = useState({ name: "", agencyName: "", phone: "", email: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [k]: e.target.value }));

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name || !form.phone || !form.email) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await api.submitAgencyLead({
        name:       form.name.trim(),
        agencyName: form.agencyName.trim(),
        phone:      form.phone.trim(),
        email:      form.email.trim(),
      });
      setStatus("success");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={`rounded-2xl bg-primary/10 ring-1 ring-primary/20 px-6 py-5 text-sm ${className}`}>
        <div className="text-2xl mb-2">🎉</div>
        <div className="font-semibold text-foreground">You're on the list!</div>
        <p className="text-muted-foreground mt-1">
          We'll reach out on WhatsApp to set up your agency account.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={`space-y-3 ${className}`}>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Your name <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set("name")}
            placeholder="Chidi Okafor"
            required
            disabled={status === "loading"}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Agency / business name
          </label>
          <input
            type="text"
            value={form.agencyName}
            onChange={set("agencyName")}
            placeholder="TripWise Travels"
            disabled={status === "loading"}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
        </div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            WhatsApp number <span className="text-destructive">*</span>
          </label>
          <input
            type="tel"
            value={form.phone}
            onChange={set("phone")}
            placeholder="+234 800 000 0000"
            required
            disabled={status === "loading"}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Email address <span className="text-destructive">*</span>
          </label>
          <input
            type="email"
            value={form.email}
            onChange={set("email")}
            placeholder="you@example.com"
            required
            disabled={status === "loading"}
            className="w-full rounded-xl bg-secondary/60 ring-hairline px-4 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-50"
          />
        </div>
      </div>

      {status === "error" && (
        <p className="text-xs text-destructive">{errorMsg || "Something went wrong — please try again."}</p>
      )}

      <button
        type="submit"
        disabled={status === "loading" || !form.name || !form.phone || !form.email}
        className="w-full rounded-lg bg-gradient-primary text-primary-foreground px-6 py-3 text-sm font-medium shadow-glow hover:scale-[1.01] active:scale-[0.99] transition-transform disabled:opacity-50 disabled:hover:scale-100"
      >
        {status === "loading" ? "Sending…" : "Get early access →"}
      </button>
      <p className="text-xs text-muted-foreground text-center">
        Free during beta. No card needed. We'll set everything up with you.
      </p>
    </form>
  );
};
