export function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Information We Collect</h2>
          <p>We collect the following categories of information:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li><strong>Account data:</strong> name, email address, and profile information you provide</li>
            <li><strong>Booking data:</strong> events booked, payment history, check-in records</li>
            <li><strong>Usage data:</strong> pages visited, search queries, feature interactions</li>
            <li><strong>Device data:</strong> IP address, browser type, operating system</li>
            <li><strong>Social connections:</strong> if you connect X or Instagram, we store your handle only — we do not access your posts or followers</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Providing and improving the EventHub service</li>
            <li>Processing bookings and payments</li>
            <li>Sending booking confirmations, event reminders, and important notifications</li>
            <li>Calculating and awarding loyalty points</li>
            <li>Detecting and preventing fraud or abuse</li>
            <li>Complying with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Sharing Your Information</h2>
          <p>We do not sell your personal data. We share data only with:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li><strong>Event organisers:</strong> your name and email are shared when you book their event, so they can manage attendance</li>
            <li><strong>Payment processors:</strong> to complete transactions securely</li>
            <li><strong>Infrastructure providers:</strong> cloud hosting and storage (AWS)</li>
            <li><strong>Legal authorities:</strong> where required by law</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Data Retention</h2>
          <p>
            We retain your account data for as long as your account is active. Booking records are
            retained for 7 years for financial compliance. You may request deletion of your account
            at any time; this will anonymise your booking history rather than permanently delete it,
            to preserve organiser records.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Cookies</h2>
          <p>
            EventHub uses essential cookies for authentication (session tokens) and preference storage
            (dark mode). We do not use third-party advertising cookies. You can disable cookies in your
            browser settings, but this may prevent you from logging in.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Security</h2>
          <p>
            We use industry-standard measures to protect your data, including TLS encryption in transit,
            hashed credentials, and role-based access controls. Passwords are managed by AWS Cognito
            and are never stored by EventHub directly.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">7. Your Rights</h2>
          <p>Under Australian Privacy Law (Privacy Act 1988) you have the right to:</p>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate information</li>
            <li>Request deletion of your account</li>
            <li>Opt out of non-essential communications</li>
          </ul>
          <p className="mt-2">
            To exercise these rights, contact us at{' '}
            <span className="font-medium text-amber-600">privacy@eventhub.com.au</span>.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">8. Children</h2>
          <p>
            EventHub is not directed at children under 13. We do not knowingly collect data from
            children. If you believe a child has created an account, please contact us for removal.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">9. Changes to This Policy</h2>
          <p>
            We may update this policy periodically. We will notify you of significant changes via
            email or an in-app announcement. Continued use of the Service constitutes acceptance
            of the revised policy.
          </p>
        </section>
      </div>
    </div>
  )
}
