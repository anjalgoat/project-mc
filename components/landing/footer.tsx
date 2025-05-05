// components/landing/footer.tsx
export function Footer() {
    return (
      <footer className="py-12 bg-black text-white/70">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-6 md:mb-0">
              <div className="w-12 h-12 bg-orange-500 rounded-lg mr-3 flex items-center justify-center text-white font-bold">
                AoG
              </div>
              <div>
                <h3 className="text-white font-bold text-xl">AgentsOnGear</h3>
                <p className="text-sm">Market research AI that founders deserve.</p>
              </div>
            </div>
            
            <div className="grid grid-cols-3 gap-10">
              <div>
                <h4 className="text-sm font-semibold text-white/90 mb-4">LINKS</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-white/90 mb-4">LEGAL</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                </ul>
              </div>
              
              <div>
                <h4 className="text-sm font-semibold text-white/90 mb-4">BY THE MAKER</h4>
                <ul className="space-y-2">
                  <li><a href="#" className="hover:text-white transition-colors">Portfolio</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Twitter</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-12 pt-6 border-t border-white/10 text-center text-sm">
            © {new Date().getFullYear()} - All rights reserved
          </div>
        </div>
      </footer>
    );
  }