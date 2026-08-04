export default function Privacy() {
  return (
    <div className="bg-white min-h-screen py-16 px-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Privacy Policy</h1>
        <div className="text-gray-700 space-y-6">
          <p className="text-sm text-gray-500">Last updated: August 4, 2026</p>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">1. Overview</h2>
            <p>
              Less Token ("we," "us," "our," or "Company") operates the Less Token browser extension and website. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our products.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">2. Information We Collect</h2>

            <h3 className="text-xl font-semibold mb-2 mt-4">Browser Extension Usage:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>API Keys:</strong> Stored locally in your browser only. Never sent to our servers.</li>
              <li><strong>Optimization History:</strong> Stored locally in your browser's storage. Never sent to our servers.</li>
              <li><strong>Text You Optimize:</strong> Sent directly to your chosen AI provider (OpenAI, Anthropic, Google, or local Ollama). Never sent to Less Token servers.</li>
            </ul>

            <h3 className="text-xl font-semibold mb-2 mt-4">Website Usage:</h3>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Usage Data:</strong> We do not use analytics or tracking cookies.</li>
              <li><strong>Web Tools:</strong> Text optimized via /text, /image, /file tools stays in your browser only.</li>
              <li><strong>Contact Form:</strong> Email submissions are received at info@lesstoken.app.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Process your optimization requests through your chosen AI provider</li>
              <li>Respond to support emails sent to info@lesstoken.app</li>
              <li>Improve our products based on feedback</li>
              <li><strong>We do NOT:</strong> Sell, rent, or share personal data with third parties</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">4. Data Storage & Retention</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Browser Extension:</strong> All data stored locally on your device. No cloud storage.</li>
              <li><strong>Web Tools:</strong> No data stored on our servers. Text is not saved.</li>
              <li><strong>Account-based Dashboard:</strong> If you use the legacy account dashboard, optimization history is stored in our database for the history feature.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">5. API Provider Information</h2>
            <p>When you optimize text, it is sent directly to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>OpenAI:</strong> Governed by OpenAI's privacy policy</li>
              <li><strong>Anthropic (Claude):</strong> Governed by Anthropic's privacy policy</li>
              <li><strong>Google (Gemini):</strong> Governed by Google's privacy policy</li>
              <li><strong>Ollama (local):</strong> Runs on your machine, no external calls</li>
            </ul>
            <p className="mt-3">Your API keys are YOUR responsibility. We never access them.</p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">6. Security</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>API keys are stored locally in your browser, not on our servers</li>
              <li>All communications with AI providers use HTTPS encryption</li>
              <li>No tracking or analytics scripts on our website</li>
              <li>Source code is open source (inspect on GitHub)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">7. Children's Privacy</h2>
            <p>
              Our products are not directed to children under 13. We do not knowingly collect information from children under 13. If we learn we have collected personal information from a child under 13, we will delete such information immediately.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">8. Third-Party Links</h2>
            <p>
              Our website may contain links to third-party websites. We are not responsible for the privacy practices of external sites. Please review their privacy policies before providing information.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">9. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="list-disc pl-6 space-y-2">
              <li>Access your data stored locally in the extension</li>
              <li>Delete your local history anytime (built into the extension)</li>
              <li>Withdraw consent for any optional data collection</li>
              <li>Request information about data collected</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">10. Changes to This Policy</h2>
            <p>
              We may update this privacy policy from time to time. We will notify you of any significant changes by posting the new policy on this page and updating the "Last updated" date.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">11. Contact Us</h2>
            <p>
              If you have questions about this privacy policy or our privacy practices, please contact us:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li><strong>Email:</strong> info@lesstoken.app</li>
              <li><strong>Website:</strong> https://lesstoken.app</li>
              <li><strong>GitHub:</strong> https://github.com/LessTokenApp</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold mb-3 mt-8">12. GDPR & Data Protection</h2>
            <p>
              If you are a resident of the European Union or other jurisdiction with data protection laws, the following applies:
            </p>
            <ul className="list-disc pl-6 space-y-2">
              <li>We process minimal data and store it locally on your device</li>
              <li>You have the right to access, correct, or delete your data</li>
              <li>You can request a copy of your data at any time</li>
              <li>We do not use profiling or automated decision-making</li>
            </ul>
          </section>

          <div className="mt-12 pt-8 border-t text-sm text-gray-600">
            <p>© 2026 Less Token. All rights reserved. Privacy-first AI optimization.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
