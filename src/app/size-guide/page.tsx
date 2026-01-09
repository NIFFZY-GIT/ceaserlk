import Link from "next/link";

type MeasurementRow = {
  size: string;
  waist: string;
  chest?: string;
  hip?: string;
  length?: string;
};

const measurements: { name: string; description: string; rows: MeasurementRow[] }[] = [
  {
    name: 'Tops & T-Shirts',
    description: 'Chest measured at fullest point, waist at natural waistline',
    rows: [
      { size: 'XS', chest: '34" - 36"', waist: '28" - 30"', length: '26"' },
      { size: 'S', chest: '36" - 38"', waist: '30" - 32"', length: '27"' },
      { size: 'M', chest: '38" - 40"', waist: '32" - 34"', length: '28"' },
      { size: 'L', chest: '40" - 43"', waist: '34" - 37"', length: '29"' },
      { size: 'XL', chest: '43" - 46"', waist: '37" - 40"', length: '30"' },
      { size: 'XXL', chest: '46" - 49"', waist: '40" - 43"', length: '31"' },
    ],
  },
  {
    name: 'Hoodies & Jackets',
    description: 'For a relaxed fit, size up one size',
    rows: [
      { size: 'XS', chest: '36" - 38"', waist: '30" - 32"', length: '25"' },
      { size: 'S', chest: '38" - 40"', waist: '32" - 34"', length: '26"' },
      { size: 'M', chest: '40" - 42"', waist: '34" - 36"', length: '27"' },
      { size: 'L', chest: '42" - 45"', waist: '36" - 39"', length: '28"' },
      { size: 'XL', chest: '45" - 48"', waist: '39" - 42"', length: '29"' },
      { size: 'XXL', chest: '48" - 51"', waist: '42" - 45"', length: '30"' },
    ],
  },
  {
    name: 'Pants & Bottoms',
    description: 'Waist measured at natural waistline, hip at fullest point',
    rows: [
      { size: '28', waist: '27" - 28"', hip: '34" - 35"', length: '30"' },
      { size: '30', waist: '29" - 30"', hip: '36" - 37"', length: '31"' },
      { size: '32', waist: '31" - 32"', hip: '38" - 39"', length: '32"' },
      { size: '34', waist: '33" - 34"', hip: '40" - 41"', length: '32"' },
      { size: '36', waist: '35" - 36"', hip: '42" - 43"', length: '33"' },
      { size: '38', waist: '37" - 38"', hip: '44" - 45"', length: '33"' },
    ],
  },
];

const howToMeasure = [
  {
    title: 'Chest',
    description: 'Measure around the fullest part of your chest, keeping the tape horizontal.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    title: 'Waist',
    description: 'Measure around your natural waistline, keeping the tape comfortably loose.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
    ),
  },
  {
    title: 'Hips',
    description: 'Measure around the fullest part of your hips, about 8 inches below your waist.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
      </svg>
    ),
  },
  {
    title: 'Length',
    description: 'For tops, measure from shoulder seam to bottom hem. For pants, measure inseam.',
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
      </svg>
    ),
  },
];

export default function SizeGuidePage() {
  return (
    <main className="min-h-screen bg-[#fafafa]">
      {/* Header */}
      <div className="bg-[#1a1a1a] text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-2 text-sm text-white/60 mb-8">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <span>/</span>
            <span className="text-white">Size Guide</span>
          </nav>
          
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight">
            Size Guide
          </h1>
          <p className="mt-4 text-lg text-white/70 max-w-2xl">
            Find your perfect fit. Use the measurements below to determine which size works best for you.
          </p>
          
          {/* Signature stripe */}
          <div className="flex h-1.5 w-32 mt-8">
            <div className="flex-1 bg-[#006633]" />
            <div className="flex-1 bg-white" />
            <div className="flex-1 bg-[#cc0000]" />
          </div>
        </div>
      </div>

      {/* How to Measure Section */}
      <div className="max-w-6xl mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <h2 className="text-xl font-semibold text-[#1a1a1a] mb-2">How to Measure</h2>
        <p className="text-[#666] mb-8">For the most accurate fit, take measurements over light clothing.</p>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {howToMeasure.map((item) => (
            <div key={item.title} className="bg-white border border-[#e5e5e5] p-6">
              <div className="w-12 h-12 bg-[#f5f5f5] rounded-full flex items-center justify-center text-[#1a1a1a] mb-4">
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
            <section key={name} className="bg-white border border-[#e5e5e5]">
              {/* Section Header */}
              <div className="px-6 py-5 border-b border-[#e5e5e5]">
                <h2 className="text-lg font-semibold text-[#1a1a1a]">{name}</h2>
                <p className="mt-1 text-sm text-[#666]">{description}</p>
              </div>
              
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#f9f9f9]">
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                        Size
                      </th>
                      {rows[0]?.chest && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                          Chest
                        </th>
                      )}
                      <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                        Waist
                      </th>
                      {rows[0]?.hip && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                          Hip
                        </th>
                      )}
                      {rows[0]?.length && (
                        <th className="px-6 py-4 text-left text-xs font-semibold text-[#1a1a1a] uppercase tracking-wider">
                          Length
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e5e5e5]">
                    {rows.map((row, index) => (
                      <tr 
                        key={row.size} 
                        className={index % 2 === 1 ? 'bg-[#fafafa]' : 'bg-white'}
                      >
                        <td className="px-6 py-4 text-sm font-semibold text-[#1a1a1a]">
                          {row.size}
                        </td>
                        {row.chest && (
                          <td className="px-6 py-4 text-sm text-[#444]">{row.chest}</td>
                        )}
                        <td className="px-6 py-4 text-sm text-[#444]">{row.waist}</td>
                        {row.hip && (
                          <td className="px-6 py-4 text-sm text-[#444]">{row.hip}</td>
                        )}
                        {row.length && (
                          <td className="px-6 py-4 text-sm text-[#444]">{row.length}</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>

        {/* Tips Section */}
        <div className="mt-16 bg-[#1a1a1a] text-white p-8 lg:p-12">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold mb-4">Sizing Tips</h2>
            <ul className="space-y-3 text-white/80">
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#006633] rounded-full mt-2 flex-shrink-0" />
                <span>If you are between sizes, we recommend sizing up for a more relaxed fit.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-white rounded-full mt-2 flex-shrink-0" />
                <span>Our hoodies and jackets are designed with a slightly oversized fit.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-1.5 h-1.5 bg-[#cc0000] rounded-full mt-2 flex-shrink-0" />
                <span>For a fitted look on t-shirts, choose your exact size or size down.</span>
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
