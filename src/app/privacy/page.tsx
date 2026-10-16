import type { Metadata } from "next";
import { site } from "@/config/site";
import { ContentPage, Section } from "@/components/layout/ContentPage";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: `How ${site.name} collects, uses and protects your personal information under the Protection of Personal Information Act (POPIA).`,
};

const regulator = {
  site: "https://inforegulator.org.za",
  complaints: "POPIAComplaints@inforegulator.org.za",
};

export default function PrivacyPage() {
  return (
    <ContentPage
      title="Privacy policy"
      legal
      intro={`How ${site.legalName} ("we", "us") handles your personal information, in line with the Protection of Personal Information Act, 2013 (POPIA).`}
    >
      <Section title="Who is responsible">
        <p>
          {site.legalName} is the "responsible party" for the personal information collected on this website. Our Information Officer is{" "}
          {site.informationOfficer.name}, reachable at{" "}
          <a className="text-brand-700 underline underline-offset-2" href={`mailto:${site.informationOfficer.email}`}>{site.informationOfficer.email}</a>.
        </p>
      </Section>

      <Section title="What we collect">
        <ul className="list-disc space-y-1 pl-5">
          <li>Account details: your name, email address, phone number (optional) and a password, which we store only in scrambled (hashed) form.</li>
          <li>Delivery details: the recipient's name, contact number and delivery address.</li>
          <li>Order details: what you bought, when, the amount and the payment status.</li>
          <li>Business customers: company and VAT details if you give them to us for tax invoices.</li>
          <li>Technical details: your IP address and basic request information, kept briefly in server logs to run the site and protect it from abuse.</li>
        </ul>
        <p>We do not collect card or bank details. You enter those on our payment provider's page.</p>
      </Section>

      <Section title="Why we use it">
        <ul className="list-disc space-y-1 pl-5">
          <li>To create and secure your account, and to take, deliver and support your orders (needed to perform our contract with you).</li>
          <li>To issue tax invoices and keep the financial records the law requires (a legal obligation).</li>
          <li>To prevent fraud and abuse of the site, such as repeated failed log-ins (our legitimate interest).</li>
          <li>To send you news and offers by email, only if you ticked the box or subscribed (your consent). Order and account emails are not marketing.</li>
        </ul>
        <p>We only use your information for these purposes, and we collect only what we need for them.</p>
      </Section>

      <Section title="Who we share it with">
        <p>We share personal information only with the people who help us serve you, and only what they need:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li><strong>PayFast</strong>, our payment provider, receives your name, email and the order amount so you can pay. It handles your card or bank details itself.</li>
          <li><strong>Delivery partners</strong> receive the recipient's name, contact number and address.</li>
          <li><strong>Sellers</strong> on the marketplace receive the order, delivery details and contact number for the items they supply, so they can fulfil it.</li>
          <li><strong>Email and hosting providers</strong> process information on our behalf to send our emails and run the website and database.</li>
        </ul>
        <p>
          Some of these providers may store information outside South Africa. We only use providers that protect personal information to a standard
          comparable to POPIA. We do not sell your personal information.
        </p>
      </Section>

      <Section title="How long we keep it">
        <p>
          We keep your account information while your account is open. Order and invoice records are kept for at least five years because South African tax
          law requires it. When we no longer need information, we delete it or remove anything that identifies you.
        </p>
      </Section>

      <Section title="How we protect it">
        <p>
          Passwords are hashed, the site uses HTTPS, log-in and password-reset attempts are limited to block guessing, and only authorised staff can open
          the admin area. If personal information is ever accessed without permission, we will tell you and the Information Regulator as POPIA requires.
        </p>
      </Section>

      <Section title="Cookies" id="cookies">
        <p>
          We use only the cookies the site needs to work: one that keeps you logged in, and security cookies that protect forms and log-in. They are
          deleted when you log out or after they expire. We do not use advertising or tracking cookies, and we do not run analytics that follow you
          around the web. A small setting in your browser remembers that you have seen our cookie notice.
        </p>
        <p>You can block cookies in your browser settings, but you will not be able to log in, add to your cart or check out without the essential ones.</p>
      </Section>

      <Section title="Your rights">
        <p>You can ask us to:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>tell you what personal information we hold about you;</li>
          <li>correct it (you can also edit your details in your account);</li>
          <li>delete it, where we are not required to keep it;</li>
          <li>stop using it for marketing. Every marketing email has an unsubscribe link, and you can ask us at any time.</li>
        </ul>
        <p>
          Email <a className="text-brand-700 underline underline-offset-2" href={`mailto:${site.informationOfficer.email}`}>{site.informationOfficer.email}</a>.
          You can withdraw a consent you gave at any time. This does not affect what we did before you withdrew it.
        </p>
      </Section>

      <Section title="Complaints">
        <p>
          If you think we have mishandled your personal information, please tell us first so that we can put it right. You also have the right to complain
          to the Information Regulator (South Africa) at{" "}
          <a className="text-brand-700 underline underline-offset-2" href={`mailto:${regulator.complaints}`}>{regulator.complaints}</a> or{" "}
          <a className="text-brand-700 underline underline-offset-2" href={regulator.site} rel="noopener noreferrer">{regulator.site.replace("https://", "")}</a>.
        </p>
      </Section>

      <Section title="Changes">
        <p>If we change this policy in a way that matters, we will update this page and, where the law requires, tell you.</p>
      </Section>
    </ContentPage>
  );
}
