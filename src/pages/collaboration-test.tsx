import React, { useState } from 'react';
import { CollaborativeCodeEditor } from '../components/CollaborativeCodeEditor';
import { LiveblocksProvider } from '../components/providers/LiveblocksProvider';

export default function CollaborationTest() {
  const [roomId] = useState('test-room');
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-semibold text-gray-900">Collaborative Code Editor</h1>
          <p className="text-sm text-gray-500 mt-1">
            Room: <span className="font-mono bg-gray-100 px-2 py-1 rounded">{roomId}</span>
          </p>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="border-2 border-gray-200 rounded-lg h-[600px] overflow-hidden">
            <LiveblocksProvider roomId={roomId}>
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-hidden">
                  <CollaborativeCodeEditor 
                    roomId={roomId}
                    language="javascript"
                    className="h-full"
                    initialContent="// Start collaborating!\n// Your changes will appear in real-time for all users in this room.\n\nfunction hello() {\n  return 'Hello, world!';\n}"
                  />
                </div>
              </div>
            </LiveblocksProvider>
          </div>
          
          <div className="mt-6 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">How to test</h3>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>To test the collaborative editing:</p>
                <ol className="list-decimal list-inside mt-2 space-y-1">
                  <li>Open this page in multiple browser windows</li>
                  <li>Make changes in one window and see them appear in real-time in the other</li>
                  <li>Each user will have their own cursor and selection</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
