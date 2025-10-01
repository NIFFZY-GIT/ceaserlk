import { notFound } from 'next/navigation';

const collectionCopy: Record<string, { title: string; description: string; tagline: string }> = {
  'new-arrivals': {
    title: 'New Arrivals',
    description: 'Fresh drops engineered for peak performance and everyday grind.',
    tagline: 'Be first. Be fearless.',
  },
  'best-sellers': {
    title: 'Best Sellers',
    description: 'Tried-and-true staples the Ceaser community can’t get enough of.',
    tagline: 'Certified by relentless athletes everywhere.',
  },
  'on-sale': {
    title: 'End of Season',
    description: 'Premium gear at limited-time prices—grab them before they’re gone.',
    tagline: 'Same quality. New discipline in your budget.',
  },
};

interface CollectionPageProps {
  params: { slug?: string };
}

export default function CollectionPage({ params }: CollectionPageProps) {
  const { slug } = params;
  const normalized = slug?.toLowerCase();
  const content = normalized ? collectionCopy[normalized] : undefined;

  if (!content) {
    notFound();
  }

  return (
    <main className="px-6 py-24 mx-auto max-w-7xl">
      <section className="text-white">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">{content.tagline}</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">{content.title}</h1>
        <p className="max-w-2xl mt-4 text-lg text-gray-300">{content.description}</p>
      </section>

      <section className="grid gap-6 mt-16 text-white sm:grid-cols-2">
        <article className="p-6 border border-gray-800 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950">
          <h2 className="text-2xl font-semibold">Curated Drops</h2>
          <p className="mt-2 text-sm text-gray-400">
            We’re populating this collection with products that align with your drive. Check back soon
            for a full lineup, or explore the shop to find your next essential.
          </p>
        </article>
        <article className="p-6 border border-gray-800 rounded-xl bg-gradient-to-br from-gray-900 to-gray-950">
          <h2 className="text-2xl font-semibold">Need Something Now?</h2>
          <p className="mt-2 text-sm text-gray-400">
            Browse <a href="/shop" className="font-medium text-accent hover:underline">all products</a> for the complete
            assortment. Filter by category, fit, and color to build your kit.
          </p>
        </article>
      </section>
    </main>
  );
}
