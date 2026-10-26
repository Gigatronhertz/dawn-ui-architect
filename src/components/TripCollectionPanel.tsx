import { useCallback, useEffect, useState } from "react";
import { Bell, Check, Copy, ShieldCheck, Share2 } from "lucide-react";
import { api, session, type CollectionTier, type PaymentsConfig, type TripCollection } from "@/lib/api";
import { BankAccountForm } from "@/components/BankAccountForm";
import { normalisePhone } from "@/lib/phone";

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n);

const OPTIONS: { tier: CollectionTier; title: string; desc: string; icon: typeof Bell }[] = [
  { tier: "none",   title: "Free",              desc: "Share the plan and see who's in. You chase friends for their share yourself.", icon: Share2 },
  { tier: "notify", title: "Reminders",         desc: "We remind your friends to pay, by email and WhatsApp, so you don't have to.", icon: Bell },
  { tier: "escrow", title: "Escrow collection", desc: "Friends pay their own share into escrow. We hold it and release it to you. Reminders included.", icon: ShieldCheck },
];

/**
 * The organiser's controls on their own friend trip: which option is on,
 * paying for an upgrade, and where escrow pays out. Renders nothing for
 * anyone who isn't the trip's organiser (the API answers 403).
 */
export function TripCollectionPanel({ tripId }: { tripId: string }) {
  const [state, setState]   = useState<TripCollection | null>(null);
  const [config, setConfig] = useState<PaymentsConfig | null>(null);
  const [busy, setBusy]     = useState<CollectionTier | "">("");
  const [error, setError]   = useState("");
  const [waiting, setWaiting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [phone, setPhone]   = useState("");

  const load = useCallback(async () => {
    const token = session.get();
    if (!token) return null;
    const s = await api.getTripCollection(tripId, token);
    setState(s);
    setPhone((p) => p || s.phone || "");
    return s;
  }, [tripId]);

  useEffect(() => {
    load().catch(() => setState(null));
    api.getPaymentsConfig().then(setConfig).catch(() => {});
  }, [load]);

  if (!state || state.provider !== "pandascrow") return null;

  async function choose(tier: CollectionTier) {
    const token = session.get();
    if (!token || tier === state!.tier) return;
    setBusy(tier);
    setError("");
    try {
      setState(await api.setTripCollection(tripId, tier, token));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't change that.");
    } finally {
      setBusy("");
    }
  }

  // After paying the fee, wait for Pandascrow to tell us it arrived.
  async function confirmFee() {
    setWaiting(true);
    for (let i = 0; i < 24; i++) {
      try {
        const s = await load();
        if (s && !s.pendingFee) { setWaiting(false); return; }
      } catch { /* keep going */ }
      await new Promise((r) => setTimeout(r, 5000));
    }
    setWaiting(false);
    setError("We haven't seen your transfer yet — it usually lands within minutes.");
  }

  const fee = state.pendingFee;
  const cleanPhone = normalisePhone(phone);
  const price = (tier: CollectionTier) => config?.tiers[tier]?.listAmount ?? { none: 0, notify: 1000, escrow: 3000 }[tier];

  return (
    <div className="kj-card p-5 space-y-4 print:hidden">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your trip · organiser only</div>
        <h2 className="text-2xl mt-1">How do you want to collect?</h2>
        {state.feesWaived && <p className="text-sm text-muted-foreground mt-1">Every option is free while Karije is in beta.</p>}
      </div>

      <div className="space-y-2" role="radiogroup" aria-label="Collection option">
        {OPTIONS.map(({ tier, title, desc, icon: Icon }) => {
          const on = state.tier === tier;
          const cost = price(tier);
          return (
            <button
              key={tier}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => choose(tier)}
              disabled={!!busy}
              className={`w-full text-left flex items-start gap-3 border px-4 py-3 transition-colors ${on ? "border-ink bg-secondary/60" : "border-line-strong hover:border-foreground/50"}`}
            >
              <span className={`w-9 h-9 rounded-full grid place-items-center shrink-0 ${on ? "bg-signal text-ink" : "bg-secondary text-foreground"}`}>
                {on ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold">{title}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    {cost === 0 ? "Free" : state.feesWaived ? <><s className="text-muted-foreground font-normal">{fmtNGN(cost)}</s> Free</> : `${fmtNGN(cost)}/trip`}
                  </span>
                </span>
                <span className="block text-sm text-muted-foreground mt-0.5">{busy === tier ? "Switching…" : desc}</span>
              </span>
            </button>
          );
        })}
      </div>

      {fee && (
        <div className="rounded-xl bg-secondary/60 p-4 space-y-3">
          <p className="text-sm">
            To switch on <strong>{OPTIONS.find((o) => o.tier === fee.tier)?.title.toLowerCase()}</strong>, transfer
            exactly <strong>{fmtNGN(fee.amount)}</strong> to:
          </p>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-2xl tabular-nums tracking-wide">{fee.accountNumber}</div>
              <div className="text-xs text-muted-foreground">{fee.bankName || "9PSB"}{fee.accountName ? ` · ${fee.accountName}` : ""}</div>
            </div>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(fee.accountNumber).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1800); })}
              className="!rounded-full border border-line-strong px-3 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              {copied ? <><Check className="w-3.5 h-3.5" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
            </button>
          </div>
          <button type="button" onClick={confirmFee} disabled={waiting} className="kj-btn w-full py-3">
            {waiting ? "Checking for your transfer…" : "I've sent it"}
          </button>
        </div>
      )}

      {state.tier === "escrow" && (
        <div className="space-y-3 pt-1">
          <div>
            <div className="font-semibold">Where your friends' money goes</div>
            <p className="text-sm text-muted-foreground">
              {state.payout
                ? "Escrow releases each friend's share to this account."
                : "Add your bank account and phone number — friends can't pay until there's somewhere for the money to go."}
            </p>
          </div>
          <BankAccountForm
            initial={state.payout ? { bankCode: state.payout.bankCode, accountNumber: state.payout.accountNumber, accountName: state.payout.accountName } : null}
            saveLabel="Save my account"
            extraChanged={!!cleanPhone && cleanPhone !== state.phone}
            extraReady={!!cleanPhone}
            extra={
              <div>
                <label htmlFor="payout-phone" className="text-xs text-muted-foreground block mb-1.5">Your phone number</label>
                <input
                  id="payout-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0803 123 4567"
                  className="w-full bg-card border border-line-strong px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal"
                />
                <p className="text-xs text-muted-foreground mt-1.5">Escrow needs a phone number for whoever is paid.</p>
              </div>
            }
            onSave={async (payload) => {
              const token = session.get();
              if (!token) throw new Error("Please sign in again.");
              setState(await api.setTripPayout(tripId, { ...payload, phone: cleanPhone || undefined }, token));
            }}
          />
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
