import { Link } from "react-router-dom";
import { Nav } from "@/components/Nav";
import { Footer } from "@/components/CTA";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-marcellus text-xl text-foreground mb-3">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-muted-foreground text-sm leading-relaxed">{children}</p>;
}

function Ul({ items }: { items: string[] }) {
  return (
    <ul className="text-muted-foreground text-sm space-y-1.5 pl-4 list-disc">
      {items.map((t) => <li key={t}>{t}</li>)}
    </ul>
  );
}

export default function Terms() {
  return (
    <main className="min-h-screen bg-background">
      <Nav />
      <div aria-hidden="true" className="h-[109px]" />

      <div className="mx-auto max-w-2xl px-6 py-16 pb-24">
        <div className="flex items-center gap-4 mb-6">
          <span aria-hidden="true" className="kj-mark" />
          <span className="kj-eyebrow">Legal</span>
        </div>

        <h1 className="font-marcellus text-4xl text-foreground mb-3">Terms of Service</h1>
        <p className="font-jost font-light text-sm text-muted-foreground mb-12">Last updated: October 2026</p>

        <div className="space-y-10 font-jost font-light text-foreground leading-relaxed">

          <Section title="1. Who we are">
            <P>
              Karije is an online travel company. These terms are an agreement between you and Karije about using karije.com and
              about any trip you buy from us. By booking a trip or creating an account, you agree to them.
            </P>
          </Section>

          <Section title="2. Karije sells the trips">
            <P>
              When you book a trip on Karije, you are buying it from Karije. We are the seller: you pay us, your booking is with us,
              and we handle changes, cancellations and refunds.
            </P>
            <P>
              Some trips are delivered by partner travel agencies and other local operators that we contract to run them for us
              (our &quot;suppliers&quot;). The trip page shows who will be running the trip on the day. Your contract is still with
              Karije, and we are responsible to you for providing the trip as described. We pay our suppliers ourselves; you never
              pay a supplier for a trip you bought from us.
            </P>
          </Section>

          <Section title="3. Booking and payment">
            <Ul items={[
              "The price shown on the trip page is the total price per traveller, including anything we tell you about before you pay. If a payment method adds its own fee, we show it before you pay.",
              "You pay Karije by bank transfer to an account number issued for your booking, or by card. Transfer the exact amount shown; a different amount can't be matched to your booking.",
              "Your place is confirmed when we receive your payment and send you a confirmation email. Until then, places aren't held.",
              "Each place is for one named traveller. Give accurate names, email addresses and phone numbers — we use them to confirm your booking and to reach you about the trip.",
              "Some trips let you pay in monthly instalments. If you choose that, the full price must be paid by the date shown on the trip page, or we may cancel the booking under section 4.",
            ]} />
          </Section>

          <Section title="4. Cancelling your booking">
            <Ul items={[
              "If you cancel at least 7 days before the trip starts, we refund what you paid in full.",
              "If you cancel between 7 days and 48 hours before the trip starts, we refund 50% of what you paid.",
              "If you cancel less than 48 hours before the trip starts, or don't turn up, there is no refund — unless we resell your place, in which case we refund what you paid.",
              "A trip page may show different cancellation terms for that trip. If it does, those apply instead.",
              "To cancel, email hello@karije.com from the address you booked with.",
            ]} />
          </Section>

          <Section title="5. If we change or cancel a trip">
            <P>
              We may need to make small changes, such as a different vehicle or a change to the order of activities. If we need to
              make a significant change — to the dates, the destination, or a main part of the trip — or if we have to cancel the
              trip (for example, because a supplier can't run it or not enough people book), we will tell you as soon as we can and
              you can choose a full refund or, where we offer one, an alternative trip.
            </P>
          </Section>

          <Section title="6. Refunds">
            <P>
              Refunds are paid to the bank account or card your payment came from, normally within 10 business days of being
              agreed. We can't send a refund to a different account.
            </P>
          </Section>

          <Section title="7. Your responsibilities on the trip">
            <Ul items={[
              "Arrive on time at the meeting point, with any ID or documents the trip page asks for.",
              "Follow the reasonable instructions of the trip leader and the rules of the places you visit, including safety rules.",
              "Tell us before booking about any health condition or need that could affect your participation.",
              "We may refuse to carry or remove from a trip anyone whose behaviour puts others at risk or seriously disrupts the trip, without a refund.",
            ]} />
          </Section>

          <Section title="8. Planning tools and friend trips">
            <P>
              Karije also offers trip-planning tools: AI-generated plans, and pages where a group of friends can plan a trip
              together. AI plans are suggestions based on the information you give us and on public data. Prices, opening times
              and availability in a plan are estimates, not offers, and you should check them before relying on them.
            </P>
            <P>
              On a trip planned between friends, Karije provides the planning page and any paid features the organiser chooses,
              such as reminders. Unless a trip page says you are buying the trip from Karije, Karije does not sell that trip, does
              not collect the friends&apos; shares and is not responsible for arrangements the group makes with each other or with
              hotels, transport or venues.
            </P>
            <P>
              Fees for planning tools and organiser features are shown before you pay. Once a paid feature has been used, its fee is
              not refundable.
            </P>
          </Section>

          <Section title="9. Agencies using Karije Pro">
            <P>
              Travel agencies can subscribe to Karije Pro for trip-building tools, branded trip pages and bookkeeping. Pro is billed
              monthly; cancelling takes effect at the end of the billing period, with no partial refunds.
            </P>
            <P>
              When an agency&apos;s trip is sold on Karije, the agency is our supplier for that trip under a separate supplier
              agreement. Karije sells the trip to travellers and pays the agency under that agreement. Agencies must be verified by
              us before their trips go on sale, and must keep their business and bank details accurate.
            </P>
          </Section>

          <Section title="10. Our responsibility to you">
            <Ul items={[
              "We are responsible for providing the trips we sell as described, whether we run them ourselves or a supplier runs them for us.",
              "We are not responsible for delays or failures caused by events outside our reasonable control, such as severe weather, road closures, strikes, civil unrest or government action. If such an event stops a trip from going ahead, section 5 applies.",
              "Except where the law says otherwise, our total liability to you for a booking is limited to the price you paid for it.",
              "Nothing in these terms takes away your rights under the Federal Competition and Consumer Protection Act 2018 or any other law that can't be excluded by agreement.",
            ]} />
          </Section>

          <Section title="11. Acceptable use">
            <P>
              Don&apos;t use Karije to break the law, to pay for someone else&apos;s booking to move money, to impersonate anyone, or to
              misuse our AI tools. We check payments for signs of fraud and money laundering, and we may delay, refuse or cancel a
              booking, and close an account, where we have reason to suspect misuse. Where we are required to, we report suspicious
              activity to the authorities.
            </P>
          </Section>

          <Section title="12. Your information">
            <P>
              How we collect and use your personal information is explained in our{" "}
              <Link to="/privacy" className="text-foreground hover:underline">Privacy Policy</Link>.
            </P>
          </Section>

          <Section title="13. Changes to these terms">
            <P>
              We may update these terms. The version that applies to a booking is the one in force when you made it. We will show
              the date of the latest update at the top of this page.
            </P>
          </Section>

          <Section title="14. Complaints and the law that applies">
            <P>
              If something goes wrong, email{" "}
              <a href="mailto:hello@karije.com" className="text-foreground hover:underline">hello@karije.com</a>. We aim to respond
              within 2 business days and to resolve complaints within 14 days. These terms are governed by the laws of the Federal
              Republic of Nigeria, and the courts of Lagos State will deal with any dispute we can&apos;t resolve together.
            </P>
          </Section>

        </div>

        <div className="mt-14 pt-8 border-t border-border flex gap-5 text-xs font-jost font-light text-muted-foreground">
          <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
          <Link to="/"        className="hover:text-foreground transition-colors">← Back to Karije</Link>
        </div>
      </div>

      <Footer />
    </main>
  );
}
