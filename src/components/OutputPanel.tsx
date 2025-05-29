
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, Trash2 } from 'lucide-react';

interface OutputPanelProps {
  output: string;
  isRunning: boolean;
}

const OutputPanel = ({ output, isRunning }: OutputPanelProps) => {
  return (
    <div className="h-full flex flex-col bg-gray-800">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-300">Output</h3>
          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <Card className="p-4 bg-gray-900 border-gray-600 h-full">
          {isRunning ? (
            <div className="flex items-center space-x-2 text-yellow-400">
              <div className="animate-spin">
                <Play className="h-4 w-4" />
              </div>
              <span className="text-sm">Running code...</span>
            </div>
          ) : output ? (
            <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono">
              {output}
            </pre>
          ) : (
            <div className="text-center text-gray-500 mt-8">
              <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Click "Run Code" to see output here</p>
            </div>
          )}
        </Card>
      </div>

      <div className="p-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Java Runtime: OpenJDK 11</span>
          <span>Memory: 128MB</span>
        </div>
      </div>
    </div>
  );
};

export default OutputPanel;
