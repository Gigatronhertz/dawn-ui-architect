import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "What if there are no hotels in our destination?",
    a: "The bot surfaces the best available options and flags the gap honestly. It'll ask if you want to expand your radius, adjust the budget, or switch accommodation type. If nothing viable exists at all, you're prompted to edit the destination before the plan is confirmed — no nasty surprises at checkout.",
  },
  {
    q: "What happens if some people haven't paid by the deadline?",
    a: "The bot sends automated reminders at 72h, 24h, and 2h before the cutoff. After the deadline, unpaid members are flagged in the group by name. The squad can vote to: cover the gap collectively, reduce the headcount, or extend the deadline by 24h. No manual chasing from the organiser.",
  },
  {
    q: "What if a Paystack payment fails or bounces?",
    a: "Paystack retries the charge automatically. If it fails a second time, the member receives a fresh payment link in their private DM with a plain-English error message. No public embarrassment in the group. The organiser is notified quietly.",
  },
  {
    q: "What if the trip is cancelled?",
    a: "Cancelled by group poll or organiser decision — all collected contributions are refunded within 48 hours to the original payment method. If bookings were already made, any non-refundable deposits are itemised and communicated clearly before the refund is processed. Nothing disappears silently.",
  },
  {
    q: "What if the organiser goes quiet mid-trip?",
    a: "After 72 hours of organiser inactivity during active payment collection, the bot notifies the group and offers to appoint a new trip admin from the existing members. Contributors' money stays in escrow — nothing is moved until a trip admin is active and confirms the next step.",
  },
  {
    q: "What if the bot can't understand what the group is saying?",
    a: "If the bot reads ambiguous or conflicting responses to an open question, it automatically falls back to a structured poll. No vote gets lost — the bot just makes it easier to count. If the group chat is unusually chaotic, the organiser gets a private heads-up to clarify.",
  },
];

export const Transparency = () => (
  <section id="faq" className="py-28 md:py-36 bg-secondary/40">
    <div className="mx-auto max-w-4xl px-6">
      <div className="text-center max-w-2xl mx-auto mb-14">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Transparency</span>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight mt-3 leading-[1.05]">
          Built for when things
          <br />
          <span className="text-muted-foreground">go sideways.</span>
        </h2>
        <p className="mt-5 text-muted-foreground">
          Group trips are messy. Here's how Karije handles the real-world edge cases.
        </p>
      </div>

      <div className="rounded-3xl bg-card ring-hairline overflow-hidden divide-y divide-border">
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="border-0 px-7">
              <AccordionTrigger className="text-left text-[15px] font-medium py-5 hover:no-underline hover:text-primary transition-colors">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-[14px] text-muted-foreground leading-relaxed pb-5">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </div>
  </section>
);
