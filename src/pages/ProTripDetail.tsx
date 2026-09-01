import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, session, type AgencyTripDetail } from "@/lib/api";
import { KarijeLogo } from "@/components/Nav";

/**
 * One agency trip: who has joined, who has paid, and who still needs chasing.
 * The agency can chase anyone unpaid from here, and flip the trip on or off
 * the Karije catalog without leaving the page.
 */

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (unix: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short" }) : "—";

export default function ProTripDetail() {
  const { tripId } = useParams<{ tripId: string }>();
  const { user, loading, getIdToken } = useAuth();
  const navigate = useNavigate();

  const [data, setData]       = useState<AgencyTripDetail | null>(null);
  const [busy, setBusy]       = useState(true);
  const [err, setErr]         = useState("");
  const [note, setNote]       = useState("");
  const [sending, setSending] = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);

  const shareUrl = `${window.location.origin}/plan/${tripId}`;

  const load = useCallback(async () => {
    const token = session.get();
    if (!token) { navigate("/pro/login", { replace: true }); return; }
    try {
      setData(await api.getAgencyTrip(tripId!, token));
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not load this trip.");
    } finally {
      setBusy(false);
    }
  }, [tripId, navigate]);

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate("/pro/login", { replace: true }); return; }
    load();
  }, [user, loading, load, navigate]);

  async function remind(participantIds?: string[]) {
    setSending(participantIds?.[0] ?? "all");
    setNote("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await api.remindAgencyTrip(tripId!, participantIds, token);

      if (res.message)        setNote(res.message);
      else if (res.sent)      setNote(`Reminder sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}.`);
      else {
        // Nothing went out — say why, rather than a silent no-op.
        const reason = res.results?.[0]?.reason;
        setNote(
          reason === "too_soon"     ? "Already chased in the last hour — give it a moment."
          : reason === "already_paid" ? "They have already paid."
          : reason === "unreachable"  ? "No way to reach them yet — email delivery isn't configured."
          : "Nothing was sent."
        );
      }
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not send the reminder.");
    } finally {
      setSending(null);
    }
  }

  async function toggleListed() {
    if (!data) return;
    const next = !data.trip.listed;
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      await api.updateAgencyTrip(tripId!, { listed: next }, token);
      setNote(next ? "Now showing in the Karije catalog." : "Removed from the catalog — the share link still works.");
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not update the trip.");
    }
  }

  if (loading || busy) {
    return (
      <main className="min-h-screen bg-background grid place-items-center">
        <div className="w-8 h-8 rounded-full border-2 border-foreground border-t-transparent animate-spin" />
      </main>
    );
  }

  if (err || !data) {
    return (
      <main className="min-h-screen bg-background grid place-items-center px-6">
        <div className="text-center space-y-4 max-w-sm">
          <p className="text-muted-foreground font-jost font-light">{err || "Trip not found."}</p>
          <Link to="/pro/dashboard" className="inline-block text-sm text-foreground hover:underline">
            ← Back to the dashboard
          </Link>
        </div>
      </main>
    );
  }

  const { trip, squad, summary } = data;
  const unpaid = squad.filter(s => !s.paid);

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-5xl px-6 py-10">

        <div className="flex items-center justify-between mb-10 gap-4">
          <KarijeLogo size="sm" />
          <Link to="/pro/dashboard" className="text-sm font-jost font-light text-muted-foreground hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
        </div>

        {/* ── Heading ───────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
          <div className="min-w-0">
            <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">
              {trip.title || trip.city}
            </h1>
            <p className="text-muted-foreground font-jost font-light mt-1">
              {trip.city} · {trip.days} {trip.days === 1 ? "day" : "days"} · {fmtNGN(trip.perPerson)} per person
              {trip.selectedDate ? ` · ${trip.selectedDate}` : ""}
            </p>
          </div>
          <button
            onClick={toggleListed}
            className={`text-xs font-jost font-medium tracking-[0.08em] uppercase px-4 py-2 border transition-colors ${
              trip.listed
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            }`}
          >
            {trip.listed ? "Listed on Karije" : "Link only"}
          </button>
        </div>

        {/* ── Share link ────────────────────────────────────────────────── */}
        <div className="border border-border p-4 mb-8 flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">
              Share this link
            </div>
            <div className="font-jost text-sm truncate">{shareUrl}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="bg-signal text-ink px-5 py-2.5 text-xs font-jost font-medium tracking-[0.06em] hover:bg-ink hover:text-signal transition-colors shrink-0"
          >
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        </div>

        {/* ── Money ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border mb-8">
          {[
            { label: "Joined",    value: String(summary.joined) },
            { label: "Paid",      value: String(summary.paid) },
            { label: "Pending",   value: String(summary.pending) },
            { label: "Collected", value: fmtNGN(summary.collected) },
          ].map(s => (
            <div key={s.label} className="bg-card p-4">
              <div className="text-[10px] font-jost font-light tracking-label text-muted-foreground uppercase mb-1">
                {s.label}
              </div>
              <div className="font-display text-2xl font-semibold tabular-nums">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Chase ─────────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <h2 className="font-display text-xl font-semibold">Travellers</h2>
          <div className="flex-1" />
          {unpaid.length > 0 && (
            <button
              onClick={() => remind()}
              disabled={sending !== null}
              className="text-xs font-jost font-medium tracking-[0.06em] border border-border px-4 py-2 hover:border-foreground transition-colors disabled:opacity-40"
            >
              {sending === "all" ? "Sending…" : `Chase all ${unpaid.length} unpaid`}
            </button>
          )}
        </div>

        {note && (
          <p className="text-xs font-jost bg-secondary/60 ring-hairline px-3 py-2 mb-4">{note}</p>
        )}

        {squad.length === 0 ? (
          <div className="border border-border p-10 text-center">
            <p className="font-jost font-light text-muted-foreground">
              Nobody has joined yet. Share the link above and they'll show up here as they join.
            </p>
          </div>
        ) : (
          <div className="border border-border overflow-x-auto">
            <table className="w-full min-w-[36rem]">
              <thead>
                <tr className="bg-secondary/60">
                  {["Traveller", "Status", "Amount", "Joined", "Chased", ""].map(h => (
                    <th key={h} className="text-left text-[10px] font-jost font-medium tracking-label text-muted-foreground uppercase px-4 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {squad.map(m => (
                  <tr key={m.id} className="border-t border-border">
                    <td className="px-4 py-3">
                      <div className="font-jost text-sm">{m.name || "—"}</div>
                      <div className="font-jost text-xs text-muted-foreground">{m.email || m.waNumber || "no contact"}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-jost font-medium ${m.paid ? "text-foreground" : "text-muted-foreground"}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${m.paid ? "bg-primary" : "bg-muted-foreground/50"}`} />
                        {m.paid ? "Paid" : "Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-jost text-sm tabular-nums">
                      {m.paid ? fmtNGN(m.amount ?? trip.perPerson) : "—"}
                    </td>
                    <td className="px-4 py-3 font-jost text-xs text-muted-foreground">{fmtDate(m.joinedAt)}</td>
                    <td className="px-4 py-3 font-jost text-xs text-muted-foreground">
                      {m.remindersSent > 0 ? `${m.remindersSent}× · ${fmtDate(m.lastRemindedAt)}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!m.paid && (
                        <button
                          onClick={() => remind([m.id])}
                          disabled={sending !== null}
                          className="text-xs font-jost border border-border px-3 py-1.5 hover:border-foreground transition-colors disabled:opacity-40 whitespace-nowrap"
                        >
                          {sending === m.id ? "Sending…" : "Remind"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-xs font-jost font-light text-muted-foreground mt-4">
          Reminders go out by email. WhatsApp check-ins switch on automatically once
          the WhatsApp provider is configured — no change needed here.
        </p>
      </div>
    </main>
  );
}
