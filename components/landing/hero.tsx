// components/landing/hero.tsx
import { Button } from "@/components/ui/button";

export function Hero() {
  return (
    <section className="py-20 bg-black text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-block bg-orange-500 text-white px-4 py-1 rounded-full mb-4">
            🧠 Ideas That Win
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Got an app idea? SaaS? Let's analyze them.
          </h1>
          <p className="text-xl mb-8">
            Be the first to access our market research AI.
          </p>
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-lg px-8 py-6">
            👉 Join the Waitlist
          </Button>
          
          <div className="mt-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-8">
              🚀 We Take Your Idea and Do Market Analysis That ChatGPT Can't
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mt-12">
              <div className="p-6 bg-zinc-900 rounded-lg">
                <h3 className="text-xl font-bold mb-3">🔍 Real Competitor Intelligence</h3>
                <p>We delve deep into your market, identify key players, and decode what makes them tick using real-time web data.</p>
              </div>
              <div className="p-6 bg-zinc-900 rounded-lg">
                <h3 className="text-xl font-bold mb-3">🕵️ Spot Market Gaps Instantly</h3>
                <p>Discover underserved segments, UX pain points, and feature gaps through active web crawling.</p>
              </div>
              <div className="p-6 bg-zinc-900 rounded-lg">
                <h3 className="text-xl font-bold mb-3">📊 Backed by Real Data</h3>
                <p>We combine intelligent web crawling, industry data, and specialized AI agents for current insights.</p>
              </div>
              <div className="p-6 bg-zinc-900 rounded-lg">
                <h3 className="text-xl font-bold mb-3">👥 Built for Founders & Product Builders</h3>
                <p>From brainstorming to MVP validation — we've got your back with fast 5-30 minute analysis.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}