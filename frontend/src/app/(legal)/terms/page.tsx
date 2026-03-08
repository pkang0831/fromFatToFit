export default function TermsOfServicePage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 26, 2026</p>

      <section className="mb-8">
        <h2>1. Acceptance of Terms</h2>
        <p>
          By accessing or using the Devenira application and services (collectively, the &ldquo;Service&rdquo;),
          you agree to be bound by these Terms of Service (&ldquo;Terms&rdquo;). If you do not agree to all of these
          Terms, do not use the Service. These Terms constitute a legally binding agreement between you and Devenira
          (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;).
        </p>
      </section>

      <section className="mb-8">
        <h2>2. Eligibility</h2>
        <p>
          You must be at least 18 years of age to use the Service. By using the Service, you represent and warrant
          that you are at least 18 years old and have the legal capacity to enter into these Terms. If you are under 18,
          you may not use the Service under any circumstances.
        </p>
      </section>

      <section className="mb-8">
        <h2>3. Description of Service</h2>
        <p>
          Devenira is an AI-powered fitness and nutrition tracking platform that provides the following features:
        </p>
        <ul>
          <li><strong>Food &amp; Nutrition Tracking:</strong> AI-based food photo analysis, calorie and macronutrient estimation, manual food logging, and dietary recommendations.</li>
          <li><strong>Body Composition Analysis:</strong> AI-estimated body fat percentage, body composition visualization, and transformation previews from uploaded photos.</li>
          <li><strong>Workout Tracking:</strong> Exercise logging, workout planning, and calorie burn estimation.</li>
          <li><strong>Weight Tracking:</strong> Weight logging, goal setting, and progress projections.</li>
          <li><strong>AI Coaching:</strong> AI-powered diet and fitness chatbot for personalized guidance.</li>
          <li><strong>Intermittent Fasting:</strong> Fasting protocol tracking and timer.</li>
        </ul>
        <p>
          <strong>The Service does not provide medical advice, diagnosis, or treatment.</strong> All AI-generated
          estimates, analyses, and recommendations are approximations for informational and educational purposes only.
          Please see our <a href="/disclaimer" className="text-primary hover:underline">Health Disclaimer</a> for
          more details.
        </p>
      </section>

      <section className="mb-8">
        <h2>4. Account Registration</h2>
        <p>
          To use the Service, you must create an account by providing accurate and complete information, including
          your email address, password, and certain profile information (such as age, gender, height, weight,
          and ethnicity). You agree to:
        </p>
        <ul>
          <li>Provide truthful and accurate information during registration and when using the Service.</li>
          <li>Maintain the security of your account credentials and not share them with others.</li>
          <li>Immediately notify us of any unauthorized use of your account.</li>
          <li>Accept responsibility for all activities that occur under your account.</li>
        </ul>
        <p>
          We reserve the right to suspend or terminate your account if any information provided is found to be
          inaccurate, misleading, or in violation of these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2>5. User Content and Body Images</h2>
        <h3>5.1 Content You Provide</h3>
        <p>
          You may upload photos (including body photos, food photos), log personal data (weight, meals, workouts),
          and send messages through the AI chat feature. You retain ownership of all content you submit
          (&ldquo;User Content&rdquo;).
        </p>

        <h3>5.2 License Grant</h3>
        <p>
          By submitting User Content, you grant us a limited, non-exclusive, worldwide, royalty-free license to
          use, process, store, and transmit your User Content solely for the purpose of operating and improving
          the Service. This includes transmitting your photos to third-party AI processing services as described
          in our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>

        <h3>5.3 Sensitive Image Processing</h3>
        <p>
          Body photos uploaded for body composition analysis and transformation previews are processed by
          third-party AI services (including but not limited to OpenAI, Google, Anthropic, and Replicate).
          By uploading body photos, you:
        </p>
        <ul>
          <li>Consent to these images being transmitted to and processed by third-party AI providers.</li>
          <li>Understand that while we take reasonable measures to protect your data, no system is 100% secure.</li>
          <li>Acknowledge that AI-generated body transformation previews are digitally altered images and do not represent guaranteed results.</li>
        </ul>

        <h3>5.4 Content Restrictions</h3>
        <p>You agree not to upload or submit content that:</p>
        <ul>
          <li>Contains nudity or sexually explicit material.</li>
          <li>Depicts minors.</li>
          <li>Infringes on the intellectual property or privacy rights of others.</li>
          <li>Is unlawful, harmful, threatening, abusive, or otherwise objectionable.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>6. AI-Generated Content</h2>
        <p>
          The Service uses artificial intelligence to generate estimates, analyses, recommendations, and visual
          content. You acknowledge and agree that:
        </p>
        <ul>
          <li>All AI-generated content (including body fat estimates, calorie counts, nutritional analysis, workout recommendations, and body transformation previews) is approximate and may contain errors or inaccuracies.</li>
          <li>AI-generated body transformation images are artistic renderings and do not guarantee actual results.</li>
          <li>AI coaching responses are generated by machine learning models and should not be relied upon as professional medical, nutritional, or fitness advice.</li>
          <li>We do not guarantee the accuracy, completeness, or reliability of any AI-generated content.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>7. Subscriptions and Payments</h2>
        <h3>7.1 Free and Premium Plans</h3>
        <p>
          The Service offers a free tier with limited features and a Premium subscription with enhanced capabilities.
          Credit packs may also be purchased for specific features.
        </p>

        <h3>7.2 Billing</h3>
        <p>
          Premium subscriptions are billed on a recurring basis (monthly or annually) through Stripe (web) or
          through the Apple App Store / Google Play Store via RevenueCat (mobile). All payments are processed
          by these third-party payment providers; we do not directly store your credit card or payment
          information.
        </p>

        <h3>7.3 Cancellation and Refunds</h3>
        <p>
          You may cancel your subscription at any time. Upon cancellation, you will retain access to Premium
          features until the end of your current billing period. Refunds are subject to the policies of the
          respective payment platform (Stripe, Apple App Store, or Google Play Store). Credit pack purchases
          are non-refundable once credits have been used.
        </p>

        <h3>7.4 Price Changes</h3>
        <p>
          We reserve the right to modify subscription prices. You will be notified of any price changes before
          they take effect, and continued use of the Service after the change constitutes acceptance.
        </p>
      </section>

      <section className="mb-8">
        <h2>8. Prohibited Conduct</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any illegal purpose or in violation of any applicable laws or regulations.</li>
          <li>Attempt to reverse-engineer, decompile, or disassemble the Service.</li>
          <li>Use automated systems (bots, scrapers) to access or interact with the Service.</li>
          <li>Attempt to gain unauthorized access to other users&apos; accounts or data.</li>
          <li>Interfere with or disrupt the Service or its underlying infrastructure.</li>
          <li>Circumvent usage limits, credit systems, or access restrictions.</li>
          <li>Use the Service to generate misleading or fraudulent health claims.</li>
          <li>Upload content that belongs to someone else without their permission.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>9. Intellectual Property</h2>
        <p>
          The Service, including its design, features, code, AI models, and content (excluding User Content),
          is owned by Devenira and protected by intellectual property laws. You are granted a limited,
          non-exclusive, non-transferable license to use the Service for personal, non-commercial purposes
          in accordance with these Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2>10. Limitation of Liability</h2>
        <p>
          <strong>TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:</strong>
        </p>
        <ul>
          <li>The Service is provided &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; without warranties of any kind, whether express or implied.</li>
          <li>We disclaim all warranties, including but not limited to implied warranties of merchantability, fitness for a particular purpose, and non-infringement.</li>
          <li>We shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of the Service.</li>
          <li>Our total liability for any claim arising under these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.</li>
          <li>We are not liable for any health outcomes, injuries, or adverse effects resulting from reliance on AI-generated estimates, recommendations, or content provided by the Service.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>11. Indemnification</h2>
        <p>
          You agree to indemnify, defend, and hold harmless Devenira, its officers, directors, employees,
          and agents from and against any claims, liabilities, damages, losses, and expenses (including
          reasonable attorneys&apos; fees) arising out of or related to your use of the Service, your violation
          of these Terms, or your violation of any rights of a third party.
        </p>
      </section>

      <section className="mb-8">
        <h2>12. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service at any time, with or without cause, with or
          without notice. Upon termination, your right to use the Service ceases immediately. You may request
          deletion of your account and associated data by contacting us. Provisions that by their nature should
          survive termination (including but not limited to limitation of liability and indemnification) shall
          survive.
        </p>
      </section>

      <section className="mb-8">
        <h2>13. Changes to Terms</h2>
        <p>
          We may update these Terms from time to time. We will notify you of material changes by posting the
          updated Terms on the Service and updating the &ldquo;Last updated&rdquo; date. Your continued use of
          the Service after any changes constitutes your acceptance of the revised Terms.
        </p>
      </section>

      <section className="mb-8">
        <h2>14. Governing Law and Dispute Resolution</h2>
        <p>
          These Terms shall be governed by and construed in accordance with the laws of the Republic of Korea,
          without regard to its conflict of law provisions. Any dispute arising out of or relating to these
          Terms shall be resolved through binding arbitration in Seoul, Republic of Korea, except that either
          party may seek injunctive relief in a court of competent jurisdiction.
        </p>
      </section>

      <section className="mb-8">
        <h2>15. Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at:
        </p>
        <ul>
          <li>Email: <a href="mailto:legal@devenira.com" className="text-primary hover:underline">legal@devenira.com</a></li>
        </ul>
      </section>
    </article>
  );
}
