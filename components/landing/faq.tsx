// components/landing/faq.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChevronDown } from "lucide-react";

const faqItems = [
  {
    question: "How is AgentsOnGear different from ChatGPT?",
    answer: "AgentsOnGear utilizes specialized AI agents that actively crawl the web, providing real-time market data, unlike ChatGPT, which relies on pre-trained data."
  },
  {
    question: "What kind of data do your agents analyze?",
    answer: "Our agents analyze competitor information, pricing, feature sets, market trends, and user sentiment."
  },
  {
    question: "How long does the analysis take?",
    answer: "Typically, you receive a comprehensive report within 5-30 minutes."
  },
  {
    question: "What do I receive after the analysis?",
    answer: "A detailed report with market positioning, feature recommendations, and competitive advantages."
  },
  {
    question: "Can I use this for my existing product?",
    answer: "Absolutely! Our insights can help refine and improve your current offerings."
  }
];

export function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  
  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };
  
  return (
    <section className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-12 text-center">
            Frequently Asked Questions
          </h2>
          
          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <div key={index} className="border-b border-gray-200 pb-4">
                <button
                  className="flex justify-between items-center w-full text-left py-4 focus:outline-none"
                  onClick={() => toggleItem(index)}
                >
                  <h3 className="text-xl font-medium">{item.question}</h3>
                  <ChevronDown 
                    className={`transition-transform ${openIndex === index ? 'transform rotate-180' : ''}`} 
                    size={20} 
                  />
                </button>
                {openIndex === index && (
                  <div className="pb-4 pr-8">
                    <p className="text-gray-600">{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          <div className="mt-12 text-center">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6">
              Get AgentsOnGear Now!
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}