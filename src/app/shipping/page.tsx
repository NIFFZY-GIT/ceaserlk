const shippingTiers = [
  {
    label: 'Standard',
    eta: '3-5 business days',
    details: 'Complimentary for orders over $120. Flat $8 otherwise.',
  },
  {
    label: 'Express',
    eta: '1-2 business days',
    details: 'Calculated at checkout based on destination and weight.',
  },
  {
    label: 'International',
    eta: '5-10 business days',
    details: 'Rates are carrier-calculated with duties prepaid where available.',
  },
];

const returnSteps = [
  'Email support@ceaserbrand.com with your order number and reason for return.',
  'Print the prepaid label we send you and pack your items securely.',
  'Drop the package at the nearest carrier location within 30 days of receiving your order.',
];

export default function ShippingPage() {
  return (
    <main className="px-6 py-24 mx-auto max-w-6xl text-white">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">Shipping & returns</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Built for distance. Delivered with speed.</h1>
        <p className="mt-4 text-gray-300">
          We work with trusted carriers to make sure your gear arrives on time and in perfect condition.
          The moment your order is scanned, you’ll get tracking details straight to your inbox.
        </p>
      </section>

      <section className="grid gap-6 mt-16 sm:grid-cols-2 lg:grid-cols-3">
        {shippingTiers.map(({ label, eta, details }) => (
          <article key={label} className="p-6 border border-gray-800 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950">
            <h2 className="text-xl font-semibold">{label}</h2>
            <p className="mt-1 text-sm uppercase text-accent">{eta}</p>
            <p className="mt-3 text-sm text-gray-400">{details}</p>
          </article>
        ))}
      </section>

      <section className="mt-20">
        <h2 className="text-2xl font-semibold">Returns made simple</h2>
        <p className="mt-2 text-gray-300">
          Not the right fit? No stress. Follow these steps to get a replacement or refund.
        </p>
        <ol className="mt-6 space-y-4 text-sm text-gray-400 list-decimal list-inside">
          {returnSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </section>
    </main>
  );
}
