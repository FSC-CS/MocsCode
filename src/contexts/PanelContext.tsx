import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type PanelId = 'chat' | 'collaborators' | 'versions' | 'explorer' | 'output' | 'editor';

type PanelPosition = 'left' | 'right' | 'bottom' | 'main';

interface PanelState {
  id: PanelId;
  position: PanelPosition;
  isOpen: boolean;
  isMinimized: boolean;
  tabGroup?: string;
}

interface PanelGroup {
  id: string;
  activeTab: PanelId;
  tabs: PanelId[];
  position: PanelPosition;
}

interface PanelContextType {
  panels: Record<PanelId, PanelState>;
  panelGroups: Record<string, PanelGroup>;
  movePanel: (panelId: PanelId, position: PanelPosition, tabGroupId?: string) => void;
  togglePanel: (panelId: PanelId) => void;
  minimizePanel: (panelId: PanelId, isMinimized: boolean) => void;
  closePanel: (panelId: PanelId) => void;
  setActiveTab: (tabGroupId: string, panelId: PanelId) => void;
  addToTabGroup: (panelId: PanelId, tabGroupId: string) => void;
  removeFromTabGroup: (panelId: PanelId) => void;
}

const defaultPanels: Record<PanelId, PanelState> = {
  explorer: { id: 'explorer', position: 'left', isOpen: true, isMinimized: false },
  editor: { id: 'editor', position: 'main', isOpen: true, isMinimized: false },
  output: { id: 'output', position: 'bottom', isOpen: true, isMinimized: false },
  chat: { id: 'chat', position: 'right', isOpen: true, isMinimized: false, tabGroup: 'right-tabs' },
  collaborators: { id: 'collaborators', position: 'right', isOpen: false, isMinimized: false, tabGroup: 'right-tabs' },
  versions: { id: 'versions', position: 'right', isOpen: false, isMinimized: false },
};

const defaultPanelGroups: Record<string, PanelGroup> = {
  'right-tabs': {
    id: 'right-tabs',
    activeTab: 'chat',
    tabs: ['chat', 'collaborators'],
    position: 'right',
  },
};

const PanelContext = createContext<PanelContextType | undefined>(undefined);

export const PanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [panels, setPanels] = useState<Record<PanelId, PanelState>>(defaultPanels);
  const [panelGroups, setPanelGroups] = useState<Record<string, PanelGroup>>(defaultPanelGroups);

  const movePanel = useCallback((panelId: PanelId, position: PanelPosition, tabGroupId?: string) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        position,
        isMinimized: false,
        tabGroup: tabGroupId,
      },
    }));

    if (tabGroupId) {
      setPanelGroups(prev => ({
        ...prev,
        [tabGroupId]: {
          ...prev[tabGroupId],
          position,
          tabs: [...(prev[tabGroupId]?.tabs || []), panelId],
        },
      }));
    }
  }, []);

  const togglePanel = useCallback((panelId: PanelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        isOpen: !prev[panelId].isOpen,
        isMinimized: false,
      },
    }));
  }, []);

  const minimizePanel = useCallback((panelId: PanelId, isMinimized: boolean) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        isMinimized,
      },
    }));
  }, []);

  const closePanel = useCallback((panelId: PanelId) => {
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...prev[panelId],
        isOpen: false,
      },
    }));
  }, []);

  const setActiveTab = useCallback((tabGroupId: string, panelId: PanelId) => {
    setPanelGroups(prev => ({
      ...prev,
      [tabGroupId]: {
        ...prev[tabGroupId],
        activeTab: panelId,
      },
    }));
  }, []);

  const addToTabGroup = useCallback((panelId: PanelId, tabGroupId: string) => {
    const panel = panels[panelId];
    const tabGroup = panelGroups[tabGroupId];
    
    if (!tabGroup || !panel) return;

    // Remove from any existing tab group
    const updatedGroups = { ...panelGroups };
    Object.entries(updatedGroups).forEach(([groupId, group]) => {
      updatedGroups[groupId] = {
        ...group,
        tabs: group.tabs.filter(id => id !== panelId),
      };
      
      if (group.activeTab === panelId) {
        updatedGroups[groupId].activeTab = group.tabs[0] || null;
      }
    });

    // Add to new tab group
    updatedGroups[tabGroupId] = {
      ...tabGroup,
      tabs: [...new Set([...tabGroup.tabs, panelId])],
      activeTab: panelId,
    };

    setPanelGroups(updatedGroups);
    
    // Update panel position and tab group
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...panel,
        position: tabGroup.position,
        tabGroup: tabGroupId,
        isOpen: true,
        isMinimized: false,
      },
    }));
  }, [panels, panelGroups]);

  const removeFromTabGroup = useCallback((panelId: PanelId) => {
    const panel = panels[panelId];
    if (!panel || !panel.tabGroup) return;

    const tabGroupId = panel.tabGroup;
    const tabGroup = panelGroups[tabGroupId];
    
    if (!tabGroup) return;

    // Remove from tab group
    const updatedGroups = { ...panelGroups };
    updatedGroups[tabGroupId] = {
      ...tabGroup,
      tabs: tabGroup.tabs.filter(id => id !== panelId),
    };

    if (tabGroup.activeTab === panelId) {
      updatedGroups[tabGroupId].activeTab = updatedGroups[tabGroupId].tabs[0] || null;
    }

    // Remove tab group if empty
    if (updatedGroups[tabGroupId].tabs.length === 0) {
      delete updatedGroups[tabGroupId];
    }

    setPanelGroups(updatedGroups);
    
    // Update panel
    setPanels(prev => ({
      ...prev,
      [panelId]: {
        ...panel,
        tabGroup: undefined,
      },
    }));
  }, [panels, panelGroups]);

  return (
    <PanelContext.Provider
      value={{
        panels,
        panelGroups,
        movePanel,
        togglePanel,
        minimizePanel,
        closePanel,
        setActiveTab,
        addToTabGroup,
        removeFromTabGroup,
      }}
    >
      {children}
    </PanelContext.Provider>
  );
};

export const usePanels = () => {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error('usePanels must be used within a PanelProvider');
  }
  return context;
};
