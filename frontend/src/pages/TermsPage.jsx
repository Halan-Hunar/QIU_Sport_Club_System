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

export default function TermsOfService() {
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
          Terms of Service
        </h1>
        <p className="text-sm text-ink-variant mt-2">Last updated: June 2026</p>
      </header>

      <Section title="1. Acceptance of Terms">
        <p>
          By accessing or using QIU Sports Club (&ldquo;the platform&rdquo;), you agree to be
          bound by these Terms of Service. If you do not agree to these terms, you must
          not access or use the platform.
        </p>
      </Section>

      <Divider />

      <Section title="2. Platform Purpose">
        <p>
          QIU Sports Club is a tournament management and results display platform. It provides
          tools for organising tournaments and presenting brackets, fixtures, standings,
          statistics, and related sporting information. All content displayed on the
          platform is provided for informational purposes only.
        </p>
      </Section>

      <Divider />

      <Section title="3. Visitor Access">
        <p>
          No account is required to view tournaments, matches, standings, or player
          information. All data displayed on the platform is intended to be publicly
          accessible within the platform. By browsing the platform, you acknowledge that
          tournament data is visible to other visitors.
        </p>
      </Section>

      <Divider />

      <Section title="4. Administrator Responsibilities">
        <p>
          Administrators are solely responsible for the accuracy, completeness, and
          appropriateness of any data they enter into the platform, including team names,
          player information, match results, and tournament configurations.
        </p>
        <p>
          Administrators must keep their login credentials confidential and must not share
          their account access with any other person. Administrators are accountable for
          all activity that occurs under their account.
        </p>
      </Section>

      <Divider />

      <Section title="5. Acceptable Use">
        <p>
          You agree not to: (a) attempt to disrupt, disable, overload, or otherwise impair
          the platform; (b) attempt to gain unauthorised access to any portion of the
          platform, related systems, or other users' accounts; (c) probe, scan, or test
          the vulnerability of the platform without prior written permission; or
          (d) perform automated scraping, harvesting, or bulk extraction of data without
          prior written permission.
        </p>
      </Section>

      <Divider />

      <Section title="6. Intellectual Property">
        <p>
          Tournament data, team names, player names, logos, and related sporting content
          belong to their respective owners and are used on the platform for the purpose
          of presenting tournament information. The platform interface, including its
          design, layout, code, and visual presentation, is proprietary to the platform
          operator and may not be copied, modified, or redistributed without permission.
        </p>
      </Section>

      <Divider />

      <Section title="7. Disclaimer of Warranties">
        <p>
          The platform is provided on an &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          basis, without warranties of any kind, whether express or implied. We do not
          guarantee that the platform will be uninterrupted, timely, secure, or error-free,
          nor that the data displayed will be accurate, complete, or current.
        </p>
      </Section>

      <Divider />

      <Section title="8. Limitation of Liability">
        <p>
          To the fullest extent permitted by law, we shall not be liable for any direct,
          indirect, incidental, consequential, special, or exemplary damages arising out of
          or in connection with your use of, or inability to use, the platform, including
          but not limited to loss of data, loss of opportunity, or interruption of service.
        </p>
      </Section>

      <Divider />

      <Section title="9. Changes to Terms">
        <p>
          We reserve the right to modify or update these Terms of Service at any time at
          our sole discretion. Continued use of the platform after any changes constitutes
          acceptance of the revised terms. The &ldquo;Last updated&rdquo; date above
          reflects the most recent revision.
        </p>
      </Section>

      <Divider />

      <Section title="10. Governing Law">
        <p>
          These Terms of Service shall be governed by and construed in accordance with the
          applicable laws of the jurisdiction in which the platform operator resides,
          without regard to its conflict of laws principles.
        </p>
      </Section>
    </motion.div>
  );
}
