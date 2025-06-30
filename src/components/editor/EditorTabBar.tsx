import React from 'react';
import { Button } from '@/components/ui/button';
import { FileText, X as XIcon } from 'lucide-react';

export interface EditorTabBarProps {
  openFiles: { name: string; id?: string }[];
  activeFileIndex: number;
  setActiveFileIndex: (index: number) => void;
  closeFile: (index: number) => void;
}

const EditorTabBar: React.FC<EditorTabBarProps> = ({ openFiles, activeFileIndex, setActiveFileIndex, closeFile }) => {
  return (
    <div className="bg-gray-800 border-b border-gray-700 px-4 py-2">
      <div className="flex items-center space-x-1 overflow-x-auto">
        {openFiles.map((file, index) => (
          <div
            key={`${file.name}-${index}`}
            className={`flex items-center space-x-2 px-3 py-1 rounded-t-lg text-sm cursor-pointer group min-w-0 ${
              index === activeFileIndex
                ? 'bg-gray-700 text-white'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            }`}
            onClick={() => setActiveFileIndex(index)}
          >
            <FileText className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{file.name}</span>
            {openFiles.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={e => {
                  e.stopPropagation();
                  closeFile(index);
                }}
                className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
              >
                <XIcon className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default EditorTabBar;
