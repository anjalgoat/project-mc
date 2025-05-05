// src/app/(main)/page.tsx
// Content is the same as your previous app/page.tsx
import { Button } from "@/components/ui/button";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { FounderStory } from "@/components/landing/founder-story";
import { Technology } from "@/components/landing/technology";
import { FAQ } from "@/components/landing/faq";
import { Footer } from "@/components/landing/footer";
import { WaitlistForm } from "@/components/landing/waitlist-form";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Hero Section */}
      <Hero />
      {/* ... rest of your landing page sections ... */}
       <section className="py-16 bg-black text-white">
         <div className="container mx-auto text-center">
           <h2 className="text-4xl font-bold mb-6">Ready to Validate Your Idea?</h2>
           <p className="text-xl mb-8">
             Join our waitlist today and be among the first to access our web-crawling market research AI.
           </p>
           <WaitlistForm />
         </div>
       </section>
      <Footer />
    </div>
  );
}