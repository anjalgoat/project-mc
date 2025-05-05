// src/components/dashboard/InitialQueryView.tsx
'use client';

import React, { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area'; // Import ScrollArea
// **** ADD Doc type import ****
import { Doc } from '@/convex/_generated/dataModel';
// **** Optional: Import a date formatting library ****
// import { formatDistanceToNow } from 'date-fns';

// **** UPDATE interface for props ****
interface InitialQueryViewProps {
  onSubmitQuery: (query: string) => void;
  // Add props for reports data and loading state
  reports: Doc<"reports">[] | undefined;
  isLoadingReports: boolean;
}

const InitialQueryView: React.FC<InitialQueryViewProps> = ({
    onSubmitQuery,
    reports, // Destructure reports
    isLoadingReports // Destructure loading state
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSubmitQuery(query);
    }
  };

  // Helper function to format time (replace with date-fns or similar if needed)
  const formatTimeAgo = (timestamp: number) => {
      const seconds = Math.floor((new Date().getTime() - timestamp) / 1000);
      let interval = seconds / 31536000;
      if (interval > 1) return Math.floor(interval) + " years ago";
      interval = seconds / 2592000;
      if (interval > 1) return Math.floor(interval) + " months ago";
      interval = seconds / 86400;
      if (interval > 1) return Math.floor(interval) + " days ago";
      interval = seconds / 3600;
      if (interval > 1) return Math.floor(interval) + " hours ago";
      interval = seconds / 60;
      if (interval > 1) return Math.floor(interval) + " minutes ago";
      return Math.floor(seconds) + " seconds ago";
      // Or use date-fns: return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
  }

  return (
    // Make main container potentially shorter if history is shown
    <div className="flex flex-col h-screen bg-light-gray">
      {/* Top Navbar */}
      <header className="flex items-center justify-between p-4 border-b border-border-gray bg-white">
        <div className="text-lg font-semibold text-dark-text">YourAppLogo</div>
        <UserButton afterSignOutUrl="/" />
      </header>

      {/* Main Content Area - Split into Query + History */}
      <div className="flex-grow flex flex-col md:flex-row overflow-hidden"> {/* Allow horizontal layout on medium screens */}

          {/* Query Input Section */}
          <main className="w-full md:w-2/3 flex flex-col items-center justify-center p-6 text-center overflow-y-auto"> {/* Take up more space initially */}
            <h1 className="text-3xl font-bold text-dark-text mb-2">
              Build something <span className="text-primary-orange">Lovable</span>
            </h1>
            <p className="text-subtext-gray mb-8">
              Idea to app in seconds, with your personal full stack engineer
            </p>

            <form onSubmit={handleSubmit} className="w-full max-w-xl mb-6">
              <Input
                type="text"
                placeholder="create me an app"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 px-4 text-base border-border-gray focus:ring-primary-orange rounded-lg mb-4 text-dark-text"
              />
              <Button
                type="submit"
                className="w-full h-12 bg-primary-orange text-white hover:bg-primary-orange/90 rounded-lg font-semibold text-base"
              >
                 <Send className="mr-2 h-4 w-4" /> Start Building
              </Button>
            </form>

            {/* Suggested Actions */}
            <div className="flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="sm" className="rounded-lg border-border-gray text-dark-text">Task manager</Button>
              <Button variant="outline" size="sm" className="rounded-lg border-border-gray text-dark-text">AI image generator</Button>
              <Button variant="outline" size="sm" className="rounded-lg border-border-gray text-dark-text">Bill splitter</Button>
            </div>
          </main>

          {/* History Section (Sidebar on larger screens) */}
          <aside className="w-full md:w-1/3 p-4 border-t md:border-t-0 md:border-l border-border-gray bg-white flex flex-col">
             <h2 className="text-lg font-semibold text-dark-text mb-3 px-2">Recent Activity</h2>
             <ScrollArea className="flex-grow">
                <div className="space-y-2">
                   {isLoadingReports && (
                      <div className="p-3 text-center text-subtext-gray">Loading history...</div>
                   )}
                   {!isLoadingReports && reports && reports.length === 0 && (
                       <div className="p-3 text-center text-subtext-gray">No recent activity found.</div>
                   )}
                   {!isLoadingReports && reports && reports.map((report) => (
                       <div
                           key={report._id}
                           className="p-3 rounded-lg hover:bg-gray-hover cursor-pointer border border-transparent hover:border-border-gray"
                           // TODO: Add onClick handler to load this report into ActiveQueryView later
                           // onClick={() => console.log("Load report:", report._id)}
                       >
                           <p className="text-sm font-medium text-dark-text truncate mb-1">
                               {/* Use report.query or maybe add a 'title' field later */}
                               {report.query}
                           </p>
                           <p className="text-xs text-subtext-gray">
                               {/* Format the creation time */}
                               {formatTimeAgo(report._creationTime)}
                           </p>
                       </div>
                   ))}
                </div>
             </ScrollArea>
          </aside>
      </div>
    </div>
  );
};

export default InitialQueryView;