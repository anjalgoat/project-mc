// components/landing/technology.tsx
export function Technology() {
    return (
      <section className="py-20 bg-zinc-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-10 text-center">
              🧰 Our Technology
            </h2>
            
            <p className="text-xl mb-10 text-center">
              AgentsOnGear uses specialized AI agents that actively crawl the web for real-time market data.
            </p>
            
            <div className="mb-12">
              <h3 className="text-2xl font-bold mb-4">🌐 Real-Time Web Crawling</h3>
              <p className="text-lg mb-6">
                Unlike traditional AI that relies on pre-trained data, our agents actively crawl the web to gather the most current information about your market and competitors.
              </p>
              <ul className="space-y-2 pl-6 list-disc">
                <li>Access to real-time competitor data</li>
                <li>Current pricing and feature analysis</li>
                <li>Fresh market trends and user sentiment</li>
              </ul>
            </div>
            
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 bg-zinc-800 rounded-lg">
                <h3 className="text-xl font-bold mb-3">⚡ Fast Analysis</h3>
                <p>Results in just 5-30 minutes.</p>
              </div>
              <div className="p-6 bg-zinc-800 rounded-lg">
                <h3 className="text-xl font-bold mb-3">🛠️ Specialized Agents</h3>
                <p>Purpose-built for market research.</p>
              </div>
              <div className="p-6 bg-zinc-800 rounded-lg">
                <h3 className="text-xl font-bold mb-3">📈 Real Data</h3>
                <p>Not limited to training data.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }