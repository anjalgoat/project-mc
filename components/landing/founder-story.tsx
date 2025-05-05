// components/landing/founder-story.tsx
export function FounderStory() {
    return (
      <section className="py-20 bg-amber-50">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10">
            <div className="md:w-1/3">
              <div className="bg-orange-400 rounded-lg w-full aspect-square flex items-center justify-center mb-4">
                <div className="text-center text-white">Founder Image</div>
              </div>
            </div>
            
            <div className="md:w-2/3">
              <h2 className="text-3xl font-bold mb-4">Hey, it's Your Name 👋</h2>
              
              <p className="mb-4">
                A few months ago, I was struggling to validate my SaaS ideas—getting stuck in analysis paralysis and wasting weeks on ideas that weren't viable.
              </p>
              
              <p className="mb-4">
                • First attempt: Too niche, no market.
                <br />• Second attempt: Too competitive without differentiation.
                <br />• Third attempt: Found a good idea but spent weeks on manual research.
              </p>
              
              <p className="mb-4">
                That's when I realized: idea validation is broken for creators and founders. Why should validating ideas take weeks when AI could do it in minutes?
              </p>
              
              <p className="mb-4">
                Now, I've built AgentsOnGear to help founders and product builders validate ideas quickly with real data—not just guesswork or outdated information.
              </p>
              
              <p className="font-bold">
                Indie hackers: Build a SaaS around YOUR problem. 🚀
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }