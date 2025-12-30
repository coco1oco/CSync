export function HelpSupport() {
  const faqs = [
    { q: "How do I change my password?", a: "Go to Account Center in Settings to update your credentials." },
    { q: "Is my pet's data private?", a: "Yes, only you and the people you explicitly share data with can see your pet's records." },
    { q: "How do I report a bug?", a: "Click the 'Report a problem' tab in the menu." }
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Help & Support</h2>
        <p className="text-sm text-gray-500">Find answers or get in touch with our team.</p>
      </div>

      {/* FAQ Section */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">FAQs</h3>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-sm font-bold text-gray-900 mb-1">{faq.q}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Emergency Footer */}
      <div className="p-4 bg-red-50 border border-red-100 rounded-xl">
        <p className="text-xs text-red-700 leading-relaxed">
          <span className="font-bold">Medical Emergency?</span> PawPal is a community and management tool. If your pet is in immediate danger, please visit the nearest 24/7 veterinary clinic.
        </p>
      </div>
    </div>
  );
}