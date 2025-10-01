const featuredPosts = [
  {
    title: 'Training smarter in the heat',
    excerpt: 'Dial in your hydration strategy and layering system for sessions that outlast the sun.',
    href: '#',
    tag: 'Performance',
  },
  {
    title: 'Behind the design: Apex collection',
    excerpt: 'From sketches to prototypes—how we engineered abrasion resistance without sacrificing flex.',
    href: '#',
    tag: 'Product',
  },
  {
    title: 'Morning routines from the team',
    excerpt: 'How our athletes prime their bodies and mindset before 6 a.m.',
    href: '#',
    tag: 'Mindset',
  },
];

export default function BlogPage() {
  return (
    <main className="px-6 py-24 mx-auto max-w-6xl text-white">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">Journal</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Stories built to fuel your discipline.</h1>
        <p className="mt-4 text-gray-300">
          Training tactics, product drops, and interviews with the community. We’re building out the full editorial
          experience, and this space will evolve with every release.
        </p>
      </header>

      <section className="grid gap-8 mt-16 sm:grid-cols-2 lg:grid-cols-3">
        {featuredPosts.map(({ title, excerpt, href, tag }) => (
          <article key={title} className="flex flex-col justify-between p-6 border border-gray-800 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950">
            <div>
              <span className="text-xs font-semibold tracking-widest uppercase text-accent">{tag}</span>
              <h2 className="mt-3 text-2xl font-semibold leading-tight">{title}</h2>
              <p className="mt-3 text-sm text-gray-400">{excerpt}</p>
            </div>
            <a
              href={href}
              className="mt-6 text-sm font-semibold transition-colors text-accent hover:text-white"
            >
              Read story →
            </a>
          </article>
        ))}
      </section>
    </main>
  );
}
