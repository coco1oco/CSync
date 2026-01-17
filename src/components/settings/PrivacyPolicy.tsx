import { Shield, Lock, Eye, FileText, Mail } from "lucide-react";

export function PrivacyPolicy() {
  const currentDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="space-y-2 border-b border-gray-100 pb-4">
        <h2 className="text-2xl font-black text-blue-950 flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Privacy Policy
        </h2>
        <p className="text-sm text-gray-500 font-medium">
          Last Updated: {currentDate}
        </p>
      </div>

      {/* Content Section */}
      <div className="prose prose-blue prose-sm text-gray-600 max-w-none space-y-8 pb-10">
        {/* Intro */}
        <p className="leading-relaxed text-gray-600">
          At <strong className="text-blue-900">PawPal</strong>, we prioritize
          the protection of your personal data. We are committed to maintaining
          the trust and confidence of our users. This Privacy Policy outlines
          the types of information we collect, how we use it, and the measures
          we take to safeguard your data while you use our digital pet identity
          services.
        </p>

        {/* Section 1: Information Collection */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-400" />
            1. Information We Collect
          </h3>
          <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
            <li>
              <strong className="text-gray-900">Account Information:</strong>{" "}
              When you register, we collect personal details such as your name,
              email address (@cvsu.edu.ph), and contact number.
            </li>
            <li>
              <strong className="text-gray-900">Pet Data:</strong> We collect
              information about your pets, including names, breeds, vaccination
              records, medical history, and photos.
            </li>
            <li>
              <strong className="text-gray-900">Usage Data:</strong> We may
              collect information on how you access and use the app, including
              device type and interaction logs.
            </li>
          </ul>
        </section>

        {/* Section 2: How We Use Data */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Eye className="h-5 w-5 text-gray-400" />
            2. How We Use Your Information
          </h3>
          <p>We use your data for the following purposes:</p>
          <ul className="list-disc pl-5 space-y-2 marker:text-blue-500">
            <li>To provide and maintain the PawPal service.</li>
            <li>To verify your identity as a member of the CvSU community.</li>
            <li>
              To manage your pet's health records and vaccination schedules.
            </li>
            <li>
              To notify you about important updates, such as upcoming
              vaccination dates or events.
            </li>
          </ul>
        </section>

        {/* Section 3: Data Security */}
        <section className="space-y-3">
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Lock className="h-5 w-5 text-gray-400" />
            3. Data Security
          </h3>
          <p>
            We implement industry-standard security measures, including
            encryption and secure server storage (Supabase & Firebase), to
            protect your personal information from unauthorized access,
            alteration, disclosure, or destruction.
          </p>
        </section>

        {/* Section 4: Contact */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 mt-8">
          <h4 className="text-base font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Have Questions?
          </h4>
          <p className="text-sm text-blue-800 mb-0">
            If you have any questions about this Privacy Policy, please contact
            us at{" "}
            <a
              href="mailto:yfa.main2025@gmail.com"
              className="underline font-bold hover:text-blue-600 transition-colors"
            >
              yfa.main2025@gmail.com
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
