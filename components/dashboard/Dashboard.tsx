// src/components/dashboard/Dashboard.tsx
'use client';

import React, { useState } from 'react';
// **** ADD useQuery import ****
import { useMutation, useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { SignedIn, useAuth } from '@clerk/nextjs';
import InitialQueryView from '@/components/dashboard/InitialQueryView';
import ActiveQueryView from '@/components/dashboard/ActiveQueryView';
// **** ADD Doc type import ****
import { Doc } from '@/convex/_generated/dataModel';

// --- Placeholder for report generation ---
async function generateReportFromQuery(query: string): Promise<string> {
  console.log('Simulating report generation for:', query);
  await new Promise((resolve) => setTimeout(resolve, 1500));
  if (query.toLowerCase().includes('error')) {
    throw new Error('Simulated processing error');
  }
  return `This is the generated report content for the query: "${query}" - generated at ${new Date().toLocaleTimeString()}`;
}
// --- End Placeholder ---

export default function Dashboard() {
  const [viewState, setViewState] = useState<'initial' | 'active'>('initial');
  const [activeQuery, setActiveQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false); // Loading for submission
  const [error, setError] = useState<string | null>(null);

  const { isSignedIn } = useAuth();
  const createReport = useMutation(api.reports.createReport);

  // **** FETCH REPORTS using useQuery ****
  const reports = useQuery(api.reports.getMyReports);
  // Determine loading state specifically for reports
  const isLoadingReports = reports === undefined;

  const handleInitialQuerySubmit = async (query: string) => {
    if (!isSignedIn || isLoading) return;
    setIsLoading(true);
    setError(null);
    setActiveQuery(query);
    try {
      const generatedResponse = await generateReportFromQuery(query);
      await createReport({ query: query, response: generatedResponse });
      console.log('Report saved to Convex successfully!');
      setViewState('active');
    } catch (err: any) {
      console.error('Error during report generation or saving:', err);
      setError(err.message || 'Failed to process your query. Please try again.');
      setActiveQuery('');
      setViewState('initial'); // Stay on initial view on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoHome = () => {
      setViewState('initial');
      setActiveQuery('');
      setError(null);
  }

  return (
    <SignedIn>
      <div className="relative">
        {viewState === 'initial' && (
          // **** PASS reports and loading state to InitialQueryView ****
          <InitialQueryView
             onSubmitQuery={handleInitialQuerySubmit}
             reports={reports} // Pass the fetched reports
             isLoadingReports={isLoadingReports} // Pass the loading state for reports
          />
        )}

        {viewState === 'active' && (
          <ActiveQueryView
              initialQuery={activeQuery}
              onGoHome={handleGoHome} // Pass the function to go back
          />
        )}

        {/* Loading indicator for submission */}
        {isLoading && (
           <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-50">
              <div className="bg-gray-800 text-white p-4 rounded-lg shadow-lg">
                 Processing your request...
              </div>
           </div>
        )}

         {/* Error display */}
         {error && !isLoading && viewState === 'initial' && (
           <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-40" role="alert">
             <strong className="font-bold">Error: </strong>
             <span className="block sm:inline">{error}</span>
           </div>
         )}
      </div>
    </SignedIn>
  );
}