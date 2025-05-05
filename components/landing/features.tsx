// components/landing/features.tsx
export function Features() {
    return (
      <section className="py-20 bg-white text-black">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <h2 className="text-4xl font-bold mb-16 text-center">
              What Will You <span className="bg-amber-200 px-2 py-1 rounded">Get</span> 🎨 ?
            </h2>
            
            <div className="grid lg:grid-cols-2 gap-10">
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-6 h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">Dashboard Preview Image</div>
                </div>
                <h3 className="text-2xl font-bold mb-4">1. The Dashboard For All Your Ideas</h3>
                <p className="text-gray-700">
                  Add unlimited ideas, track your market analysis results, and monitor your competitive landscape in one place.
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg p-6">
                <div className="bg-gray-100 rounded-lg p-4 mb-6 h-64 flex items-center justify-center">
                  <div className="text-center text-gray-500">Analytics Preview Image</div>
                </div>
                <h3 className="text-2xl font-bold mb-4">2. The Analytics Of Your Market</h3>
                <p className="text-gray-700">
                  Discover key market trends, competitor strategies, and user needs based on real data from our AI agents.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }