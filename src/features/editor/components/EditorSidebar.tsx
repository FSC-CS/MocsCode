import React from 'react';
import FileExplorer from '@/components/FileExplorer';
import CollaboratorPanel from '@/components/CollaboratorPanel';
import type { Project } from '../types';

interface EditorSidebarProps {
  project: Project;
  currentFileName: string;
  onFileSelect: (filename: string, fileId: string) => void;
  onFileRenamed: (fileId: string, oldName: string, newName: string) => void;
  onFileDeleted: (fileId: string) => void;
  onMemberClick: (member: any) => void;
  onInviteClick: () => void;
  memberRefreshTrigger: number;
  onlineUsers: Array<{ userId: string; userName: string }>;
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onWidthChange: (width: number) => void;
}

export function EditorSidebar({
  project,
  currentFileName,
  onFileSelect,
  onFileRenamed,
  onFileDeleted,
  onMemberClick,
  onInviteClick,
  memberRefreshTrigger,
  onlineUsers,
  width,
  isCollapsed,
  onToggleCollapse,
  onWidthChange,
}: EditorSidebarProps) {
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = width;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      const newWidth = startWidth + delta;
      onWidthChange(Math.max(172, Math.min(600, newWidth)));
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp, { once: true });
  };

  return (
    <div 
      className="flex flex-row h-full bg-gray-800" 
      style={{ width: isCollapsed ? '4px' : `${width}px` }}
    >
      {/* Sidebar Content */}
      <div 
        className="bg-gray-800 border-r border-gray-700 flex flex-col h-full flex-shrink-0 overflow-hidden"
        style={{
          width: isCollapsed ? 0 : '100%',
          minWidth: isCollapsed ? 0 : 172,
          maxWidth: isCollapsed ? 0 : '100%',
        }}
      >
        {!isCollapsed && (
          <>
            <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 16rem)' }}>
              <FileExplorer 
                currentFile={currentFileName} 
                onFileSelect={onFileSelect}
                onFileRenamed={onFileRenamed}
                onFileDeleted={onFileDeleted}
                projectId={project.id}
              />
            </div>
            <div className="border-t border-gray-700 h-64 overflow-y-auto" style={{ height: '16rem' }}>
              <CollaboratorPanel 
                projectId={project.id}
                onMemberClick={onMemberClick}
                onInviteClick={onInviteClick}
                refreshTrigger={memberRefreshTrigger}
                onlineUsers={onlineUsers}
              />
            </div>
          </>
        )}
      </div>
      
      {/* Resize handle and collapse tab */}
      <div className="relative h-full flex-shrink-0 w-1">
        {/* Resize handle - thin bar */}
        <div 
          className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 z-20"
          onMouseDown={handleResizeStart}
        />
        
        {/* Small collapse tab - positioned near top like a file tab */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
          className={`absolute left-0 top-2 w-6 h-8 flex items-center justify-center ${isCollapsed ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-blue-600 text-white transition-all duration-200 z-30 rounded-r-md border-y border-r border-gray-500`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <div className={`transform transition-transform duration-200 ${isCollapsed ? 'rotate-180' : 'rotate-0'}`}>
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="10" 
              height="10" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              className="text-gray-300"
            >
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </div>
        </button>
        
      </div>
    </div>
  );
}
