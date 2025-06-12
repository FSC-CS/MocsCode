
import React, { useState, useRef, useEffect, useCallback } from 'react';
import CodeMirrorEditor from '../editor/CodeMirrorEditor';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Pencil, Check, X as XIcon, ArrowLeft, Play, Share, FileText, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ShareDialog from './ShareDialog';
import MemberManagementDialog from './MemberManagementDialog';
import FileExplorer from './FileExplorer';
import OutputPanel from './OutputPanel';
import ChatPanel from './ChatPanel';
import CollaboratorPanel from './CollaboratorPanel';
import SourceControlPanel from './SourceControlPanel';
import ResizablePanel from './ResizablePanel'; // Add this import

interface CodeEditorProps {
  project: any;
  onBack: () => void;
}

interface OpenFile {
  name: string;
  content: string;
  language: string;
  id?: string;
}

// Enhanced member interface to match what we expect from the API
interface EnhancedMember {
  id: string;
  project_id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  permissions: Record<string, unknown>;
  invited_by?: string;
  joined_at: string;
  user?: {
    id: string;
    email: string;
    username: string;
    display_name?: string;
    avatar_url?: string;
  };
}

const CodeEditor = ({ project, onBack }: CodeEditorProps) => {
  // Sidebar tab state: 'chat' or 'collaborators'
  const [activeSidebarTab, setActiveSidebarTab] = useState<'chat' | 'collaborators'>('chat');
  const { toast } = useToast();
  const { projectFilesApi, projectMembersApi, projectsApi } = useApi();
  const { user, dbUser } = useAuth();
  
  // Project renaming state
  const [isRenaming, setIsRenaming] = useState(false);
  const [newProjectName, setNewProjectName] = useState(project?.name || '');
  
  // File management state
  const [openFiles, setOpenFiles] = useState<(OpenFile & { id?: string })[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);
  const [editorHeight, setEditorHeight] = useState(400);
  const [fileExplorerWidth, setFileExplorerWidth] = useState(256);
  const [chatPanelWidth, setChatPanelWidth] = useState(320);
  
  // Members and collaboration state
  const [projectMembers, setProjectMembers] = useState<EnhancedMember[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'editor' | 'viewer' | null>(null);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [memberRefreshTrigger, setMemberRefreshTrigger] = useState(0);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showMemberDialog, setShowMemberDialog] = useState(false);
  const [selectedMember, setSelectedMember] = useState<EnhancedMember | null>(null);
  const [memberOperationStatus, setMemberOperationStatus] = useState<{
    type: 'idle' | 'loading' | 'error';
    error?: Error | null;
  }>({ type: 'idle' });
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef(null);

  // Load project members when component mounts or when refresh is triggered
  useEffect(() => {
    if (project?.id && user?.id) {
      loadProjectMembers();
    }
  }, [project?.id, user?.id, memberRefreshTrigger]);

  // Set up auto-refresh for member list (every 30 seconds when enabled)
  useEffect(() => {
    if (!autoRefreshEnabled || !project?.id || !user?.id) {
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      // Only auto-refresh if no member operations are in progress
      if (memberOperationStatus.type === 'idle') {
        loadProjectMembers(true); // Silent refresh
      }
    }, 30000); // 30 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefreshEnabled, project?.id, user?.id, memberOperationStatus.type]);

  // Transform project members to chat collaborators format
  const collaborators = React.useMemo(() => {
    return projectMembers
      .filter(member => member.user_id !== user?.id) // Exclude current user
      .map(member => ({
        id: member.id,
        name: member.user?.display_name || member.user?.username || 'Unknown',
        avatar: member.user?.avatar_url || undefined,
        email: member.user?.email,
        role: member.role,
        isOnline: true // You might want to implement actual online status tracking
      }));
  }, [projectMembers, user?.id]);

  // Cleanup auto-refresh on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const loadProjectMembers = async (silent: boolean = false) => {
    if (!project?.id || !user?.id) return;

    if (!silent) {
      setIsLoadingMembers(true);
    }
    
    try {
      const { data, error } = await projectMembersApi.listProjectMembers(
        project.id,
        { page: 1, per_page: 50 },
        { field: 'role', direction: 'desc' }
      );

      if (error) {
        console.error('Error loading project members:', error);
        if (!silent) {
          toast({
            title: 'Error',
            description: 'Failed to load project collaborators',
            variant: 'destructive'
          });
        }
        return;
      }

      const members = data?.items || [];
      
      // Check if member list has actually changed to avoid unnecessary updates
      if (!silent || !arraysEqual(members, projectMembers)) {
        setProjectMembers(members);
        setLastRefresh(new Date());
      }

      // Set current user's role
      const currentMember = members.find(member => member.user_id === user.id);
      if (currentMember && currentMember.role !== currentUserRole) {
        setCurrentUserRole(currentMember.role);
      }

    } catch (error) {
      console.error('Unexpected error loading members:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while loading collaborators',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) {
        setIsLoadingMembers(false);
      }
    }
  };

  // Utility function to compare member arrays
  const arraysEqual = (a: EnhancedMember[], b: EnhancedMember[]): boolean => {
    if (a.length !== b.length) return false;
    return a.every((member, index) => 
      member.id === b[index]?.id && 
      member.role === b[index]?.role &&
      member.user_id === b[index]?.user_id
    );
  };

  // Force refresh members list
  const forceRefreshMembers = async () => {
    setMemberRefreshTrigger(prev => prev + 1);
    toast({
      title: 'Refreshing',
      description: 'Updating collaborator list...'
    });
  };

  // Check if current user can manage project (owner or editor with management permissions)
  const canManageProject = (): boolean => {
    return currentUserRole === 'owner' || 
           (currentUserRole === 'editor' && project?.owner_id === user?.id);
  };
  
  // Alias for backward compatibility
  const canManageMembers = canManageProject;
  
  // Handle project renaming
  const handleRenameProject = async () => {
    if (!project?.id || !newProjectName.trim()) return;
    
    try {
      const { error } = await projectsApi.updateProject(project.id, {
        name: newProjectName.trim()
      });
      
      if (error) throw error;
      
      // Update local project name
      project.name = newProjectName.trim();
      setIsRenaming(false);
      
      toast({
        title: 'Success',
        description: 'Project name updated successfully',
      });
    } catch (error) {
      console.error('Failed to rename project:', error);
      toast({
        title: 'Error',
        description: 'Failed to update project name',
        variant: 'destructive',
      });
      // Revert to original name on error
      setNewProjectName(project.name);
    }
  };
  
  // Handle key down for renaming input
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleRenameProject();
    } else if (e.key === 'Escape') {
      setIsRenaming(false);
      setNewProjectName(project.name);
    }
  };

  // Handle successful member updates with optimistic updates and rollback
  const handleMemberUpdated = async (updatedMember: EnhancedMember) => {
    setMemberOperationStatus({ type: 'updating', memberId: updatedMember.id });
    
    // Optimistic update
    const originalMembers = [...projectMembers];
    setProjectMembers(prev => 
      prev.map(member => 
        member.id === updatedMember.id ? updatedMember : member
      )
    );

    try {
      // Verify the update was successful by refreshing from server
      await new Promise(resolve => setTimeout(resolve, 500)); // Brief delay for better UX
      await loadProjectMembers(true);
      
      toast({
        title: 'Success',
        description: `${updatedMember.user?.display_name || 'Member'} permissions updated successfully`,
        duration: 3000
      });
    } catch (error) {
      // Rollback on error
      setProjectMembers(originalMembers);
      toast({
        title: 'Update Failed',
        description: 'Failed to update member permissions. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  };

  // Handle member removal with optimistic updates
  const handleMemberRemoved = async (removedMemberId: string) => {
    setMemberOperationStatus({ type: 'removing', memberId: removedMemberId });
    
    // Get member info for feedback
    const removedMember = projectMembers.find(m => m.id === removedMemberId);
    
    // Optimistic update
    const originalMembers = [...projectMembers];
    setProjectMembers(prev => 
      prev.filter(member => member.id !== removedMemberId)
    );

    try {
      // Verify removal and refresh
      await new Promise(resolve => setTimeout(resolve, 500));
      await loadProjectMembers(true);
      
      toast({
        title: 'Success',
        description: `${removedMember?.user?.display_name || 'Member'} removed from project`,
        duration: 3000
      });
    } catch (error) {
      // Rollback on error
      setProjectMembers(originalMembers);
      toast({
        title: 'Removal Failed',
        description: 'Failed to remove member. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  };

  // Handle new member addition with enhanced feedback
  const handleMemberAdded = async (newMember: any) => {
    setMemberOperationStatus({ type: 'adding' });
    
    try {
      // Refresh the members list
      await loadProjectMembers();
      
      toast({
        title: 'Collaborator Added',
        description: `${newMember?.user?.email || 'New member'} has been added to the project`,
        duration: 4000
      });
      
      // Enable auto-refresh for a short period to catch any delayed updates
      setAutoRefreshEnabled(true);
      setTimeout(() => {
        if (memberOperationStatus.type === 'idle') {
          setAutoRefreshEnabled(true); // Keep enabled by default
        }
      }, 10000);
      
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to refresh member list after addition',
        variant: 'destructive'
      });
    } finally {
      setMemberOperationStatus({ type: 'idle' });
    }
  };

  // Handle share dialog invite click
  const handleInviteClick = () => {
    if (!canManageMembers()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to invite collaborators to this project',
        variant: 'destructive'
      });
      return;
    }
    setShowShareDialog(true);
  };

  // Enhanced member click with permission validation
  const handleMemberClick = (member: EnhancedMember) => {
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

    if (member.role === 'owner' && currentUserRole !== 'owner') {
      toast({
        title: 'Cannot Modify Owner',
        description: 'Only the project owner can modify owner permissions',
        variant: 'destructive'
      });
      return;
    }
    
    setSelectedMember(member);
    setShowMemberDialog(true);
  };

  // Handle connection status changes (for auto-refresh management)
  const handleConnectionChange = () => {
    if (navigator.onLine) {
      toast({
        title: 'Connection Restored',
        description: 'Refreshing collaborator data...'
      });
      forceRefreshMembers();
    } else {
      setAutoRefreshEnabled(false);
      toast({
        title: 'Connection Lost',
        description: 'Collaborator updates paused until connection is restored',
        variant: 'destructive'
      });
    }
  };

  // Listen for online/offline events
  useEffect(() => {
    window.addEventListener('online', handleConnectionChange);
    window.addEventListener('offline', handleConnectionChange);
    
    return () => {
      window.removeEventListener('online', handleConnectionChange);
      window.removeEventListener('offline', handleConnectionChange);
    };
  }, []);

  // File management functions (existing functionality)
  const handleEditorDidMount = (editor: any) => {
    editorRef.current = editor;
  };

  const runCode = async () => {
    setIsRunning(true);
    setOutput('');
    const file = openFiles[activeFileIndex];
    if (!file) {
      setOutput('No file selected.');
      setIsRunning(false);
      return;
    }
    // Judge0 language IDs
    const langMap: { [key: string]: number } = {
      'cpp': 54,
      'java': 62,
      'python': 71,
      'javascript': 63,
      'c': 50,
      'csharp': 51,
      'plaintext': 43,
      'markdown': 60,
      'html': 42
    };
    const language_id = langMap[file.language] || 43;
    const endpoint = 'https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true';
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-RapidAPI-Key': '5e11628ca4msh0cac24bb162a655p1257c7jsnde986d9f6d3a',
          'X-RapidAPI-Host': 'judge0-ce.p.rapidapi.com'
        },
        body: JSON.stringify({
          source_code: file.content,
          language_id,
        })
      });
      const data = await response.json();
      let output = '';
      if (data.stdout) output += data.stdout;
      if (data.stderr) output += '\n[stderr]\n' + data.stderr;
      if (data.compile_output) output += '\n[compiler]\n' + data.compile_output;
      if (data.message) output += '\n[message]\n' + data.message;
      setOutput(output || '[No output]');
    } catch (err: any) {
      setOutput('Error running code: ' + err.message);
    }
    setIsRunning(false);
  };

  const getLanguageFromFile = (filename: string) => {
    const extension = filename.split('.').pop();
    const languageMap: { [key: string]: string } = {
      'java': 'java',
      'py': 'python',
      'js': 'javascript',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'md': 'markdown',
      'txt': 'plaintext'
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const openFile = async (filename: string, fileId?: string) => {
    const existingIndex = openFiles.findIndex(file => file.name === filename);
    if (existingIndex !== -1) {
      setActiveFileIndex(existingIndex);
      return;
    }

    let fileContent = '';
    if (fileId) {
      try {
        const { data, error } = await projectFilesApi.getFile(fileId);
        if (error) {
          console.error('File load error:', error);
          throw error;
        }
        fileContent = data?.content || getDefaultContent(filename);
      } catch (error: any) {
        console.error('Failed to load file content:', error);
        fileContent = getDefaultContent(filename);
        toast({
          title: 'Warning',
          description: `Failed to load file content: ${error?.message || 'Unknown error'}. Using default template.`,
          variant: 'destructive'
        });
      }
    } else {
      fileContent = getDefaultContent(filename);
    }

    const newFile: OpenFile & { id?: string } = {
      name: filename,
      content: fileContent,
      language: getLanguageFromFile(filename),
      id: fileId
    };

    setOpenFiles([...openFiles, newFile]);
    setActiveFileIndex(openFiles.length);
  };

  const getDefaultContent = (fileName: string): string => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'java': {
        const className = fileName.replace('.java', '');
        return `public class ${className} {\n    public static void main(String[] args) {\n        System.out.println(\"Hello, World!\");\n    }\n}`;
      }
      case 'py':
        return `# ${fileName}\n# Python file\n\nprint(\"Hello, World!\")`;
      case 'js':
        return `// ${fileName}\n// JavaScript file\n\nconsole.log(\"Hello, World!\");`;
      case 'c':
        return `#include <stdio.h>\n\nint main() {\n    printf(\"Hello, World!\\n\");\n    return 0;\n}`;
      case 'cpp':
        return `#include <iostream>\n\nint main() {\n    std::cout << \"Hello, World!\" << std::endl;\n    return 0;\n}`;
      case 'cs':
        return `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine(\"Hello, World!\");\n    }\n}`;
      case 'md':
        return `# ${fileName.replace('.md', '')}\n\nAdd your documentation here.`;
      case 'txt':
        return `This is a text file.\nAdd your content here.`;
      default:
        return `// ${fileName}\n// Add your code here`;
    }
  };

  const closeFile = (index: number) => {
    if (openFiles.length === 1) return;
    
    const newOpenFiles = openFiles.filter((_, i) => i !== index);
    setOpenFiles(newOpenFiles);
    
    if (index === activeFileIndex) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (index < activeFileIndex) {
      setActiveFileIndex(activeFileIndex - 1);
    }
  };

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const saveCurrentFile = async () => {
    const currentFile = openFiles[activeFileIndex];
    if (!currentFile?.id) {
      toast({
        title: 'Cannot Save',
        description: 'File must be created before it can be saved',
        variant: 'destructive'
      });
      return;
    }
    try {
      const now = new Date().toISOString();
      const { error } = await projectFilesApi.updateFile(currentFile.id, {
        content: currentFile.content,
        updated_at: now,
        size_bytes: currentFile.content.length
      });
      if (error) {
        console.error('Manual save error:', error);
        throw error;
      }
      toast({
        title: 'File Saved',
        description: `${currentFile.name} saved successfully`
      });
    } catch (error: any) {
      console.error('Manual save failed:', error);
      toast({
        title: 'Save Failed',
        description: `Failed to save ${currentFile.name}: ${error.message}`,
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveCurrentFile();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [openFiles, activeFileIndex]);

  const updateFileContent = (content: string) => {
    const updatedFiles = [...openFiles];
    updatedFiles[activeFileIndex] = {
      ...updatedFiles[activeFileIndex],
      content: content
    };
    setOpenFiles(updatedFiles);

    const currentFile = updatedFiles[activeFileIndex];
    if (currentFile?.id) {
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
      }
      saveTimeout.current = setTimeout(async () => {
        try {
          const now = new Date().toISOString();
          const { error } = await projectFilesApi.updateFile(currentFile.id, {
            content: content,
            updated_at: now,
            size_bytes: content.length
          });
          if (error) {
            console.error('Auto-save error:', error);
            throw error;
          }
        } catch (error: any) {
          console.error('Auto-save failed:', error);
          toast({
            title: 'Auto-save Failed',
            description: `Failed to save ${currentFile.name}: ${error?.message || 'Unknown error'}`,
            variant: 'destructive'
          });
        }
      }, 1000);
    }
  };

  // Transform project members to chat collaborators format
  const chatCollaborators = projectMembers
    .filter(member => member.user_id !== user?.id) // Exclude current user
    .map(member => ({
      id: parseInt(member.id.slice(-8), 16), // Convert UUID to number for mock compatibility
      name: member.user?.display_name || member.user?.username || member.user?.email?.split('@')[0] || 'Unknown',
      color: '#3B82F6',
      cursor: null as { line: number; column: number } | null,
      isTyping: false,
      accessLevel: member.role as 'owner' | 'edit' | 'view'
    }));

  const activeFile = openFiles[activeFileIndex];

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="text-gray-300 hover:text-white hover:bg-gray-700"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            
            <div className="flex items-center space-x-3">
              {isRenaming ? (
                <div className="flex items-center space-x-2">
                  <Input
                    autoFocus
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="h-8 w-64 bg-gray-700 text-white border-gray-600 focus-visible:ring-1 focus-visible:ring-blue-500"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-green-500 hover:bg-green-900/20 hover:text-green-400"
                    onClick={handleRenameProject}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-gray-400 hover:bg-gray-700 hover:text-gray-300"
                    onClick={() => {
                      setIsRenaming(false);
                      setNewProjectName(project.name);
                    }}
                  >
                    <XIcon className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center group">
                  <h1 className="text-lg font-semibold text-white">{project?.name}</h1>
                  {canManageProject() && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white hover:bg-gray-700"
                      onClick={() => {
                        setNewProjectName(project.name);
                        setIsRenaming(true);
                      }}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              )}
              <Badge className="bg-orange-100 text-orange-800">{project?.language}</Badge>
              {currentUserRole && (
                <Badge variant="outline" className="text-gray-300 border-gray-500">
                  {currentUserRole === 'owner' ? 'Owner' : 
                   currentUserRole === 'editor' ? 'Editor' : 'Viewer'}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Only show run button if user has edit permissions */}
            {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
              <Button
                onClick={runCode}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2"
              >
                <Play className="h-4 w-4 mr-2" />
                {isRunning ? 'Running...' : 'Run Code'}
              </Button>
            )}
            
            {/* Only show share button if user can manage members */}
            {canManageMembers() && (
              <Button
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => setShowShareDialog(true)}
              >
                <Share className="h-4 w-4 mr-2" />
                Share
              </Button>
            )}


            {/* Save button - show for editors and owners */}
            {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
              <Button
                onClick={saveCurrentFile}
                variant="outline"
                className="border-gray-600 text-gray-600 hover:bg-gray-700 hover:text-white"
              >
                <Settings className="h-4 w-4 mr-2" />
                Save
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Resizable File Explorer with Source Control */}
        <ResizablePanel
          direction="horizontal"
          initialSize={fileExplorerWidth}
          minSize={180}
          maxSize={600}
          onResize={setFileExplorerWidth}
          className="bg-gray-800 border-r border-gray-700 flex flex-col"
        >
          <div className="flex-1">
            <FileExplorer 
              currentFile={openFiles[activeFileIndex]?.name || ''} 
              onFileSelect={openFile}
              projectId={project.id}
            />
          </div>
          <div className="h-64">
            <SourceControlPanel />
          </div>
        </ResizablePanel>

        {/* Editor and Output */}
        <div className="flex-1 flex flex-col" style={{ minWidth: 0 }}>
          {/* File Tabs */}
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
                  {openFiles.length > 1 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
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

          {/* Main Editor and Output Container */}
          <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
            {/* Editor Section */}
            <div className="overflow-hidden" style={{ height: editorHeight, minHeight: 100 }}>
              {activeFile && (
                <CodeMirrorEditor
                  value={activeFile.content}
                  language={activeFile.language}
                  onChange={updateFileContent}
                />
              )}
            </div>

            {/* Resize Handle */}
            <div 
              className="h-2 w-full bg-gray-700 hover:bg-blue-500 cursor-row-resize active:bg-blue-600 relative z-10"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startY = e.clientY;
                const startHeight = editorHeight;
                const container = e.currentTarget.parentElement?.getBoundingClientRect();
                if (!container) return;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientY - startY;
                  const newHeight = startHeight + delta;
                  // Ensure we don't go below min height or above max height
                  const minHeight = 100;
                  const maxHeight = window.innerHeight - 200; // Leave some space for other UI
                  const constrainedHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));
                  setEditorHeight(constrainedHeight);
                };

                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
              }}
            />

            {/* Output Panel */}
            <div className="bg-gray-800 border-t border-gray-700 flex-1 min-h-[100px] overflow-auto" style={{ minHeight: 100 }}>
              <OutputPanel output={output} isRunning={isRunning} />
            </div>
          </div>
        </div>

        {/* Resizable Tabbed Panel for Chat/Collaborators */}
        <ResizablePanel
          direction="horizontal"
          initialSize={chatPanelWidth}
          minSize={200}
          maxSize={600}
          onResize={setChatPanelWidth}
          className="bg-gray-800 border-l border-gray-700 flex flex-col"
        >
          {/* Tab Bar */}
          <div className="flex items-center border-b border-gray-700">
            <button
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-all',
                activeSidebarTab === 'chat' ? 'bg-gray-900 text-blue-400' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
              onClick={() => setActiveSidebarTab('chat')}
              type="button"
            >
              Chat
            </button>
            <button
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-all',
                activeSidebarTab === 'collaborators' ? 'bg-gray-900 text-blue-400' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
              onClick={() => setActiveSidebarTab('collaborators')}
              type="button"
            >
              Collaborators
            </button>
          </div>
          {/* Tab Content */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {activeSidebarTab === 'chat' ? (
              <ChatPanel 
                collaborators={collaborators}
                projectMembers={projectMembers}
                currentUser={user}
                isLoadingMembers={isLoadingMembers}
                memberOperationStatus={memberOperationStatus}
                lastRefresh={lastRefresh || new Date()}
                autoRefreshEnabled={autoRefreshEnabled}
                onMemberClick={handleMemberClick}
                canManageMembers={canManageProject()}
              />
            ) : (
              <CollaboratorPanel 
                projectId={project.id}
                onMemberClick={handleMemberClick}
                onInviteClick={() => setShowShareDialog(true)}
                refreshTrigger={memberRefreshTrigger}
              />
            )}
          </div>
        </ResizablePanel>
      </div>
      
      {/* Share Dialog - Enhanced with real project data */}
      {showShareDialog && (
        <ShareDialog
          isOpen={showShareDialog}
          onClose={() => setShowShareDialog(false)}
          project={{
            id: project.id,
            name: project.name,
            owner_id: project.owner_id || user?.id || ''
          }}
          onMemberAdded={handleMemberAdded}
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
          onMemberUpdated={handleMemberUpdated}
          onMemberRemoved={handleMemberRemoved}
        />
      )}
    </div>
  );
};

export default CodeEditor;