export default function DisclaimerPage() {
  return (
    <article className="prose prose-gray dark:prose-invert max-w-none">
      <h1 className="text-3xl font-bold mb-2">Health &amp; Medical Disclaimer</h1>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">Last updated: February 26, 2026</p>

      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-6 mb-8">
        <h2 className="text-amber-800 dark:text-amber-200 mt-0">Important Notice</h2>
        <p className="text-amber-900 dark:text-amber-100 mb-0">
          <strong>
            Devenira is NOT a medical device, medical application, or healthcare provider.
            The Service does not provide medical advice, diagnosis, or treatment. Always consult with
            a qualified healthcare professional before starting any diet, exercise, or weight management
            program. Never disregard professional medical advice or delay seeking it because of
            information provided by this Service.
          </strong>
        </p>
      </div>

      <section className="mb-8">
        <h2>1. Not Medical Advice</h2>
        <p>
          The information, estimates, analyses, and recommendations provided by Devenira (the
          &ldquo;Service&rdquo;) are for <strong>general informational and educational purposes only</strong>.
          Nothing in this Service should be construed as:
        </p>
        <ul>
          <li>A medical diagnosis or clinical assessment.</li>
          <li>Professional medical advice, nutritional counseling, or dietary prescription.</li>
          <li>A substitute for consultation with a licensed healthcare provider, registered dietitian, certified personal trainer, or other qualified professional.</li>
          <li>A recommendation to start, stop, or modify any medical treatment, medication, or therapeutic regimen.</li>
        </ul>
        <p>
          <strong>If you have or suspect a medical condition, or if you are taking medications, you should
          consult your physician before using this Service or making changes to your diet or exercise routine.</strong>
        </p>
      </section>

      <section className="mb-8">
        <h2>2. AI Estimation Accuracy</h2>
        <p>
          The Service uses artificial intelligence models to generate estimates and analyses. These AI systems
          have inherent limitations:
        </p>

        <h3>2.1 Body Fat Estimation</h3>
        <ul>
          <li>AI-based body fat percentage estimates are <strong>rough approximations</strong> derived from visual analysis of photos. They are NOT equivalent to clinical methods such as DEXA scans, hydrostatic weighing, or skinfold caliper measurements.</li>
          <li>Accuracy varies significantly based on photo quality, lighting, posture, clothing, camera angle, and individual body characteristics.</li>
          <li>Results should NOT be used to diagnose obesity, underweight conditions, eating disorders, or any medical condition.</li>
          <li>Body fat percentile rankings are based on general population data and may not accurately reflect your specific demographic group.</li>
        </ul>

        <h3>2.2 Calorie and Nutritional Estimates</h3>
        <ul>
          <li>Calorie and macronutrient estimates from food photos are <strong>approximations</strong>. Actual values may vary significantly based on portion size, preparation method, ingredients, and other factors not visible in photos.</li>
          <li>TDEE (Total Daily Energy Expenditure) calculations are based on general formulas and may not accurately reflect your individual metabolism.</li>
          <li>Calorie burn estimates for workouts are based on standardized MET values and may not reflect your actual energy expenditure.</li>
          <li>Do not rely solely on these estimates for managing medical conditions such as diabetes, kidney disease, food allergies, or other health conditions that require precise nutritional monitoring.</li>
        </ul>

        <h3>2.3 Body Transformation Previews</h3>
        <ul>
          <li>AI-generated body transformation images are <strong>artistic digital renderings</strong> and do NOT represent guaranteed, expected, or realistic results.</li>
          <li>Actual body changes depend on genetics, adherence to diet and exercise, medical conditions, medications, and many other individual factors.</li>
          <li>These previews should be treated as creative visualizations, not as predictions or promises.</li>
        </ul>

        <h3>2.4 AI Coaching</h3>
        <ul>
          <li>The AI chatbot provides <strong>general fitness and nutrition information</strong> based on publicly available knowledge. It is not a certified personal trainer, dietitian, or medical professional.</li>
          <li>AI responses may contain inaccuracies, outdated information, or advice that is not appropriate for your specific situation.</li>
          <li>Never follow AI coaching advice that contradicts guidance from your healthcare provider.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>3. Health Risks</h2>
        <p>
          Physical exercise and dietary changes carry inherent risks. By using this Service, you acknowledge:
        </p>
        <ul>
          <li><strong>Exercise Risk:</strong> Physical activity involves risk of injury, illness, or death. You should consult a physician before beginning any exercise program, especially if you have a history of heart disease, high blood pressure, or other medical conditions.</li>
          <li><strong>Dietary Risk:</strong> Calorie restriction, fasting, and dietary changes can have adverse health effects, particularly for individuals with diabetes, eating disorders, pregnancy, or other medical conditions.</li>
          <li><strong>Intermittent Fasting:</strong> Fasting protocols are not suitable for everyone. People with diabetes, hypoglycemia, eating disorders, pregnant or breastfeeding women, and those on certain medications should NOT fast without medical supervision.</li>
          <li><strong>Weight Management:</strong> Rapid weight loss or extreme calorie restriction can be dangerous. The Service&apos;s goal projections are mathematical estimates and should not motivate unsafe weight loss practices.</li>
          <li><strong>Allergies and Intolerances:</strong> AI food analysis may fail to identify allergens or ingredients that could cause adverse reactions. If you have food allergies or intolerances, always verify ingredients manually.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>4. Body Image and Mental Health</h2>
        <p>
          We care about your mental well-being. Please be aware that:
        </p>
        <ul>
          <li>Body composition tracking and body transformation previews may trigger or exacerbate body image issues, disordered eating, or related mental health concerns.</li>
          <li>If you are experiencing or have a history of eating disorders (anorexia, bulimia, binge eating disorder), we strongly recommend consulting with a mental health professional before using body-related features of this Service.</li>
          <li>The Service is designed to support healthy lifestyle goals, not to promote unrealistic body standards or unhealthy behaviors.</li>
          <li>If your use of this Service is causing distress, anxiety, or unhealthy behaviors, please discontinue use and seek professional support.</li>
        </ul>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100 mb-0">
            <strong>If you or someone you know is struggling with an eating disorder:</strong><br />
            National Eating Disorders Association (NEDA): 1-800-931-2237<br />
            Crisis Text Line: Text &ldquo;NEDA&rdquo; to 741741
          </p>
        </div>
      </section>

      <section className="mb-8">
        <h2>5. Emergency Situations</h2>
        <p>
          <strong>
            This Service is NOT designed for emergency situations. If you are experiencing a medical emergency,
            call your local emergency services immediately (e.g., 119 in Korea, 911 in the US, 112 in the EU).
          </strong>
        </p>
        <p>
          Do not use the AI chat feature or any other part of this Service as a substitute for emergency
          medical care.
        </p>
      </section>

      <section className="mb-8">
        <h2>6. Individual Results Vary</h2>
        <p>
          Fitness and health outcomes are highly individual. Factors that affect results include but are
          not limited to:
        </p>
        <ul>
          <li>Genetics and body composition.</li>
          <li>Age, sex, and hormonal status.</li>
          <li>Pre-existing medical conditions and medications.</li>
          <li>Consistency and adherence to diet and exercise programs.</li>
          <li>Sleep quality, stress levels, and overall lifestyle.</li>
          <li>Environmental factors.</li>
        </ul>
        <p>
          Any testimonials, success stories, or projected results shown in the Service represent individual
          experiences and are not guarantees of outcomes.
        </p>
      </section>

      <section className="mb-8">
        <h2>7. Third-Party Information</h2>
        <p>
          The Service may reference or incorporate information from third-party sources, including nutritional
          databases, exercise databases, and AI knowledge bases. We do not guarantee the accuracy, completeness,
          or timeliness of third-party information.
        </p>
      </section>

      <section className="mb-8">
        <h2>8. Assumption of Risk</h2>
        <p>
          By using this Service, you expressly acknowledge and agree that:
        </p>
        <ul>
          <li>You use the Service at your own risk.</li>
          <li>You are solely responsible for your health decisions and actions taken based on information from the Service.</li>
          <li>You will consult with qualified healthcare professionals before making significant changes to your diet, exercise routine, or health regimen.</li>
          <li>You will not hold Devenira liable for any health outcomes, injuries, or adverse effects that may result from using the Service.</li>
          <li>You understand that AI-generated content may contain errors and should not be the sole basis for health-related decisions.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2>9. Regulatory Notice</h2>
        <p>
          Devenira has not been evaluated, approved, or certified by any government health agency,
          including but not limited to the U.S. Food and Drug Administration (FDA), the Korean Ministry
          of Food and Drug Safety (MFDS), or equivalent agencies in other jurisdictions. The Service
          is not intended to diagnose, treat, cure, or prevent any disease.
        </p>
      </section>

      <section className="mb-8">
        <h2>10. Contact</h2>
        <p>
          If you have questions or concerns about this Health Disclaimer, please contact us at:
        </p>
        <ul>
          <li>Email: <a href="mailto:legal@devenira.com" className="text-primary hover:underline">legal@devenira.com</a></li>
        </ul>
      </section>

      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-6 mt-12">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
          By using Devenira, you acknowledge that you have read, understood, and agreed to this
          Health &amp; Medical Disclaimer, our{' '}
          <a href="/terms" className="text-primary hover:underline">Terms of Service</a>, and our{' '}
          <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>.
        </p>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-0">
          This disclaimer was last updated on February 26, 2026, and applies to all versions of the Service.
        </p>
      </div>
    </article>
  );
}
