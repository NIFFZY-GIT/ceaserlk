const faqs = [
  {
    question: 'How long does shipping take?',
    answer:
      'Domestic orders ship within 2-3 business days. International delivery varies by carrier, but we aim to have every package on its way within 5 business days.',
  },
  {
    question: 'What is your return policy?',
    answer:
      'Items can be returned within 30 days of delivery as long as they are unworn and in original packaging. Reach out to support@ceaserbrand.com to initiate a return.',
  },
  {
    question: 'Do you restock sold-out products?',
    answer:
      'Yes. Sign up for back-in-stock alerts on the product page or follow us on social for drop announcements.',
  },
  {
    question: 'Can I update or cancel my order?',
    answer:
      'We start fulfilling orders immediately, but our support team can help if you reach out within a few hours of purchase.',
  },
];

export default function FaqPage() {
  return (
    <main className="px-6 py-24 mx-auto max-w-5xl text-white">
      <header className="max-w-2xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">FAQs</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Need a quick answer?</h1>
        <p className="mt-4 text-gray-300">
          We rounded up the questions we hear most often. If you need something more specific,
          our team is a quick email away at support@ceaserbrand.com.
        </p>
      </header>

      <dl className="mt-16 space-y-12 divide-y divide-gray-800">
        {faqs.map(({ question, answer }) => (
          <div key={question} className="pt-6">
            <dt className="text-lg font-semibold text-white">{question}</dt>
            <dd className="mt-2 text-gray-400">{answer}</dd>
          </div>
        ))}
      </dl>
    </main>
  );
}
