
import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Square, Trash2 } from 'lucide-react';

interface OutputPanelProps {
  output: string;
  isRunning: boolean;
  compileScript: string;
  setCompileScript: React.Dispatch<React.SetStateAction<string>>;
  runScript: string;
  setRunScript: React.Dispatch<React.SetStateAction<string>>;
}

const OutputPanel = ({ 
  output,
  isRunning,
  compileScript,
  setCompileScript,
  runScript,
  setRunScript,
 }: OutputPanelProps) => {
  const [activeTab, setActiveTab] = React.useState<'output' | 'config'>('output');

  return (
    <div className="h-full flex flex-col bg-gray-800">
      {/* Tabs Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex space-x-4">
            <button
              className={`text-sm font-medium px-2 py-1 rounded transition-colors ${activeTab === 'output' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('output')}
            >
              Output
            </button>
            <button
              className={`text-sm font-medium px-2 py-1 rounded transition-colors ${activeTab === 'config' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
              onClick={() => setActiveTab('config')}
            >
              Config
            </button>
          </div>
          <div className="flex space-x-2">
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'output' ? (
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
        ) : (
          <Card className="p-4 bg-gray-900 border-gray-600 h-full">
            <div className="mb-6">
              <label htmlFor="compile-sh" className="block text-xs font-semibold text-gray-400 mb-1">
                compile.sh (Optional)
              </label>
              <textarea
                id="compile-sh"
                className="w-full min-h-[48px] max-h-40 p-2 text-sm font-mono bg-gray-800 text-gray-200 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                value={compileScript}
                onChange={e => setCompileScript(e.target.value)}
                spellCheck={false}
              />
            </div>
            <div>
              <label htmlFor="run-sh" className="block text-xs font-semibold text-gray-400 mb-1">
                run.sh
              </label>
              <textarea
                id="run-sh"
                className="w-full min-h-[48px] max-h-40 p-2 text-sm font-mono bg-gray-800 text-gray-200 border border-gray-700 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                value={runScript}
                onChange={e => setRunScript(e.target.value)}
                spellCheck={false}
              />
            </div>
          </Card>
        )}
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
