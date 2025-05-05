// components/landing/how-it-works.tsx
export function HowItWorks() {
    return (
      <section className="py-20 bg-zinc-900 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-4xl font-bold mb-12 text-center">
              ⚙️ How It Works <span className="inline-block animate-bounce">🚀</span>
            </h2>
            
            <p className="text-xl mb-10 text-center">
              Our AI-powered agents crawl the web to turn your idea into actionable market insights in three simple steps:
            </p>
            
            <div className="grid md:grid-cols-3 gap-8 mt-12">
              <div className="relative p-6 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold">1</div>
                <h3 className="text-xl font-bold mb-3">Share Your Idea</h3>
                <p>Tell us about your app or SaaS concept. The more details you provide, the more targeted our analysis will be.</p>
              </div>
              
              <div className="relative p-6 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold">2</div>
                <h3 className="text-xl font-bold mb-3">Agents Crawl the Web</h3>
                <p>Our specialized AI agents actively crawl the web to gather real-time data about competitors, market trends, and user needs.</p>
              </div>
              
              <div className="relative p-6 bg-zinc-800 rounded-lg border border-zinc-700">
                <div className="absolute -top-5 -left-5 w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-lg font-bold">3</div>
                <h3 className="text-xl font-bold mb-3">Get Actionable Insights</h3>
                <p>Receive a detailed report with market positioning, feature recommendations, and competitive advantages in just 5-30 minutes.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }