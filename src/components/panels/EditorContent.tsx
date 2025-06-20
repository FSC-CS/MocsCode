import React from 'react';
import { PanelId } from '@/contexts/PanelContext';
import { PanelContainer } from './PanelContainer';

export const EditorContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {children}
    </div>
  );
};

export const EditorPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer panelId="editor" title="Editor" position="main" className="flex-1">
      <div className="h-full">
        {children}
      </div>
    </PanelContainer>
  );
};

export const OutputPanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer 
      panelId="output" 
      title="Output" 
      position="bottom"
      defaultSize={200}
      minSize={100}
      maxSize={500}
    >
      {children}
    </PanelContainer>
  );
};

export const ExplorerPanel: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer 
      panelId="explorer" 
      title="Explorer" 
      position="left"
      defaultSize={250}
      minSize={180}
      maxSize={400}
    >
      {children}
    </PanelContainer>
  );
};

export const RightPanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="flex flex-col h-full w-80 min-w-[200px] max-w-[600px] border-l border-gray-700">
      {children}
    </div>
  );
};

export const ChatPanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer 
      panelId="chat" 
      title="Chat" 
      position="right"
      defaultSize={300}
      minSize={200}
      maxSize={600}
    >
      {children}
    </PanelContainer>
  );
};

export const CollaboratorsPanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer 
      panelId="collaborators" 
      title="Collaborators" 
      position="right"
      defaultSize={300}
      minSize={200}
      maxSize={600}
    >
      {children}
    </PanelContainer>
  );
};

export const VersionsPanelContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <PanelContainer 
      panelId="versions" 
      title="Versions" 
      position="right"
      defaultSize={300}
      minSize={200}
      maxSize={600}
    >
      {children}
    </PanelContainer>
  );
};
