import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

function Section({ title, children }) {
  return (
    <section>
      <h2 className="font-display text-headline-md text-ink mb-2">{title}</h2>
      <div className="text-ink-variant leading-relaxed space-y-3">{children}</div>
    </section>
  );
}

const Divider = () => (
  <div className="border-t border-outline-variant/30 my-6" aria-hidden />
);

export default function PrivacyPolicy() {
  return (
    <motion.div
      className="max-w-[1280px] mx-auto px-6 py-12"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-ink-variant
                   hover:text-primary transition-colors mb-6"
      >
        <ArrowLeft size={16} strokeWidth={2} aria-hidden />
        Back
      </Link>

      <header className="mb-8">
        <h1 className="font-display text-display-lg text-ink leading-tight">
          Privacy Policy
        </h1>
        <p className="text-sm text-ink-variant mt-2">Last updated: June 2026</p>
      </header>

      <Section title="1. Introduction">
        <p>
          Sport Club is a sports tournament management platform that allows visitors to
          browse tournaments, teams, players, match results, and statistics. This Privacy
          Policy describes what limited information the platform processes, how it is used,
          and the choices available to users. By using the platform, you acknowledge the
          practices described below.
        </p>
      </Section>

      <Divider />

      <Section title="2. Information We Collect">
        <p>
          <strong className="text-ink">Visitors.</strong> No personal data is collected from
          visitors. No account is required to view tournaments, matches, standings, or
          player information.
        </p>
        <p>
          <strong className="text-ink">Administrators.</strong> Administrators sign in using
          an email address and password. Authentication credentials are stored and processed
          securely by Supabase Auth, our third-party authentication provider. We do not
          store passwords directly on our own servers.
        </p>
        <p>
          <strong className="text-ink">Automatically collected.</strong> Like most web
          services, we maintain standard server logs that include information such as IP
          addresses, browser type, request paths, and timestamps. These logs exist solely
          to operate the platform and to detect or investigate security incidents. They
          are not sold, traded, or shared with third parties for marketing purposes.
        </p>
      </Section>

      <Divider />

      <Section title="3. How We Use Information">
        <p>
          The limited information we process is used only to operate the platform:
          authenticating administrators, displaying tournament and match data to visitors,
          and securing the service against abuse. We do not run advertising, build user
          profiles, perform behavioural tracking, or share information with marketing
          partners.
        </p>
      </Section>

      <Divider />

      <Section title="4. Cookies & Local Storage">
        <p>
          The platform uses browser <code>localStorage</code> to maintain administrator
          login sessions between visits, and to remember a visitor's acknowledgement of
          this policy. We do not use tracking cookies, advertising cookies, analytics
          cookies, or any third-party tags for behavioural targeting.
        </p>
      </Section>

      <Divider />

      <Section title="5. Data Retention">
        <p>
          Administrator accounts and tournament data are retained for the duration of the
          platform's operation, so that historical results, standings, and statistics
          remain accessible. Visitors leave no persistent data on the platform beyond the
          consent acknowledgement stored locally in their own browser.
        </p>
      </Section>

      <Divider />

      <Section title="6. Third-Party Services">
        <p>
          We use Supabase (
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="text-primary underline"
          >
            supabase.com
          </a>
          ) to provide our database and authentication infrastructure. Data processed by
          Supabase on our behalf is also subject to their privacy policy and security
          practices. We do not transmit personal information to any other third parties.
        </p>
      </Section>

      <Divider />

      <Section title="7. Your Rights">
        <p>
          Administrators may request deletion of their account at any time by contacting
          the platform administrator directly. Visitors, having shared no personal data,
          have nothing to request — clearing browser storage removes the consent
          acknowledgement.
        </p>
      </Section>

      <Divider />

      <Section title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our
          practices or applicable requirements. Continued use of the platform after such
          updates constitutes acceptance of the revised policy. Material changes will be
          reflected in the &ldquo;Last updated&rdquo; date at the top of this page.
        </p>
      </Section>

      <Divider />

      <Section title="9. Contact">
        <p>
          For any questions, concerns, or requests relating to this Privacy Policy or your
          information, please contact the platform administrator directly.
        </p>
      </Section>
    </motion.div>
  );
}
