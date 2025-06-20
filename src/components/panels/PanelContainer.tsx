import React, { useMemo } from 'react';
import { usePanels, PanelId } from '@/contexts/PanelContext';
import { DraggablePanel } from './DraggablePanel';
import { TabGroup } from './TabGroup';

interface PanelContainerProps {
  panelId: PanelId;
  title: string;
  children: React.ReactNode;
  className?: string;
  position?: 'left' | 'right' | 'bottom' | 'main';
  defaultSize?: number | string;
  minSize?: number;
  maxSize?: number;
  onResize?: (size: number) => void;
}

export const PanelContainer: React.FC<PanelContainerProps> = ({
  panelId,
  title,
  children,
  className,
  position = 'right',
  defaultSize,
  minSize = 200,
  maxSize = 800,
  onResize,
}) => {
  const {
    panels,
    panelGroups,
    togglePanel,
    minimizePanel,
    closePanel,
    setActiveTab,
    removeFromTabGroup,
  } = usePanels();

  const panel = panels[panelId];
  const tabGroup = panel?.tabGroup ? panelGroups[panel.tabGroup] : null;
  const isInTabGroup = !!tabGroup;
  const isActiveTab = isInTabGroup ? tabGroup?.activeTab === panelId : true;
  const isMinimized = panel?.isMinimized || false;

  // Only render if panel is open or in a tab group
  if (!panel?.isOpen && !isInTabGroup) return null;

  // If in a tab group but not the active tab, only render the tab header
  if (isInTabGroup && !isActiveTab) return null;

  const handleMinimize = () => {
    minimizePanel(panelId, true);
  };

  const handleRestore = () => {
    minimizePanel(panelId, false);
  };

  const handleClose = () => {
    if (isInTabGroup) {
      // If in a tab group, remove from the group
      removeFromTabGroup(panelId);
    } else {
      // Otherwise, close the panel
      closePanel(panelId);
    }
  };

  const handleActivate = () => {
    if (isInTabGroup) {
      setActiveTab(panel.tabGroup!, panelId);
    }
  };

  const handleTabClick = (tabId: PanelId) => {
    setActiveTab(panel.tabGroup!, tabId);
  };

  const handleTabClose = (tabId: PanelId) => {
    removeFromTabGroup(tabId);
  };

  // Calculate panel dimensions based on position
  const panelStyle = useMemo(() => {
    const style: React.CSSProperties = {};
    
    if (position === 'left' || position === 'right') {
      style.width = defaultSize || '300px';
      style.minWidth = `${minSize}px`;
      style.maxWidth = `${maxSize}px`;
    } else if (position === 'bottom') {
      style.height = defaultSize || '200px';
      style.minHeight = `${minSize}px`;
      style.maxHeight = `${maxSize}px`;
    }
    
    return style;
  }, [position, defaultSize, minSize, maxSize]);

  const containerClasses = cn(
    'flex flex-col h-full',
    {
      'border-l border-gray-700': position === 'right',
      'border-r border-gray-700': position === 'left',
      'border-t border-gray-700': position === 'bottom',
    },
    className
  );

  return (
    <div className={containerClasses} style={panelStyle}>
      {isInTabGroup && tabGroup && (
        <TabGroup
          activeTab={tabGroup.activeTab}
          tabs={tabGroup.tabs}
          onTabClick={handleTabClick}
          onTabClose={handleTabClose}
        />
      )}
      
      <DraggablePanel
        id={panelId}
        title={title}
        isActive={isActiveTab}
        isMinimized={isMinimized}
        onActivate={handleActivate}
        onMinimize={handleMinimize}
        onRestore={handleRestore}
        onClose={handleClose}
        showHeader={!isInTabGroup}
        className="flex-1"
      >
        {children}
      </DraggablePanel>
    </div>
  );
};

function cn(...classes: Array<string | Record<string, boolean> | undefined | boolean>): string {
  return classes
    .filter(Boolean)
    .map(c => {
      if (typeof c === 'object' && c !== null) {
        return Object.entries(c)
          .filter(([_, value]) => value)
          .map(([key]) => key)
          .join(' ');
      }
      return c;
    })
    .filter(Boolean)
    .join(' ');
}
