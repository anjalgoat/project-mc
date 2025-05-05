// src/app/(main)/layout.tsx
import React from 'react';
import {
  SignInButton,
  SignUpButton,
  SignedIn,
  SignedOut,
  UserButton,
} from "@clerk/nextjs";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      {/* Header specific to the (main) layout group */}
      <header className="flex justify-end items-center p-4 gap-4 h-16 border-b border-border-gray"> {/* Added border color */}
        <SignedOut>
          {/* Use Clerk buttons or style your own */}
          <SignInButton mode="modal" />
          <SignUpButton mode="modal" />
        </SignedOut>
        <SignedIn>
          <UserButton afterSignOutUrl="/" />
        </SignedIn>
      </header>
      {/* Main content area specific to the (main) layout group */}
      <main className="p-4">
        {children}
      </main>
    </>
  );
}