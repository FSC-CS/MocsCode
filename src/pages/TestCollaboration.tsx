import React from 'react';
import { CollaborativeCodeEditor } from '../components/CollaborativeCodeEditor';

export default function TestCollaboration() {
  const roomId = 'test-room';
  
  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 p-4">
        <h1 className="text-xl font-semibold text-gray-900">Collaborative Code Editor</h1>
        <p className="text-sm text-gray-500">Room ID: {roomId}</p>
      </header>
      <div className="flex-1 overflow-hidden">
        <CollaborativeCodeEditor 
          roomId={roomId}
          language="javascript"
          className="h-full"
          initialContent="// Start collaborating!\n// Your changes will appear in real-time for all users in this room."
        />
      </div>
      <footer className="bg-gray-50 p-3 text-center text-sm text-gray-500 border-t border-gray-200">
        Open this page in multiple browser windows to test real-time collaboration
      </footer>
    </div>
  );
}
