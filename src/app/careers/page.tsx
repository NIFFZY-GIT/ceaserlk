const openings = [
  {
    title: 'Retail Experience Lead',
    location: 'Colombo, Sri Lanka',
    type: 'Full-time',
    summary: 'Own the in-store experience, mentor stylists, and create a relentless customer journey.',
  },
  {
    title: 'Product Developer – Performance Knitwear',
    location: 'Remote',
    type: 'Contract',
    summary: 'Work with our design lab to prototype, test, and iterate on next-gen fabrics.',
  },
  {
    title: 'Community & Events Coordinator',
    location: 'Hybrid / Colombo',
    type: 'Full-time',
    summary: 'Activate the Ceaser community through training meetups, launches, and content partnerships.',
  },
];

export default function CareersPage() {
  return (
    <main className="px-6 py-24 mx-auto max-w-5xl text-white">
      <section className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">Careers</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Build with a relentless team.</h1>
        <p className="mt-4 text-gray-300">
          We’re a crew of athletes, designers, and storytellers obsessed with helping people push limits. If that resonates,
          we’d love to talk. Browse open roles or drop us a note at talent@ceaserbrand.com.
        </p>
      </section>

      <section className="mt-16 space-y-6">
        {openings.map(({ title, location, type, summary }) => (
          <article key={title} className="p-6 border border-gray-800 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-2xl font-semibold">{title}</h2>
                <p className="mt-1 text-sm text-gray-400">{location} • {type}</p>
              </div>
              <a
                href="mailto:talent@ceaserbrand.com?subject=Ceaser%20Careers"
                className="self-start px-4 py-2 text-sm font-semibold transition-colors border border-accent text-accent hover:bg-accent hover:text-black rounded-full"
              >
                Introduce yourself
              </a>
            </div>
            <p className="mt-4 text-sm text-gray-400">{summary}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
