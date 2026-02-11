import Link from "next/link";

type MeasurementRow = {
  size: string;
  ukSize: string;
  length: string;
  width: string;
};

const measurements: { name: string; description: string; rows: MeasurementRow[] }[] = [
  {
    name: 'Shirts',
    description: 'All measurements are in inches.',
    rows: [
      { size: 'XS', ukSize: '6', length: '27', width: '22' },
      { size: 'S', ukSize: '8', length: '28', width: '23' },
      { size: 'M', ukSize: '10', length: '29', width: '24' },
      { size: 'L', ukSize: '12', length: '30', width: '25' },
      { size: 'XL', ukSize: '14', length: '31', width: '26' },
      { size: 'XXL', ukSize: '16', length: '32', width: '27' },
    ],
  },
];

const howToMeasure = [
  {
    title: 'Width (Pit to Pit)',
    description: 'Lay the shirt flat and measure straight across from underarm to underarm.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    title: 'Length',
    description: 'Measure from the highest shoulder point down to the bottom hem.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
  {
    title: 'Compare With Yours',
    description: 'Match these measurements to a shirt you already love for the best fit.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15.75V6.375a2.625 2.625 0 115.25 0v9.375m-6.75 0h8.25a2.25 2.25 0 012.25 2.25v.75H3.75v-.75a2.25 2.25 0 012.25-2.25z" />
      </svg>
    ),
  },
];

export default function SizeGuidePage() {
  return (
    <main className="min-h-screen bg-[#f7f5f0] text-[#111]">
      {/* Header */}
      <div className="relative overflow-hidden bg-[#0f0f0f] text-white">
        <div className="pointer-events-none absolute -top-32 right-[-10%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(204,0,0,0.25)_0%,rgba(204,0,0,0)_70%)]" />
        <div className="pointer-events-none absolute -bottom-32 left-[-5%] h-80 w-80 rounded-full bg-[radial-gradient(circle_at_center,rgba(0,102,51,0.35)_0%,rgba(0,102,51,0)_70%)]" />
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24 relative">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Size Guide</span>
          </nav>

          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] items-end">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full border border-white/20 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/80">Shirts only</span>
                <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-white/80">Sizes in inches</span>
              </div>
              <h1 className="mt-6 text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
                Size Guide
              </h1>
              <p className="mt-4 text-lg text-white/70 max-w-2xl">
                Compare these measurements with a shirt you already love to find your best fit.
              </p>

              {/* Signature stripe */}
              <div className="flex h-1.5 w-32 mt-8">
                <div className="flex-1 bg-[#006633]" />
                <div className="flex-1 bg-white" />
                <div className="flex-1 bg-[#cc0000]" />
              </div>
            </div>

            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur">
              <h2 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Quick fit check</h2>
              <ul className="mt-4 space-y-3 text-sm text-white/80">
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#006633] flex-shrink-0" />
                  <span>Measure a shirt flat for width and length.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-white flex-shrink-0" />
                  <span>Choose the size closest to your measurements.</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 h-2 w-2 rounded-full bg-[#cc0000] flex-shrink-0" />
                  <span>Between sizes? Size up for a relaxed fit.</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* How to Measure Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="flex items-end justify-between gap-6 mb-8">
          <div>
            <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">How to Measure</h2>
            <p className="text-[#666]">For the most accurate fit, take measurements over light clothing.</p>
          </div>
          <span className="hidden sm:inline-flex rounded-full border border-[#1a1a1a]/10 bg-white px-3 py-1 text-xs text-[#666]">Measured flat</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {howToMeasure.map((item) => (
            <div key={item.title} className="bg-white/90 border border-[#1a1a1a]/10 p-6 rounded-2xl shadow-sm">
              <div className="w-12 h-12 bg-[#f0ece5] rounded-full flex items-center justify-center text-[#1a1a1a] mb-4">
                {item.icon}
              </div>
              <h3 className="font-semibold text-[#1a1a1a] mb-2">{item.title}</h3>
              <p className="text-sm text-[#666] leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Size Charts */}
      <div className="max-w-6xl mx-auto px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="space-y-12">
          {measurements.map(({ name, description, rows }) => (
            <section key={name} className="bg-white/90 border border-[#1a1a1a]/10 rounded-2xl overflow-hidden shadow-sm">
              {/* Section Header */}
              <div className="px-6 py-5 border-b border-[#1a1a1a]/10 bg-[#f7f3ee]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-[#1a1a1a]">{name}</h2>
                    <p className="mt-1 text-sm text-[#666]">{description}</p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs text-[#666]">Sizes in inches</span>
                </div>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#faf8f4]">
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-[#1a1a1a] uppercase tracking-[0.2em]">
                        Size
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-[#1a1a1a] uppercase tracking-[0.2em]">
                        UK Size
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-[#1a1a1a] uppercase tracking-[0.2em]">
                        Length
                      </th>
                      <th className="px-6 py-4 text-left text-[11px] font-semibold text-[#1a1a1a] uppercase tracking-[0.2em]">
                        Width
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a1a1a]/10">
                    {rows.map((row, index) => (
                      <tr 
                        key={row.size} 
                        className={index % 2 === 1 ? 'bg-[#fcfbf9]' : 'bg-white'}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-[#1a1a1a]">
                          {row.size}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#444]">{row.ukSize}</td>
                        <td className="px-6 py-4 text-sm text-[#444]">{row.length}</td>
                        <td className="px-6 py-4 text-sm text-[#444]">{row.width}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-16 bg-[#111111] text-white p-8 lg:p-12 rounded-2xl">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold mb-4">Sizing Tips</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#006633] rounded-full mt-2 flex-shrink-0" />
                <span>If you are between sizes, we recommend sizing up for a more relaxed fit.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0" />
                <span>Width is measured flat, so compare it to a shirt you already own.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#cc0000] rounded-full mt-2 flex-shrink-0" />
                <span>Prefer a fitted look? Choose your exact size or size down.</span>
              </li>
            </ul>
            
            <div className="mt-8 pt-6 border-t border-white/20">
              <p className="text-sm text-white/60">
                Still unsure about your size? <Link href="/contact" className="text-white underline underline-offset-2 hover:no-underline">Contact our team</Link> for personalized sizing assistance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
