import React from 'react';
import ChatPanel from '@/components/ChatPanel';
import type { Collaborator, EnhancedMember, MemberOperationStatus } from '../types';

interface EditorChatSidebarProps {
  projectId: string;
  collaborators: Collaborator[];
  projectMembers: EnhancedMember[];
  currentUser: any;
  isLoadingMembers: boolean;
  memberOperationStatus: MemberOperationStatus;
  onMemberClick: (member: EnhancedMember) => void;
  onInviteClick: () => void;
  canManageMembers: boolean;
  onlineUsersUpdateCallback: (data: { users: Array<{ userId: string; userName: string }> }) => void;
  width: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onWidthChange: (width: number) => void;
}

export function EditorChatSidebar({
  projectId,
  collaborators,
  projectMembers,
  currentUser,
  isLoadingMembers,
  memberOperationStatus,
  onMemberClick,
  onInviteClick,
  canManageMembers,
  onlineUsersUpdateCallback,
  width,
  isCollapsed,
  onToggleCollapse,
  onWidthChange,
}: EditorChatSidebarProps) {
  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = width;
    
    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = startX - moveEvent.clientX;
      const newWidth = startWidth + delta;
      onWidthChange(Math.max(200, Math.min(600, newWidth)));
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
          className={`absolute -left-5 top-2 w-6 h-8 flex items-center justify-center ${isCollapsed ? 'bg-gray-700' : 'bg-gray-600'} hover:bg-blue-600 text-white transition-all duration-200 z-30 rounded-l-md border-y border-l border-gray-500`}
          aria-label={isCollapsed ? 'Expand chat' : 'Collapse chat'}
        >
          <div className={`transform transition-transform duration-200 ${isCollapsed ? 'rotate-0' : 'rotate-180'}`}>
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
      
      {/* Chat Panel Content */}
      <div 
        className="bg-gray-800 border-l border-gray-700 flex flex-col h-full flex-shrink-0 overflow-hidden"
        style={{
          width: isCollapsed ? 0 : '100%',
          minWidth: isCollapsed ? 0 : 200,
          maxWidth: isCollapsed ? 0 : '100%',
        }}
      >
        {!isCollapsed && (
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ChatPanel 
              collaborators={collaborators}
              projectMembers={projectMembers}
              currentUser={currentUser}
              isLoadingMembers={isLoadingMembers}
              memberOperationStatus={memberOperationStatus}
              onMemberClick={onMemberClick}
              onInviteClick={onInviteClick}
              canManageMembers={canManageMembers}
              projectId={projectId}
              onlineUsersUpdateCallback={onlineUsersUpdateCallback}
            />
          </div>
        )}
      </div>
    </div>
  );
}
