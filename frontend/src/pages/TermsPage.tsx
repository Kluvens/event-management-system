export function TermsPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <h1 className="mb-2 text-3xl font-bold">Terms of Service</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated: February 2026</p>

      <div className="prose prose-sm dark:prose-invert max-w-none space-y-6 text-sm leading-relaxed text-foreground/90">
        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
          <p>
            By accessing or using the EventHub platform (&quot;Service&quot;), you agree to be bound by these
            Terms of Service. If you do not agree, you may not use the Service.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">2. User Accounts</h2>
          <p>
            You must provide accurate information when registering. You are responsible for maintaining
            the security of your account and all activity under it. Notify us immediately if you suspect
            unauthorised access.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">3. Events and Bookings</h2>
          <p>
            Event organisers are responsible for the accuracy of their event listings, including dates,
            locations, pricing, and descriptions. EventHub acts as a platform only and is not liable
            for the quality or conduct of events.
          </p>
          <p className="mt-2">
            Bookings are subject to the cancellation policy displayed at the time of booking.
            Refunds for cancellations made within 7 days of the event start time are at the
            organiser&apos;s discretion.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">4. Payments</h2>
          <p>
            All payments are processed securely. Prices are listed in Australian Dollars (AUD) and
            include applicable taxes. EventHub retains a platform fee on each paid booking; the
            remainder is disbursed to the organiser following event completion.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">5. Loyalty Points</h2>
          <p>
            Loyalty points are awarded for confirmed bookings and may be redeemed in the Loyalty Store.
            Points have no cash value, are non-transferable, and may be revoked if obtained through
            fraudulent activity. EventHub reserves the right to modify the loyalty programme at any time.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">6. Prohibited Conduct</h2>
          <ul className="ml-4 mt-2 list-disc space-y-1">
            <li>Creating false or misleading event listings</li>
            <li>Harassing, threatening, or abusing other users</li>
            <li>Attempting to circumvent platform security measures</li>
            <li>Using automated tools to scrape or overload the platform</li>
            <li>Reselling tickets without authorisation</li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">7. Suspension and Termination</h2>
          <p>
            EventHub may suspend or terminate accounts that violate these terms, engage in fraudulent
            activity, or otherwise harm the platform or its users. Suspended users may appeal by
            contacting support.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by law, EventHub is not liable for any indirect, incidental,
            or consequential damages arising from use of the Service, including but not limited to event
            cancellations, no-shows, or payment disputes between attendees and organisers.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">9. Changes to Terms</h2>
          <p>
            We may update these terms from time to time. Continued use of the Service after changes
            are posted constitutes acceptance of the revised terms. We will notify users of material
            changes via email or an in-app announcement.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">10. Governing Law</h2>
          <p>
            These terms are governed by the laws of New South Wales, Australia. Any disputes shall be
            resolved in the courts of New South Wales.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-lg font-semibold text-foreground">Contact</h2>
          <p>
            For questions about these terms, contact us at{' '}
            <span className="font-medium text-amber-600">legal@eventhub.com.au</span>.
          </p>
        </section>
      </div>
    </div>
  )
}
