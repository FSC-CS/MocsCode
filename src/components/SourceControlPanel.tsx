
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitBranch, History, RotateCcw, Clock, User } from 'lucide-react';

interface Commit {
  id: string;
  message: string;
  author: string;
  timestamp: string;
  changes: number;
}

const SourceControlPanel = () => {
  const [commits] = useState<Commit[]>([
    {
      id: 'abc123',
      message: 'Fix sorting algorithm bug',
      author: 'Alice Chen',
      timestamp: '2 hours ago',
      changes: 3
    },
    {
      id: 'def456',
      message: 'Add input validation',
      author: 'You',
      timestamp: '5 hours ago',
      changes: 2
    },
    {
      id: 'ghi789',
      message: 'Initial implementation',
      author: 'Bob Smith',
      timestamp: '1 day ago',
      changes: 15
    }
  ]);

  const rollbackToCommit = (commitId: string) => {
    // Implementation would handle the rollback
  };

  return (
    <div className="h-full bg-gray-800 border-t border-gray-700 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center space-x-2">
          <GitBranch className="h-4 w-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-300">Source Control</span>
        </div>
      </div>

      {/* Current Branch */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GitBranch className="h-3 w-3 text-blue-400" />
            <span className="text-xs text-gray-300">main</span>
          </div>
          <Badge className="bg-green-100 text-green-800 text-xs">
            Current
          </Badge>
        </div>
      </div>

      {/* Version History */}
      <div className="flex flex-col h-[calc(100%-120px)]">
        <div className="p-3 border-b border-gray-700">
          <div className="flex items-center space-x-2">
            <History className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-300">Version History</span>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3">
          <div className="space-y-2">
            {commits.map((commit, index) => (
              <div
                key={commit.id}
                className="bg-gray-700 rounded-lg p-3 hover:bg-gray-600 transition-colors"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">
                      {commit.message}
                    </p>
                    <div className="flex items-center space-x-2 mt-1">
                      <User className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-400">{commit.author}</span>
                    </div>
                  </div>
                  {index !== 0 && (
                    <button
                      onClick={() => rollbackToCommit(commit.id)}
                      className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors text-gray-300 hover:text-white hover:bg-gray-600 p-1 h-6 w-6"
                    >
                      <RotateCcw className="h-3 w-3" />
                    </button>
                  )}
                </div>
                
                <div className="flex items-center justify-between text-xs text-gray-400">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{commit.timestamp}</span>
                  </div>
                  <span>{commit.changes} changes</span>
                </div>
                
                <div className="mt-2">
                  <code className="text-xs text-gray-300 bg-gray-800 px-2 py-1 rounded">
                    {commit.id}
                  </code>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SourceControlPanel;
