export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 26, 2026</p>

      <section className="mb-8">
        <h2>1. Introduction</h2>
        <p>
          Devenira (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;) is committed to protecting your
          privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information
          when you use the Devenira application and services (the &ldquo;Service&rdquo;).
        </p>
        <p>
          <strong>
            Given the sensitive nature of health and body-related data we process, we take extra care to handle
            your information responsibly. Please read this policy carefully.
          </strong>
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Information We Collect</h2>

        <h3>2.1 Information You Provide Directly</h3>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Category</th>
              <th className="text-left">Data Types</th>
              <th className="text-left">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>Account Information</strong></td>
              <td>Email address, password (hashed), full name</td>
              <td>Authentication and account management</td>
            </tr>
            <tr>
              <td><strong>Physical Profile</strong></td>
              <td>Age, gender, height, weight, ethnicity, activity level</td>
              <td>Personalized calorie calculations, body fat estimation accuracy, and fitness recommendations</td>
            </tr>
            <tr>
              <td><strong>Body Images</strong></td>
              <td>Photos uploaded for body composition analysis and transformation previews</td>
              <td>AI-powered body fat estimation and visualization</td>
            </tr>
            <tr>
              <td><strong>Food Data</strong></td>
              <td>Food photos, meal logs, dietary preferences, allergies</td>
              <td>Nutrition tracking and AI food analysis</td>
            </tr>
            <tr>
              <td><strong>Fitness Data</strong></td>
              <td>Workout logs, exercise history, weight logs</td>
              <td>Workout and progress tracking</td>
            </tr>
            <tr>
              <td><strong>Chat Messages</strong></td>
              <td>Messages sent to the AI coaching feature</td>
              <td>Providing AI-powered fitness and nutrition guidance</td>
            </tr>
            <tr>
              <td><strong>Goals</strong></td>
              <td>Target weight, target body fat, daily calorie goal</td>
              <td>Progress tracking and personalized recommendations</td>
            </tr>
            <tr>
              <td><strong>Payment Information</strong></td>
              <td>Payment method details (processed by Stripe/Apple/Google)</td>
              <td>Subscription and credit pack purchases</td>
            </tr>
          </tbody>
        </table>

        <h3>2.2 Information Collected Automatically</h3>
        <ul>
          <li><strong>Usage Data:</strong> Feature usage frequency, session duration, pages visited.</li>
          <li><strong>Device Information:</strong> Browser type, operating system, device type.</li>
          <li><strong>Log Data:</strong> IP address, access times, error logs.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>3. How We Use Your Information</h2>
        <p>We use your information for the following purposes:</p>
        <ul>
          <li><strong>Service Operation:</strong> To provide, maintain, and improve the Service, including AI-powered analyses and recommendations.</li>
          <li><strong>Personalization:</strong> To customize your experience based on your physical profile, goals, and preferences.</li>
          <li><strong>AI Processing:</strong> To transmit your data (including photos) to AI services for analysis — see Section 4 for details.</li>
          <li><strong>Communication:</strong> To send you service-related notifications, updates, and promotional materials (with your consent).</li>
          <li><strong>Payment Processing:</strong> To process subscriptions and purchases through third-party payment providers.</li>
          <li><strong>Safety &amp; Security:</strong> To detect and prevent fraud, abuse, and security incidents.</li>
          <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, and legal processes.</li>
        </ul>
        <p>
          <strong>We do NOT:</strong>
        </p>
        <ul>
          <li>Sell your personal data to third parties.</li>
          <li>Use your body images for advertising or marketing purposes.</li>
          <li>Use your data for purposes unrelated to the Service without your consent.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>4. Third-Party AI Services and Data Sharing</h2>
        <p>
          <strong>This is particularly important.</strong> To provide AI-powered features, we transmit certain data
          to third-party AI service providers. Here is what gets shared with whom:
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="text-left">Provider</th>
              <th className="text-left">Data Shared</th>
              <th className="text-left">Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>OpenAI</strong></td>
              <td>Food photos, body photos, chat messages, profile context</td>
              <td>Food analysis, body fat estimation, AI coaching, body enhancement</td>
            </tr>
            <tr>
              <td><strong>Google (Gemini)</strong></td>
              <td>Food photos, body photos, profile context</td>
              <td>Food analysis, body fat estimation (free tier)</td>
            </tr>
            <tr>
              <td><strong>Anthropic (Claude)</strong></td>
              <td>Food photos, body photos, profile context</td>
              <td>Food analysis, body fat estimation (premium tier)</td>
            </tr>
            <tr>
              <td><strong>Replicate</strong></td>
              <td>Body photos</td>
              <td>Body transformation previews, body part segmentation</td>
            </tr>
            <tr>
              <td><strong>Supabase</strong></td>
              <td>All user data</td>
              <td>Database hosting, authentication, file storage</td>
            </tr>
            <tr>
              <td><strong>Stripe</strong></td>
              <td>Payment method, email, subscription details</td>
              <td>Payment processing (web)</td>
            </tr>
            <tr>
              <td><strong>RevenueCat</strong></td>
              <td>User ID, purchase receipts</td>
              <td>In-app purchase management (mobile)</td>
            </tr>
          </tbody>
        </table>
        <p>
          Each of these providers has their own privacy policies and data processing terms. We encourage you to
          review their respective privacy policies. We select providers that maintain industry-standard security
          practices, but we cannot guarantee the security of data once transmitted to third parties.
        </p>
      </section>

      <section className="mb-8">
        <h2>5. Body Image Data — Special Provisions</h2>
        <p>
          We recognize that body images are especially sensitive. The following additional protections apply:
        </p>
        <ul>
          <li><strong>Purpose Limitation:</strong> Body images are used exclusively for the specific feature you request (body fat analysis, transformation preview, etc.) and are not used for any other purpose.</li>
          <li><strong>AI Processing:</strong> Images are transmitted to AI providers via encrypted connections (HTTPS/TLS). We do not control how long third-party AI providers retain submitted data — please refer to their respective data retention policies.</li>
          <li><strong>Storage:</strong> Original images may be stored in our secure cloud storage (Supabase) linked to your account. You may request deletion at any time.</li>
          <li><strong>No Human Review:</strong> Under normal operations, your body images are processed only by automated AI systems. Human review may occur only in cases of abuse investigation or legal requirement.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. Data Retention</h2>
        <ul>
          <li><strong>Active Account:</strong> Your data is retained as long as your account is active.</li>
          <li><strong>Account Deletion:</strong> Upon account deletion request, we will delete your personal data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., billing records).</li>
          <li><strong>AI Provider Retention:</strong> Data transmitted to third-party AI providers is subject to their respective retention policies. We are unable to guarantee deletion from third-party systems.</li>
          <li><strong>Backups:</strong> Deleted data may persist in encrypted backups for up to 90 days before being permanently removed.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>7. Data Security</h2>
        <p>We implement industry-standard security measures including:</p>
        <ul>
          <li>Encryption in transit (TLS/HTTPS) and at rest.</li>
          <li>Row-Level Security (RLS) on database to ensure users can only access their own data.</li>
          <li>Secure authentication with hashed passwords.</li>
          <li>Regular security assessments and updates.</li>
        </ul>
        <p>
          Despite these measures, no method of transmission or storage is 100% secure. We cannot guarantee
          absolute security of your data.
        </p>
      </section>

      <section className="mb-8">
        <h2>8. Your Rights</h2>
        <p>
          Depending on your jurisdiction, you may have the following rights regarding your personal data:
        </p>
        <ul>
          <li><strong>Access:</strong> Request a copy of your personal data.</li>
          <li><strong>Correction:</strong> Request correction of inaccurate or incomplete data.</li>
          <li><strong>Deletion:</strong> Request deletion of your personal data (&ldquo;right to be forgotten&rdquo;).</li>
          <li><strong>Portability:</strong> Request your data in a structured, machine-readable format.</li>
          <li><strong>Restriction:</strong> Request restriction of processing of your data.</li>
          <li><strong>Objection:</strong> Object to processing of your data for certain purposes.</li>
          <li><strong>Withdrawal of Consent:</strong> Withdraw consent at any time where processing is based on consent.</li>
        </ul>
        <p>
          To exercise any of these rights, please contact us at{' '}
          <a href="mailto:privacy@devenira.com" className="text-primary hover:underline">privacy@devenira.com</a>.
          We will respond within 30 days.
        </p>
      </section>

      <section className="mb-8">
        <h2>9. International Data Transfers</h2>
        <p>
          Your data may be transferred to and processed in countries other than your country of residence,
          including the United States (where many of our AI service providers are based). These countries
          may have different data protection laws. By using the Service, you consent to such transfers.
          We ensure appropriate safeguards are in place through contractual obligations with our service
          providers.
        </p>
      </section>

      <section className="mb-8">
        <h2>10. Children&apos;s Privacy</h2>
        <p>
          The Service is not intended for individuals under 18 years of age. We do not knowingly collect
          personal information from children under 18. If we become aware that we have collected data from
          a child under 18, we will take steps to delete such information promptly. If you believe a child
          has provided us with personal data, please contact us immediately.
        </p>
      </section>

      <section className="mb-8">
        <h2>11. Cookies and Tracking</h2>
        <p>We use essential cookies and local storage for:</p>
        <ul>
          <li>Authentication session management.</li>
          <li>Theme preference (dark/light mode).</li>
          <li>Onboarding state tracking.</li>
        </ul>
        <p>
          We do not currently use third-party advertising cookies or tracking pixels.
        </p>
      </section>

      <section className="mb-8">
        <h2>12. Data Breach Notification</h2>
        <p>
          In the event of a data breach that affects your personal data, we will:
        </p>
        <ul>
          <li>Notify the relevant supervisory authority within <strong>72 hours</strong> of becoming aware of the breach, as required by applicable law (GDPR, Korea PIPA).</li>
          <li>Notify affected users <strong>without undue delay</strong> if the breach is likely to result in a high risk to their rights and freedoms.</li>
          <li>Provide details of the breach, including the nature of the data affected, the approximate number of individuals concerned, and the measures taken or proposed to address the breach.</li>
          <li>Document all breaches internally, including their effects and the remedial action taken.</li>
        </ul>
        <p>
          Notifications will be sent via the email address associated with your account.
        </p>
      </section>

      <section className="mb-8">
        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. We will notify you of significant changes by
          posting the updated policy on the Service and updating the &ldquo;Last updated&rdquo; date. Your
          continued use of the Service after changes constitutes acceptance of the revised policy.
        </p>
      </section>

      <section className="mb-8">
        <h2>14. Contact Us</h2>
        <p>For privacy-related inquiries, requests, or complaints:</p>
        <ul>
          <li>Email: <a href="mailto:privacy@devenira.com" className="text-primary hover:underline">privacy@devenira.com</a></li>
        </ul>
      </section>
    </article>
  );
}
