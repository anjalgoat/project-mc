// src/components/dashboard/ActiveQueryView.tsx
'use client';

import React, { useState } from 'react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Home, Send, Paperclip, Edit, Box } from 'lucide-react';

// --- OPTIONAL/FUTURE USE: Convex Imports ---
// Uncomment these if you implement history fetching or follow-up mutations here
// import { useQuery, useMutation } from 'convex/react';
// import { api } from '@/convex/_generated/api';
// import { Doc } from '@/convex/_generated/dataModel'; // Type for Convex documents

// **** UPDATE: Define interface for props ****
interface ActiveQueryViewProps {
  initialQuery: string;
  // Add the optional onGoHome prop
  onGoHome?: () => void;
  // Optional: You might also pass the initial response if generated in the parent
  // initialResponse?: string;
}

const ActiveQueryView: React.FC<ActiveQueryViewProps> = ({
    initialQuery,
    onGoHome // Destructure the onGoHome prop
    // initialResponse // Destructure if you pass it
}) => {
  const [followUpQuery, setFollowUpQuery] = useState('');
  // State for follow-up loading/error (example for future use)
  const [isFollowUpLoading, setIsFollowUpLoading] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  // --- TODO: Fetch and Display Chat History (Future) ---
  // Uncomment this to fetch all reports for the user if needed within this component
  // const reportsHistory = useQuery(api.reports.getMyReports);

  // --- TODO: Implement Follow-up Logic (Future) ---
  // Uncomment and use if handling follow-up submission here
  // const sendFollowUp = useMutation(api.reports.createReport);
  const handleFollowUpSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!followUpQuery.trim() || isFollowUpLoading) return;
      setIsFollowUpLoading(true);
      setFollowUpError(null);

      console.log("TODO: Handle follow-up query:", followUpQuery);
      // 1. Call your report generation logic for the follow-up
      // 2. Call the `sendFollowUp` mutation if defined
      // 3. Update local chat display state or rely on `reportsHistory` query refreshing
      // 4. Handle errors

      // Placeholder logic:
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate work
      setFollowUpQuery(''); // Clear input
      setIsFollowUpLoading(false);
      // setFollowUpError("Follow-up not implemented yet."); // Example error
  };


  return (
    <div className="flex flex-col h-screen bg-light-gray">
      {/* Top Navbar */}
      <header className="flex items-center justify-between p-3 border-b border-border-gray bg-white h-16">
        <div className="flex items-center gap-4">
          {/* Display the initial query */}
          <div className="text-sm font-medium text-dark-text bg-gray-hover px-3 py-1 rounded-md">
            {initialQuery}
          </div>
        </div>
        <div className="flex items-center gap-4">
           {/* **** UPDATE: Attach onClick handler to Home button **** */}
          <Button variant="ghost" size="sm" onClick={onGoHome}>
            <Home className="mr-2 h-4 w-4" /> Home
          </Button>
          <UserButton afterSignOutUrl="/" />
          <Button className="bg-primary-orange text-white hover:bg-primary-orange/90 rounded-lg font-semibold px-4 py-2 h-auto text-sm">Publish</Button>
        </div>
      </header>

      {/* Main Content Area */}
      <ResizablePanelGroup direction="horizontal" className="flex-grow">
        {/* Left Sidebar */}
        <ResizablePanel defaultSize={30} minSize={20} className="bg-white flex flex-col">
           <div className="p-4 flex-grow flex flex-col justify-between">
             {/* Status/Chat history placeholder */}
             <ScrollArea className="flex-grow mb-4">
               {/* --- Display Chat/Report History Here (Future) --- */}
               {/* Example: Display initial interaction */}
               <div className="p-2 my-1 rounded-md bg-gray-hover text-dark-text text-sm">User: {initialQuery}</div>
               {/* You might display the initialResponse here if passed */}
               {/* {initialResponse && <div className="p-2 my-1 rounded-md bg-primary-orange/10 text-dark-text text-sm">AI: {initialResponse}</div>} */}
               <div className="text-sm text-subtext-gray p-2">Working... (or display AI response)</div>

               {/* Or map over fetched reportsHistory if implemented */}
               {/* {reportsHistory === undefined && <div>Loading history...</div>} */}
               {/* {reportsHistory && reportsHistory.map(report => ( ... render report ... ))} */}
               {/* --- End History Display --- */}
             </ScrollArea>

             {/* Follow-up Input Area */}
             {/* Attach the onSubmit handler */}
             <form onSubmit={handleFollowUpSubmit} className="border-t border-border-gray pt-4">
               <Textarea
                 placeholder="Ask Lovable..."
                 value={followUpQuery}
                 onChange={(e) => setFollowUpQuery(e.target.value)}
                 className="mb-2 border-border-gray focus:ring-primary-orange text-dark-text"
                 rows={3}
                 disabled={isFollowUpLoading} // Disable while loading
               />
                {/* Display follow-up error */}
                {followUpError && <p className="text-xs text-red-500 mb-2">{followUpError}</p>}
               <div className="flex justify-between items-center">
                  <div className="flex gap-2">
                    {/* These buttons currently don't do anything */}
                    <Button type="button" variant="ghost" size="sm" className="text-subtext-gray"><Paperclip className="h-4 w-4 mr-1"/>Attach</Button>
                    <Button type="button" variant="ghost" size="sm" className="text-subtext-gray"><Edit className="h-4 w-4 mr-1"/>Edit</Button>
                  </div>
                  <Button
                    type="submit" // Make this button submit the form
                    size="sm"
                    className="bg-primary-orange text-white hover:bg-primary-orange/90 rounded-lg font-semibold"
                    // Disable while loading or if input is empty
                    disabled={isFollowUpLoading || !followUpQuery.trim()}
                  >
                    {/* Show loading indicator or Send icon */}
                    {isFollowUpLoading ? '...' : <Send className="h-4 w-4"/>}
                  </Button>
               </div>
             </form>
           </div>
        </ResizablePanel>

        <ResizableHandle withHandle className="bg-border-gray w-1 hover:bg-primary-orange transition-colors" />

        {/* Right Main Content */}
        <ResizablePanel defaultSize={70} minSize={30} className="bg-light-gray p-6">
           <ScrollArea className="h-full">
             {/* Placeholder for Results/Preview */}
             {/* TODO: Replace this with the actual display of the generated app/results */}
             <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="text-subtext-gray mb-4 p-4 bg-white rounded-full shadow-card">
                  <Box className="w-12 h-12 text-primary-orange" strokeWidth={1.5}/>
                </div>
                <h2 className="text-lg font-semibold text-dark-text mb-2">Spinning up preview...</h2>
                <ul className="text-left text-sm text-subtext-gray space-y-2 list-disc list-inside">
                  <li>Connect Supabase for backend</li>
                  <li>Collaborate at source, via GitHub</li>
                  <li>Deploy when you're ready</li>
                </ul>
                 {/* Maybe display initialResponse here */}
                 {/* {initialResponse && <pre className="mt-4 text-left text-xs bg-white p-2 rounded border border-border-gray">{initialResponse}</pre>} */}
             </div>
           </ScrollArea>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};

export default ActiveQueryView;