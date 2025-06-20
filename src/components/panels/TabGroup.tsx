import React from 'react';
import { PanelId } from '@/contexts/PanelContext';
import { cn } from '@/lib/utils';

interface TabGroupProps {
  activeTab: PanelId;
  tabs: PanelId[];
  onTabClick: (tabId: PanelId) => void;
  onTabClose?: (tabId: PanelId) => void;
  className?: string;
}

export const TabGroup: React.FC<TabGroupProps> = ({
  activeTab,
  tabs,
  onTabClick,
  onTabClose,
  className,
}) => {
  if (tabs.length <= 1) return null;

  return (
    <div className={cn('flex border-b border-gray-700 bg-gray-900/50', className)}>
      {tabs.map((tabId) => (
        <div
          key={tabId}
          className={cn(
            'flex items-center px-4 py-2 text-sm font-medium cursor-pointer',
            activeTab === tabId
              ? 'text-blue-400 border-b-2 border-blue-500 bg-gray-800'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50'
          )}
          onClick={() => onTabClick(tabId)}
        >
          <span className="truncate">{tabId}</span>
          {onTabClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTabClose(tabId);
              }}
              className="ml-2 text-gray-400 hover:text-gray-200"
              aria-label={`Close ${tabId}`}
            >
              <svg width="12" height="12" viewBox="0 0 12 12">
                <path
                  fill="currentColor"
                  d="M2.22 2.22a.75.75 0 011.06 0L6 4.94l2.72-2.72a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z"
                />
              </svg>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
