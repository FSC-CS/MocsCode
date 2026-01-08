import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ShareDialog from '@/components/ShareDialog';
import MemberManagementDialog from '@/components/MemberManagementDialog';

// Feature imports
import { 
  EditorHeader, 
  EditorToolbar, 
  EditorSidebar, 
  EditorChatSidebar, 
  EditorMainArea 
} from './components';
import { 
  useEditorSettings, 
  useProjectMembers, 
  useFileManagement, 
  useCodeExecution 
} from './hooks';
import type { 
  Project, 
  Collaborator, 
  EnhancedMember, 
  CodeEditorProps 
} from './types';

const CodeEditor = ({ project, onBack, collaborators = [] }: CodeEditorProps) => {
  const { toast } = useToast();
  const { user, dbUser } = useAuth();

  // Layout state
  const [fileExplorerWidth, setFileExplorerWidth] = useState(250);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(300);
  const [editorHeight, setEditorHeight] = useState(70);

  // Dialog state
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<EnhancedMember | null>(null);

  // Online users state
  const [onlineUsers, setOnlineUsers] = useState<Array<{ userId: string; userName: string }>>([]);

  // Use custom hooks
  const editorSettings = useEditorSettings();
  
  const projectMembers = useProjectMembers({ 
    projectId: project?.id 
  });

  const fileManagement = useFileManagement({ 
    projectId: project?.id 
  });

  const codeExecution = useCodeExecution({ 
    projectId: project?.id,
    projectLanguage: project?.language 
  });

  // Check if current user can manage project
  const canManageProject = useCallback((): boolean => {
    return projectMembers.currentUserRole === 'owner' || 
           (projectMembers.currentUserRole === 'editor' && project?.owner_id === user?.id);
  }, [projectMembers.currentUserRole, project?.owner_id, user?.id]);

  const canManageMembers = canManageProject;

  // Memoize collaborators list
  const collaboratorsList = useMemo(() => {
    if (collaborators && collaborators.length > 0) {
      return collaborators;
    }

    return (projectMembers.projectMembers || [])
      .filter(member => member?.user_id && member.user_id !== user?.id)
      .map(member => {
        if (!member) return null;
        
        const stringToColor = (str: string) => {
          let hash = 0;
          for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
          }
          const hue = Math.abs(hash % 360);
          return `hsl(${hue}, 70%, 60%)`;
        };

        const userId = member.user_id || member.id;
        if (!userId) return null;

        return {
          id: Number(userId),
          name: member.user?.username || 'Unknown',
          color: stringToColor(userId),
          cursor: null,
          isTyping: false,
          accessLevel: member.role === 'owner' ? 'owner' : 
                       member.role === 'editor' ? 'edit' : 'view'
        };
      })
      .filter(Boolean) as Collaborator[];
  }, [collaborators, projectMembers.projectMembers, user?.id]);

  const effectiveCollaborators = useMemo(() => {
    return collaborators && collaborators.length > 0 ? collaborators : collaboratorsList;
  }, [collaborators, collaboratorsList]);

  // Callback for online users updates
  const onlineUsersUpdateCallback = useCallback((data: { users: Array<{ userId: string; userName: string }> }) => {
    setOnlineUsers(data.users || []);
  }, []);

  // Handle connection status changes
  const handleConnectionChange = useCallback(() => {
    if (navigator.onLine) {
      toast({
        title: 'Connection Restored',
        description: 'Refreshing collaborator data...'
      });
      projectMembers.forceRefreshMembers();
    } else {
      projectMembers.setAutoRefreshEnabled(false);
      toast({
        title: 'Connection Lost',
        description: 'Collaborator updates paused until connection is restored',
        variant: 'destructive'
      });
    }
  }, [toast, projectMembers]);

  // Listen for online/offline events
  useEffect(() => {
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, [handleConnectionChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        fileManagement.saveCurrentFile(false);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fileManagement.saveCurrentFile]);

  // Handle member click with permission validation
  const handleMemberClick = useCallback((member: EnhancedMember) => {
    if (!canManageMembers()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to manage project members',
        variant: 'destructive'
      });
      return;
    }
    
    if (member.user_id === user?.id) {
      toast({
        title: 'Cannot Modify Self',
        description: 'You cannot modify your own permissions',
        variant: 'destructive'
      });
      return;
    }

    if (member.role === 'owner' && projectMembers.currentUserRole !== 'owner') {
      toast({
        title: 'Cannot Modify Owner',
        description: 'Only the project owner can modify owner permissions',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedMember(member);
    setShowMemberDialog(true);
  }, [canManageMembers, user?.id, projectMembers.currentUserRole, toast]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header with Toolbar */}
      <EditorHeader
        project={project}
        onBack={onBack}
        currentUserRole={projectMembers.currentUserRole}
      >
        <EditorToolbar
          tabSize={editorSettings.tabSize}
          setTabSize={editorSettings.setTabSize}
          autocomplete={editorSettings.autocomplete}
          setAutocomplete={editorSettings.setAutocomplete}
          syntaxTheme={editorSettings.syntaxTheme}
          setSyntaxTheme={editorSettings.setSyntaxTheme}
          settingsOpen={editorSettings.settingsOpen}
          setSettingsOpen={editorSettings.setSettingsOpen}
          currentUserRole={projectMembers.currentUserRole}
          isRunning={codeExecution.isRunning}
          onRunCode={codeExecution.runCode}
          onShare={() => setShowShareDialog(true)}
          onSave={() => fileManagement.saveCurrentFile(false)}
          canManageMembers={canManageMembers()}
        />
      </EditorHeader>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <EditorSidebar
          project={project}
          currentFileName={fileManagement.openFiles[fileManagement.activeFileIndex]?.name || ''}
          onFileSelect={fileManagement.openFile}
          onFileRenamed={fileManagement.handleFileRenamed}
          onFileDeleted={fileManagement.handleFileDeleted}
          onMemberClick={handleMemberClick}
          onInviteClick={() => setShowShareDialog(true)}
          memberRefreshTrigger={projectMembers.memberRefreshTrigger}
          onlineUsers={onlineUsers}
          width={fileExplorerWidth}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
          onWidthChange={setFileExplorerWidth}
        />

        {/* Main Editor Area */}
        <EditorMainArea
          openFiles={fileManagement.openFiles}
          activeFileIndex={fileManagement.activeFileIndex}
          activeFile={fileManagement.activeFile}
          setActiveFileIndex={fileManagement.setActiveFileIndex}
          closeFile={fileManagement.closeFile}
          updateFileContent={fileManagement.updateFileContent}
          tabSize={editorSettings.tabSize}
          autocomplete={editorSettings.autocomplete}
          syntaxTheme={editorSettings.syntaxTheme}
          editorHeight={editorHeight}
          setEditorHeight={setEditorHeight}
          isSidebarCollapsed={isSidebarCollapsed}
          isChatPanelCollapsed={isChatPanelCollapsed}
          fileExplorerWidth={fileExplorerWidth}
          chatPanelWidth={chatPanelWidth}
          output={codeExecution.output}
          setOutput={codeExecution.setOutput}
          isRunning={codeExecution.isRunning}
          stdin={codeExecution.stdin}
          setStdin={codeExecution.setStdin}
          compileScript={codeExecution.compileScript}
          setCompileScript={codeExecution.setCompileScript}
          runScript={codeExecution.runScript}
          setRunScript={codeExecution.setRunScript}
        />

        {/* Right Sidebar - Chat */}
        <EditorChatSidebar
          projectId={project.id}
          collaborators={effectiveCollaborators}
          projectMembers={projectMembers.projectMembers}
          currentUser={dbUser}
          isLoadingMembers={projectMembers.isLoadingMembers}
          memberOperationStatus={projectMembers.memberOperationStatus}
          onMemberClick={handleMemberClick}
          onInviteClick={() => setShowShareDialog(true)}
          canManageMembers={canManageProject()}
          onlineUsersUpdateCallback={onlineUsersUpdateCallback}
          width={chatPanelWidth}
          isCollapsed={isChatPanelCollapsed}
          onToggleCollapse={() => setIsChatPanelCollapsed(!isChatPanelCollapsed)}
          onWidthChange={setChatPanelWidth}
        />
      </div>
      
      {/* Share Dialog */}
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          project={{
            id: project.id,
            name: project.name,
            owner_id: project.owner_id || user?.id || ''
          }}
          onMemberAdded={projectMembers.handleMemberAdded}
        />
      )}

      {/* Member Management Dialog */}
      {showMemberDialog && selectedMember && (
        <MemberManagementDialog
          isOpen={showMemberDialog}
          onClose={() => {
            setShowMemberDialog(false);
            setSelectedMember(null);
          }}
          member={selectedMember}
          projectId={project.id}
          onMemberUpdated={projectMembers.handleMemberUpdated}
          onMemberRemoved={projectMembers.handleMemberRemoved}
          onMembersChanged={() => projectMembers.setMemberRefreshTrigger(t => t + 1)}
        />
      )}
    </div>
  );
};

export default CodeEditor;
