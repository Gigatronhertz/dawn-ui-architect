import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { api, imageUrl, session, type AgencySquadMember, type AgencyTripDetail } from "@/lib/api";
import ProShell from "@/components/ProShell";

/**
 * One agency trip: who joined, who paid, and who still needs chasing.
 *
 * Every contact detail a traveller gave is shown — email and phone, never one
 * or the other. Paid rows carry the amount, the moment it landed and the
 * Paystack reference, so a payment can be matched against a statement.
 */

const fmtNGN = (n: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(n || 0);

const fmtDate = (unix: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

const fmtDateTime = (unix: number | null) =>
  unix
    ? new Date(unix * 1000).toLocaleString("en-NG", {
        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

/** Digits only — what wa.me expects, and what tel: is happiest with. */
const waDigits = (n: string) => n.replace(/[^\d]/g, "");

type Tab = "all" | "paid" | "pending";

/** A contact line you can read, copy, and act on. */
function Contact({ label, value, href, action }: {
  label: string;
  value: string;
  href: string;
  action?: { href: string; label: string };
}) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="text-[10px] font-jost text-muted-foreground/70 uppercase tracking-wider w-10 shrink-0">
        {label}
      </span>
      <a href={href} className="font-jost text-xs text-foreground hover:underline truncate">
        {value}
      </a>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label={`Copy ${label.toLowerCase()}`}
        className="text-[10px] font-jost text-muted-foreground hover:text-foreground transition-colors shrink-0"
      >
        {copied ? "✓" : "copy"}
      </button>
      {action && (
        <a
          href={action.href}
          target="_blank"
          rel="noreferrer"
          className="text-[10px] font-jost text-muted-foreground hover:text-foreground transition-colors shrink-0"
        >
          {action.label}
        </a>
      )}
    </div>
  );
}

/** One traveller, with everything they gave us. */
function TravellerRow({ m, perPerson, onRemind, sending }: {
  m: AgencySquadMember;
  perPerson: number;
  onRemind: () => void;
  sending: boolean;
}) {
  return (
    // first:border-t-0 — the card header above already draws that line.
    <div className="border-t border-border first:border-t-0 px-5 py-4 grid md:grid-cols-[1.4fr,1fr,auto] gap-4 items-start">
      {/* Who */}
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="font-jost text-sm font-medium">{m.name || "Unnamed traveller"}</span>
          <span className={`inline-flex items-center gap-1.5 text-[10px] font-jost font-medium tracking-wider uppercase ${m.paid ? "text-foreground" : "text-muted-foreground"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${m.paid ? "bg-primary" : "bg-muted-foreground/50"}`} />
            {m.paid ? "Paid" : "Pending"}
          </span>
        </div>

        {/* Email and phone both, always — never one or the other. */}
        {m.email && (
          <Contact label="Email" value={m.email} href={`mailto:${m.email}`} />
        )}
        {m.waNumber && (
          <Contact
            label="Phone"
            value={m.waNumber}
            href={`tel:${waDigits(m.waNumber)}`}
            action={{ href: `https://wa.me/${waDigits(m.waNumber)}`, label: "WhatsApp ↗" }}
          />
        )}
        {!m.email && !m.waNumber && (
          <div className="font-jost text-xs text-muted-foreground">No contact details given</div>
        )}
      </div>

      {/* Money, or the chase history */}
      <div className="font-jost text-xs space-y-0.5 min-w-0">
        {m.paid ? (
          <>
            <div className="text-sm font-medium tabular-nums">{fmtNGN(m.amount ?? perPerson)}</div>
            <div className="text-muted-foreground">{fmtDateTime(m.paidAt)}</div>
            {m.reference && (
              <div className="text-muted-foreground/70 font-mono text-[10px] truncate" title={m.reference}>
                ref {m.reference}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="text-muted-foreground">Joined {fmtDate(m.joinedAt)}</div>
            <div className="text-muted-foreground">
              {m.remindersSent > 0
                ? `Chased ${m.remindersSent}× · last ${fmtDate(m.lastRemindedAt)}`
                : "Not chased yet"}
            </div>
          </>
        )}
      </div>

      {/* Act */}
      <div className="md:text-right">
        {!m.paid && (
          <button
            onClick={onRemind}
            disabled={sending}
            className="text-xs font-jost border border-border px-3 py-1.5 hover:border-foreground transition-colors disabled:opacity-40 whitespace-nowrap"
          >
            {sending ? "Sending…" : "Remind"}
          </button>
        )}
      </div>
    </div>
  );
}

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
  const [tab, setTab]         = useState<Tab>("all");
  const [exporting, setExporting] = useState(false);

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

  // Name the tab after the trip, so several open at once stay tellable apart.
  useEffect(() => {
    const name = data?.trip.title || data?.trip.city;
    document.title = name ? `${name} · Karije Pro` : "Trip · Karije Pro";
  }, [data]);

  const squad   = data?.squad ?? [];
  const paid    = useMemo(() => squad.filter(s => s.paid),  [squad]);
  const pending = useMemo(() => squad.filter(s => !s.paid), [squad]);
  const shown   = tab === "paid" ? paid : tab === "pending" ? pending : squad;

  async function remind(participantIds?: string[]) {
    setSending(participantIds?.[0] ?? "all");
    setNote("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await api.remindAgencyTrip(tripId!, participantIds, token);

      if (res.message)   setNote(res.message);
      else if (res.sent) setNote(`Reminder sent to ${res.sent} ${res.sent === 1 ? "person" : "people"}.`);
      else {
        const reason = res.results?.[0]?.reason;
        setNote(
          reason === "too_soon"      ? "Already chased in the last hour — give it a moment."
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

  /**
   * The CSV route is behind the bearer token, so a plain link cannot fetch it.
   * Pull it with the header, then hand the browser a blob to save.
   */
  async function exportCsv() {
    setExporting(true);
    setNote("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Please sign in again.");
      const res = await fetch(api.agencyTripCsvUrl(tripId!), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Could not build the export.");

      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href = url;
      a.download = `${(data?.trip.title || "trip").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-travellers.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not export the list.");
    } finally {
      setExporting(false);
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

  const { trip, summary, money, agency } = data;

  const emptyCopy =
    tab === "paid"    ? "Nobody has paid yet. Chase the pending list and they'll appear here."
    : tab === "pending" ? "Everyone who joined has paid. Nothing to chase."
    : "Nobody has joined yet. Share the link above and they'll show up here as they join.";

  return (
    <ProShell
      active="trips"
      backTo="/pro/dashboard"
      title={trip.title || trip.city}
      subtitle={
        `${trip.city} · ${trip.days} ${trip.days === 1 ? "day" : "days"} · ${fmtNGN(trip.perPerson)} per person`
        + (trip.selectedDate ? ` · ${trip.selectedDate}` : "")
      }
      actions={
        <button
          onClick={toggleListed}
          className={`text-xs font-medium rounded-lg px-3 py-2 border transition-colors whitespace-nowrap ${
            trip.listed
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
          }`}
        >
          {trip.listed ? "Listed on Karije" : "Link only"}
        </button>
      }
    >
        {/* The agency running it — the same branding a traveller sees. */}
        {agency && imageUrl(agency.logoUrl) && (
          <div className="flex items-center gap-2.5 mb-5">
            <img
              src={imageUrl(agency.logoUrl)!}
              alt={agency.name}
              className="h-7 w-auto max-w-[6rem] object-contain"
            />
            <span className="text-[10px] tracking-label text-muted-foreground uppercase">
              {agency.name}
            </span>
          </div>
        )}

        {/* ── Share link ────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-card ring-hairline p-5 mb-6 flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <div className="text-[11px] font-medium text-muted-foreground mb-1">
              Share this link
            </div>
            <div className="text-sm truncate">{shareUrl}</div>
          </div>
          <button
            onClick={() => {
              navigator.clipboard?.writeText(shareUrl);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="rounded-lg bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity shrink-0"
          >
            {copied ? "✓ Copied" : "Copy link"}
          </button>
        </div>

        {/* ── Money ─────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Joined",      value: String(summary.joined) },
            { label: "Paid",        value: `${summary.paid} of ${summary.joined}` },
            { label: "Collected",   value: fmtNGN(summary.collected) },
            { label: "Due to you",  value: fmtNGN(money?.dueToOrganiser ?? summary.collected) },
          ].map(s => (
            <div key={s.label} className="rounded-2xl bg-card ring-hairline p-5">
              <div className="text-[11px] font-medium text-muted-foreground mb-1">
                {s.label}
              </div>
              <div className="font-display text-2xl font-semibold tabular-nums truncate">{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── Travellers ────────────────────────────────────────────────── */}
        <div className="rounded-3xl bg-card ring-hairline overflow-hidden">
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-border">
            <h2 className="font-display font-semibold">Travellers</h2>
            {/* Tabs */}
            <div className="flex items-center gap-0.5 rounded-lg bg-secondary/60 p-0.5">
              {([
                { key: "all",     label: "All",     n: squad.length },
                { key: "paid",    label: "Paid",    n: paid.length },
                { key: "pending", label: "Pending", n: pending.length },
              ] as const).map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  aria-pressed={tab === t.key}
                  className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                    tab === t.key
                      ? "bg-background text-foreground font-medium shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t.label} <span className="tabular-nums opacity-60">{t.n}</span>
                </button>
              ))}
            </div>
            <div className="flex-1" />
            <button
              onClick={exportCsv}
              disabled={exporting || squad.length === 0}
              className="text-xs rounded-lg border border-border px-3 py-2 hover:border-foreground transition-colors disabled:opacity-40 whitespace-nowrap"
            >
              {exporting ? "Preparing…" : "↓ Export CSV"}
            </button>
            {pending.length > 0 && (
              <button
                onClick={() => remind()}
                disabled={sending !== null}
                className="text-xs font-medium rounded-lg bg-foreground text-background px-3 py-2 hover:opacity-90 transition-opacity disabled:opacity-40 whitespace-nowrap"
              >
                {sending === "all" ? "Sending…" : `Chase all ${pending.length} unpaid`}
              </button>
            )}
          </div>

          {note && (
            <p className="text-xs bg-secondary/60 px-5 py-2.5 border-b border-border">{note}</p>
          )}

          {shown.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-sm text-muted-foreground max-w-sm mx-auto">{emptyCopy}</p>
            </div>
          ) : (
            shown.map(m => (
              <TravellerRow
                key={m.id}
                m={m}
                perPerson={trip.perPerson}
                sending={sending === m.id}
                onRemind={() => remind([m.id])}
              />
            ))
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mt-4">
          Reminders go out by email. WhatsApp check-ins switch on automatically once
          the WhatsApp provider is configured — no change needed here.
        </p>
    </ProShell>
  );
}
