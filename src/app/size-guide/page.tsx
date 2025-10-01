type MeasurementRow = {
  size: string;
  waist: string;
  chest?: string;
  hip?: string;
};

const measurements: { name: string; rows: MeasurementRow[] }[] = [
  {
    name: 'Tops',
    rows: [
      { size: 'XS', chest: '34" - 36"', waist: '28" - 30"' },
      { size: 'S', chest: '36" - 38"', waist: '30" - 32"' },
      { size: 'M', chest: '38" - 40"', waist: '32" - 34"' },
      { size: 'L', chest: '40" - 43"', waist: '34" - 37"' },
      { size: 'XL', chest: '43" - 46"', waist: '37" - 40"' },
    ],
  },
  {
    name: 'Bottoms',
    rows: [
      { size: '28', waist: '27" - 28"', hip: '34" - 35"' },
      { size: '30', waist: '29" - 30"', hip: '36" - 37"' },
      { size: '32', waist: '31" - 32"', hip: '38" - 39"' },
      { size: '34', waist: '33" - 34"', hip: '40" - 41"' },
      { size: '36', waist: '35" - 36"', hip: '42" - 43"' },
    ],
  },
];

export default function SizeGuidePage() {
  return (
    <main className="px-6 py-24 mx-auto max-w-6xl text-white">
      <header className="max-w-3xl">
        <p className="text-sm font-semibold tracking-widest uppercase text-accent">Size guide</p>
        <h1 className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl">Dial in the perfect fit.</h1>
        <p className="mt-4 text-gray-300">
          Measure your body, match it against the chart, and gear up with confidence. Every garment is cut to
          move with you—whether you’re training, recovering, or out in the city.
        </p>
      </header>

      <div className="grid gap-12 mt-16">
        {measurements.map(({ name, rows }) => (
          <section key={name} className="overflow-hidden border border-gray-800 rounded-xl">
            <div className="px-6 py-4 bg-gray-900">
              <h2 className="text-xl font-semibold">{name}</h2>
              <p className="mt-1 text-sm text-gray-400">Measurements are listed in inches.</p>
            </div>
            <div className="overflow-x-auto bg-black">
              <table className="min-w-full divide-y divide-gray-800">
                <thead className="text-sm uppercase text-gray-400">
                  <tr>
                    <th className="px-6 py-3 text-left">Size</th>
                    <th className="px-6 py-3 text-left">Waist</th>
                    {rows[0]?.hip && <th className="px-6 py-3 text-left">Hip</th>}
                    {rows[0]?.chest && <th className="px-6 py-3 text-left">Chest</th>}
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-gray-800 text-gray-300">
                  {rows.map((row) => (
                    <tr key={row.size}>
                      <td className="px-6 py-3 font-medium text-white">{row.size}</td>
                      <td className="px-6 py-3">{row.waist}</td>
                      {row.hip && <td className="px-6 py-3">{row.hip}</td>}
                      {row.chest && <td className="px-6 py-3">{row.chest}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
