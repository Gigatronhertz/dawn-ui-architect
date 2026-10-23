import { useEffect, useState } from "react";
import { Check } from "lucide-react";
import { api, type Bank } from "@/lib/api";
import { session } from "@/lib/api";

/**
 * Where escrow pays out. The bank comes from Pandascrow's own list and the
 * account is checked with that bank, so the name shown is the name on the
 * account — never something typed. Used by agencies (Pro settings) and by
 * friend-trip organisers who switch on escrow.
 */
export function BankAccountForm({
  initial,
  onSave,
  saveLabel = "Save payout account",
  locked = false,
}: {
  initial?: { bankCode: string; accountNumber: string; accountName: string } | null;
  onSave: (payload: { bankCode: string; bankName: string; accountNumber: string }) => Promise<void>;
  saveLabel?: string;
  /** Payments are already running against the saved account. */
  locked?: boolean;
}) {
  const [banks, setBanks]       = useState<Bank[] | null>(null);
  const [bankErr, setBankErr]   = useState("");
  const [bankCode, setBankCode] = useState(initial?.bankCode || "");
  const [number, setNumber]     = useState(initial?.accountNumber || "");
  const [name, setName]         = useState(initial?.accountName || "");
  const [checking, setChecking] = useState(false);
  const [checkErr, setCheckErr] = useState("");
  const [saving, setSaving]     = useState(false);
  const [note, setNote]         = useState("");

  useEffect(() => {
    api.getBanks()
      .then((d) => setBanks(d.banks))
      .catch(() => setBankErr("Couldn't load the bank list. Refresh to try again."));
  }, []);

  // Check the account as soon as there's a bank and ten digits.
  useEffect(() => {
    if (!bankCode || number.length !== 10) { setCheckErr(""); if (number !== initial?.accountNumber || bankCode !== initial?.bankCode) setName(""); return; }
    if (initial && bankCode === initial.bankCode && number === initial.accountNumber) { setName(initial.accountName); return; }
    const token = session.get();
    if (!token) return;
    let live = true;
    setChecking(true);
    setCheckErr("");
    setName("");
    api.resolveBank({ bankCode, accountNumber: number }, token)
      .then((r) => { if (live) setName(r.accountName); })
      .catch((e) => { if (live) setCheckErr(e instanceof Error ? e.message : "We couldn't find that account."); })
      .finally(() => { if (live) setChecking(false); });
    return () => { live = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankCode, number, initial?.bankCode, initial?.accountNumber, initial?.accountName]);

  async function save() {
    if (!name) return;
    setSaving(true);
    setNote("");
    try {
      await onSave({ bankCode, bankName: banks?.find((b) => b.code === bankCode)?.name || "", accountNumber: number });
      setNote("Saved.");
    } catch (e) {
      setCheckErr(e instanceof Error ? e.message : "Couldn't save that account.");
    } finally {
      setSaving(false);
    }
  }

  const field = "w-full bg-card border border-line-strong px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-signal disabled:opacity-60";
  const unchanged = !!initial && bankCode === initial.bankCode && number === initial.accountNumber;

  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="payout-bank" className="text-xs text-muted-foreground block mb-1.5">Bank</label>
          <select
            id="payout-bank"
            value={bankCode}
            onChange={(e) => { setBankCode(e.target.value); setNote(""); }}
            disabled={locked || !banks}
            className={field}
          >
            <option value="">{banks ? "Choose your bank" : "Loading banks…"}</option>
            {banks?.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
          </select>
          {bankErr && <p className="text-xs text-destructive mt-1.5">{bankErr}</p>}
        </div>
        <div>
          <label htmlFor="payout-number" className="text-xs text-muted-foreground block mb-1.5">Account number</label>
          <input
            id="payout-number"
            inputMode="numeric"
            autoComplete="off"
            value={number}
            onChange={(e) => { setNumber(e.target.value.replace(/\D/g, "").slice(0, 10)); setNote(""); }}
            placeholder="10-digit account number"
            disabled={locked}
            className={`${field} tabular-nums`}
          />
        </div>
      </div>

      <div className="rounded-xl bg-secondary/70 px-4 py-3 text-sm min-h-[3rem] flex items-center gap-2" aria-live="polite">
        {checking ? (
          <span className="text-muted-foreground">Checking with the bank…</span>
        ) : name ? (
          <>
            <Check className="w-4 h-4 text-emerald-700 shrink-0" />
            <span><span className="text-muted-foreground">Account name: </span><span className="font-semibold">{name}</span></span>
          </>
        ) : checkErr ? (
          <span className="text-destructive">{checkErr}</span>
        ) : (
          <span className="text-muted-foreground">Pick a bank and enter the account number — we'll fill in the name from the bank.</span>
        )}
      </div>

      {locked ? (
        <p className="text-xs text-muted-foreground">Payments are already running against this account, so it can't change now.</p>
      ) : (
        <div className="flex items-center gap-3">
          <button type="button" onClick={save} disabled={!name || saving || unchanged} className="kj-btn text-sm py-2.5 px-5">
            {saving ? "Saving…" : saveLabel}
          </button>
          {note && <span className="text-xs text-emerald-700">{note}</span>}
        </div>
      )}
    </div>
  );
}
