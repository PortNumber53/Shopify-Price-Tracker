const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    body: "By accessing or using Competitor Tracker (\"the Service\"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.",
  },
  {
    title: '2. Description of Service',
    body: "Competitor Tracker is a price monitoring tool that allows users to track publicly available product prices on third-party websites. The Service sends email alerts when price changes are detected.",
  },
  {
    title: '3. User Accounts',
    body: "You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.",
  },
  {
    title: '4. Acceptable Use',
    body: "You agree to use the Service only for lawful purposes. You may not use the Service to scrape data in violation of a website's terms of service in ways that exceed your plan limits, attempt to reverse engineer or compromise the Service, or resell or redistribute the Service without written permission.",
  },
  {
    title: '5. Subscriptions and Billing',
    body: "Paid plans are billed monthly through Stripe. You authorize us to charge your payment method on a recurring basis. Subscription fees are non-refundable except as required by law. You may cancel at any time through the billing portal; cancellation takes effect at the end of your current billing period.",
  },
  {
    title: '6. Free Trial',
    body: "Paid plans may include a free trial period. If you do not cancel before the trial ends, you will be automatically charged the applicable subscription fee.",
  },
  {
    title: '7. Accuracy of Data',
    body: "We make reasonable efforts to accurately detect price changes on tracked URLs. However, we do not guarantee the completeness, accuracy, or timeliness of pricing data. Page structure changes, anti-bot measures, or network issues may affect monitoring reliability.",
  },
  {
    title: '8. Intellectual Property',
    body: "The Service and its original content, features, and functionality are owned by Competitor Tracker and are protected by applicable intellectual property laws. You retain ownership of the URLs and data you submit.",
  },
  {
    title: '9. Limitation of Liability',
    body: "To the maximum extent permitted by law, Competitor Tracker shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of or inability to use the Service, including but not limited to lost profits or business decisions made based on pricing data.",
  },
  {
    title: '10. Termination',
    body: "We reserve the right to suspend or terminate your account at our sole discretion if you violate these Terms. You may terminate your account at any time by canceling your subscription and ceasing use of the Service.",
  },
  {
    title: '11. Changes to Terms',
    body: "We may update these Terms from time to time. We will notify you of material changes via email or a notice on the Service. Continued use of the Service after changes constitutes acceptance of the new Terms.",
  },
  {
    title: '12. Governing Law',
    body: "These Terms are governed by the laws of the jurisdiction in which Competitor Tracker operates, without regard to conflict of law provisions.",
  },
  {
    title: '13. Contact',
    body: "If you have questions about these Terms, please contact us through the support channel provided in your account dashboard.",
  },
];

export default function TermsOfService() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      <section style={{ padding: '5rem 1.5rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>Terms of Service</h1>
          <p style={{ fontSize: '0.9375rem' }}>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </section>

      <section style={{ padding: '4rem 1.5rem 5rem' }}>
        <div style={{ maxWidth: '760px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2.25rem' }}>
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h3 style={{ fontSize: '1.0625rem', marginBottom: '0.625rem', color: 'var(--text-main)' }}>{s.title}</h3>
              <p style={{ margin: 0, fontSize: '0.9375rem', lineHeight: 1.75 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
