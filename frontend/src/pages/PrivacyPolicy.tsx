const SECTIONS = [
  {
    title: '1. Information We Collect',
    body: "We collect information you provide directly: your email address and password when you create an account, payment information processed securely by Stripe (we do not store card details), and the product URLs you submit for tracking.",
  },
  {
    title: '2. How We Use Your Information',
    body: "We use your information to provide and operate the Service (monitoring URLs, sending price alerts), process payments through Stripe, send transactional emails such as price change notifications and account alerts, and improve the reliability and performance of the Service.",
  },
  {
    title: '3. Data We Do Not Collect',
    body: "We do not collect browsing history, device fingerprints, or any personal information beyond what is necessary to operate the Service. We do not use tracking pixels or third-party advertising cookies.",
  },
  {
    title: '4. Data Storage and Security',
    body: "Your data is stored in a secured database. We use industry-standard security practices including encrypted connections (HTTPS) and hashed passwords. While we take reasonable precautions, no system is completely secure and we cannot guarantee absolute security.",
  },
  {
    title: '5. Data Sharing',
    body: "We do not sell, rent, or share your personal data with third parties for marketing purposes. We share data only with service providers necessary to operate the Service (such as Stripe for payments and email providers for alerts), and only to the extent required to deliver those services.",
  },
  {
    title: '6. Stripe Payments',
    body: "Payment processing is handled by Stripe, Inc. When you subscribe, you interact directly with Stripe's secure checkout. We receive only subscription status and a customer reference — never your raw card details. Stripe's privacy policy applies to data you provide during checkout.",
  },
  {
    title: '7. Email Communications',
    body: "We send emails for: account confirmation, price change alerts, billing receipts, and important service notices. You can opt out of non-essential communications through your account settings. You cannot opt out of transactional emails that are required to deliver the Service.",
  },
  {
    title: '8. Data Retention',
    body: "We retain your account data for as long as your account is active. If you delete your account, we will remove your personal data within 30 days, except where we are required by law to retain it longer.",
  },
  {
    title: '9. Your Rights',
    body: "Depending on your jurisdiction, you may have the right to access, correct, or delete your personal data, request a copy of your data in a portable format, and withdraw consent where processing is based on consent. To exercise these rights, contact us through the support channel in your account.",
  },
  {
    title: '10. Cookies',
    body: "We use only essential session cookies required to keep you logged in. We do not use analytics, advertising, or third-party tracking cookies.",
  },
  {
    title: '11. Children',
    body: "The Service is not directed to children under the age of 13. We do not knowingly collect personal information from children.",
  },
  {
    title: '12. Changes to This Policy',
    body: "We may update this Privacy Policy periodically. We will notify you of material changes via email. Continued use of the Service after changes are posted constitutes acceptance of the updated policy.",
  },
  {
    title: '13. Contact',
    body: "If you have questions or concerns about this Privacy Policy or how we handle your data, please contact us through the support channel provided in your account dashboard.",
  },
];

export default function PrivacyPolicy() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>

      <section style={{ padding: '5rem 1.5rem 4rem', textAlign: 'center', borderBottom: '1px solid var(--border-light)', background: 'var(--bg-card)' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h1 style={{ fontSize: 'clamp(1.75rem, 4vw, 2.5rem)', marginBottom: '0.75rem' }}>Privacy Policy</h1>
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
