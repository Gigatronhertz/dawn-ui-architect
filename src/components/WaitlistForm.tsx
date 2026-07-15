import { useState } from "react";
import { api } from "@/lib/api";

type Status = "idle" | "loading" | "success" | "error";

export const WaitlistForm = ({
  source,
  dark = false,
  className = "",
}: {
  source: string;
  dark?: boolean;
  className?: string;
}) => {
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setStatus("loading");
    try {
      await api.joinWaitlist({ phone: phone.trim(), source });
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className={`flex items-center gap-3 rounded-2xl px-5 py-4 text-sm font-medium ${dark ? "bg-white/10 text-white" : "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20"} ${className}`}>
        <span className="text-xl shrink-0">✅</span>
        You're on the list. We'll reach out on WhatsApp when your city opens.
      </div>
    );
  }

  return (
    <div className={className}>
      <form onSubmit={submit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="Your WhatsApp number"
          disabled={status === "loading"}
          className={`flex-1 rounded-full px-5 py-3.5 text-sm focus:outline-none transition-all ${
            dark
              ? "bg-white/10 ring-1 ring-white/20 placeholder:text-white/50 text-white focus:ring-2 focus:ring-white/40"
              : "bg-secondary/60 ring-hairline placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/40"
          }`}
        />
        <button
          type="submit"
          disabled={status === "loading" || !phone.trim()}
          className="rounded-full bg-gradient-primary text-primary-foreground px-6 py-3.5 text-sm font-medium shadow-glow hover:scale-[1.02] active:scale-[0.98] transition-transform disabled:opacity-50 disabled:hover:scale-100 whitespace-nowrap"
        >
          {status === "loading" ? "Saving…" : "Get early access"}
        </button>
      </form>
      {status === "error" && (
        <p className={`text-xs mt-2 ${dark ? "text-red-300" : "text-red-500"}`}>
          Something went wrong — try again.
        </p>
      )}
    </div>
  );
};
