import { setRequestLocale } from "next-intl/server";
import Link from "next/link";

/**
 * Public page for Twilio A2P 10DLC reviewers.
 * Documents every SMS opt-in path (web form + verbal) with exact
 * language and the verbal script agents use. Consent is never required
 * to receive a quote or service.
 */
export default function SmsOptInPage({
  params: { locale },
}: {
  params: { locale: string };
}) {
  setRequestLocale(locale);
  const base = `https://www.blancsins.com/${locale}`;

  return (
    <section className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ocean-900">
        SMS / Text Messaging Opt-In
      </h1>
      <p className="mt-2 text-sm text-slate-500">
        Call-to-Action (CTA) and consent documentation for Blanc&apos;s Insurance
        informational messaging program
      </p>

      <div className="mt-10 space-y-10 text-slate-700 leading-relaxed">
        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            Program overview
          </h2>
          <p className="mt-3">
            Blanc&apos;s Insurance sends <strong>informational only</strong> text
            messages about quotes, policies, and accounts (for example: quote
            follow-ups, appointment reminders, policy status updates). We do{" "}
            <strong>not</strong> send marketing or promotional texts under this
            program. Consent is never a condition of receiving a quote or any
            insurance service. Message frequency varies. Message and data rates
            may apply. Reply <strong>STOP</strong> to opt out; reply{" "}
            <strong>HELP</strong> for help. Mobile numbers are not shared with
            third parties or affiliates for marketing or promotional purposes.
          </p>
          <p className="mt-3">
            Privacy Policy:{" "}
            <Link
              href={`/${locale}/privacy`}
              className="text-blancs-blue underline"
            >
              {base}/privacy
            </Link>
            <br />
            Terms of Service:{" "}
            <Link
              href={`/${locale}/terms`}
              className="text-blancs-blue underline"
            >
              {base}/terms
            </Link>
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            Opt-in method 1 — Website form (primary)
          </h2>
          <p className="mt-3">
            End users opt in on the public quote request form at{" "}
            <Link
              href={`/${locale}/contact`}
              className="text-blancs-blue underline font-medium"
            >
              {base}/contact
            </Link>
            .
          </p>
          <ol className="mt-3 list-decimal pl-6 space-y-2">
            <li>
              The user enters first name, last name, policy type, phone number,
              email, and an optional description.
            </li>
            <li>
              Below the form fields there is an{" "}
              <strong>optional checkbox that is unchecked by default</strong>.
              Checking the box is not required to submit the form or to receive
              a quote.
            </li>
            <li>
              The checkbox label reads exactly:
              <blockquote className="mt-2 border-l-4 border-blancs-blue/40 bg-ice-100/80 pl-4 py-3 text-sm text-slate-800">
                Yes, send me informational text messages about my quote, policy,
                and account from Blanc&apos;s Insurance at the phone number
                provided (optional — not required to receive a quote or
                service). Message and data rates may apply. Message frequency
                varies. Reply STOP to opt out, HELP for help.
              </blockquote>
            </li>
            <li>
              Directly under the checkbox appears this disclosure with links to
              our Privacy Policy and Terms of Service:
              <blockquote className="mt-2 border-l-4 border-blancs-blue/40 bg-ice-100/80 pl-4 py-3 text-sm text-slate-800">
                Mobile information and messaging consent will not be shared with
                third parties or affiliates for marketing or promotional
                purposes. See our Privacy Policy and Terms of Service.
              </blockquote>
            </li>
            <li>
              Only users who check the box and submit are recorded as opted in
              for informational SMS. Users who leave the box unchecked still
              receive a quote; they are not enrolled in text messaging.
            </li>
          </ol>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            Opt-in method 2 — Verbal (phone / in-person with agent)
          </h2>
          <p className="mt-3">
            When a customer speaks with a Blanc&apos;s Insurance licensed agent
            by phone or in person, the agent may offer informational text
            messages. Consent is collected only after the required disclosures
            and only if the customer clearly agrees. The agent documents the
            opt-in (date, time, phone number, and that the script was read and
            the customer said yes) in the agency&apos;s CRM. Verbal consent is
            never a condition of receiving a quote or service.
          </p>
          <p className="mt-4 font-medium text-ocean-900">
            Exact verbal script used by agents:
          </p>
          <blockquote className="mt-2 border-l-4 border-blancs-blue/40 bg-ice-100/80 pl-4 py-4 text-sm text-slate-800 space-y-3">
            <p>
              &ldquo;Before we continue, would you like to receive informational
              text messages from Blanc&apos;s Insurance about your quote,
              policy, or account at the phone number you provided?
            </p>
            <p>
              These messages are informational only — for example quote
              follow-ups, appointment reminders, and policy updates. We do not
              send marketing or promotional texts under this program. Message
              frequency varies. Message and data rates may apply.
            </p>
            <p>
              You can opt out at any time by replying STOP to any text. For
              help, reply HELP. Our Privacy Policy is at blancsins.com/privacy
              and our Terms of Service are at blancsins.com/terms. Mobile
              information is not shared with third parties for marketing.
            </p>
            <p>
              Consent is completely optional and is not required to get a quote
              or any service from us. Do you consent to receive informational
              text messages from Blanc&apos;s Insurance at this number? Please
              say yes or no.&rdquo;
            </p>
          </blockquote>
          <p className="mt-3">
            If the customer says <strong>yes</strong>, the agent records the
            opt-in in the CRM and only then may informational texts be sent. If
            the customer says <strong>no</strong> or does not clearly agree, no
            marketing or informational SMS enrollment is created.
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl font-semibold text-ocean-900">
            How to opt out
          </h2>
          <p className="mt-3">
            Reply <strong>STOP</strong> to any message from Blanc&apos;s
            Insurance to cancel. Reply <strong>HELP</strong> for help, or
            contact us at Agency@blancsins.com or (239) 300-3830.
          </p>
        </section>

        <section className="rounded-xl2 border border-ice-100 bg-ice-100/50 p-6">
          <h2 className="font-display text-lg font-semibold text-ocean-900">
            For Twilio / A2P reviewers
          </h2>
          <p className="mt-2 text-sm">
            This page is the public Call-to-Action (CTA) and message-flow
            documentation for campaign registration. Web form opt-in:{" "}
            <Link
              href={`/${locale}/contact`}
              className="text-blancs-blue underline"
            >
              {base}/contact
            </Link>
            . Verbal opt-in uses the script above; consent is documented in the
            agency CRM. Privacy: {base}/privacy. Terms: {base}/terms.
          </p>
        </section>
      </div>
    </section>
  );
}
