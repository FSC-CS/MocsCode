import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Pencil, Check, X as XIcon, ArrowLeft, Play, Share, FileText, Settings, Palette } from 'lucide-react';
import { presenceService } from '@/lib/presence';
import CodeMirrorEditor from '../editor/CodeMirrorEditor';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import ShareDialog from './ShareDialog';
import MemberManagementDialog from './MemberManagementDialog';
import FileExplorer from './FileExplorer';
import OutputPanel from './OutputPanel';
import ChatPanel from './ChatPanel';
import SourceControlPanel from './SourceControlPanel';
import ResizablePanel from './ResizablePanel';
import CollaboratorPanel from '@/components/CollaboratorPanel';
import { useYjsDocuments } from '@/editor/useYjsDocuments';
import { runJudge0Code } from '@/lib/api/judge0';
import { getLanguageScripts } from '@/lib/utils/script-templates';
import EditorTabBar from './editor/EditorTabBar';

// Types
interface Project {
  id: string;
  name: string;
  owner_id: string;
  language?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  is_public?: boolean;
}

interface ProjectMemberUser {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar_url?: string;
}

interface BaseProjectMember {
  id: string;
  user_id: string;
  role: 'owner' | 'editor' | 'viewer';
  user: ProjectMemberUser;
  project_id: string;
  permissions: Record<string, unknown>;
  joined_at: string;
  isOnline?: boolean;
  lastSeen?: string;
}

type ProjectMember = BaseProjectMember;
type EnhancedMember = Required<BaseProjectMember>;

interface Collaborator {
  id: number;
  name: string;
  color: string;
  cursor: { line: number; column: number } | null;
  isTyping: boolean;
  accessLevel: 'owner' | 'edit' | 'view';
}

interface OpenFile {
  id?: string;
  name: string;
  content: string;
  language: string;
  ytext: any;
  provider: any;
  lastSaved?: string;
  isDirty?: boolean;
}

interface CodeEditorProps {
  project: Project;
  onBack: () => void;
  collaborators?: Collaborator[];
}

const CodeEditor = ({ project, onBack, collaborators = [] }: CodeEditorProps) => {
  // Settings state
  const [tabSize, setTabSize] = useState(4);
  const [autocomplete, setAutocomplete] = useState(true);
  const [syntaxTheme, setSyntaxTheme] = useState('default');
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const [showCollaborators, setShowCollaborators] = useState(false); // State for resizable panels and sidebar
  const [fileExplorerWidth, setFileExplorerWidth] = useState(250);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isChatPanelCollapsed, setIsChatPanelCollapsed] = useState(false);
  const [chatPanelWidth, setChatPanelWidth] = useState(300);
  const [editorHeight, setEditorHeight] = useState(70); // Percentage as number for easier calculations
  const [outputHeight, setOutputHeight] = useState(30); // Percentage as number for easier calculations
  const collapsedSidebarWidth = 40; // Width when collapsed

  const { getOrCreateDoc, destroyDoc } = useYjsDocuments();
  
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
    type: 'idle' | 'adding' | 'updating' | 'removing' | 'error';
    error?: Error;
    memberId?: string;
  }>({ type: 'idle' });

  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef(null);

  // Bash scripts config state
  // Initialize with empty scripts - will be set based on project language
  const [compileScript, setCompileScript] = useState('');
  const [runScript, setRunScript] = useState('');

  // At the top of your CodeEditor component
  const collaborativeInstanceRef = useRef<any>(null); // No re-renders

  const handleCollaborativeInstance = (instance: any) => {
    collaborativeInstanceRef.current = instance;
    // You can also access instance.ydoc here if needed
  };

  // Track online users
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const prevCollaboratorsRef = useRef<Collaborator[]>([]);
  const prevCollaboratorsStrRef = useRef('');
  
  // Update online users when collaborators change
  useEffect(() => {
    // Only update if collaborators actually changed
    const currentCollaborators = JSON.stringify(collaborators);
    if (prevCollaboratorsStrRef.current !== currentCollaborators) {
      const collaboratorIds = new Set<string>();
      
      // Process collaborators safely
      if (Array.isArray(collaborators)) {
        collaborators.forEach(collaborator => {
          if (collaborator?.id) {
            collaboratorIds.add(String(collaborator.id));
          }
        });
      }
      
      setOnlineUsers(collaboratorIds);
      prevCollaboratorsRef.current = [...collaborators];
      prevCollaboratorsStrRef.current = currentCollaborators;
    }
  }, [collaborators]);

  const loadProjectMembers = useCallback(async (silent: boolean = false) => {
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

      const members: EnhancedMember[] = (data?.items || []).map((member: any) => ({
        ...member,
        user: member.user || {
          id: member.user_id,
          name: member.name || 'Unknown User',
          email: member.email || '',
          username: member.username || ''
        },
        isOnline: false, // Default to offline, will be updated by presence
        lastSeen: new Date().toISOString()
      }));
      
      // Only update if members have actually changed
      setProjectMembers(prevMembers => {
        const prevMembersStr = JSON.stringify(prevMembers);
        const newMembersStr = JSON.stringify(members);
        return prevMembersStr === newMembersStr ? prevMembers : members;
      });

      // Set current user's role if found in members
      const currentMember = members.find(m => m.user_id === user.id);
      if (currentMember) {
        setCurrentUserRole(currentMember.role);
      }

    } catch (error) {
      console.error('Unexpected error loading members:', error);
      if (!silent) {
        toast({
          title: 'Error',
          description: 'An unexpected error occurred while loading members',
          variant: 'destructive'
        });
      }
    } finally {
      if (!silent) {
        setIsLoadingMembers(false);
      }
    }
  }, [project?.id, user?.id, projectMembersApi, toast]);

  useEffect(() => {
    if (project?.id && user?.id) {
      loadProjectMembers();
    }
  }, [project?.id, user?.id, loadProjectMembers]);

  // Set up auto-refresh for member list (every 30 seconds when enabled)
  useEffect(() => {
    if (!autoRefreshEnabled || !project?.id || !user?.id) {
      return;
    }

    const intervalId = setInterval(() => {
      // Only auto-refresh if no member operations are in progress
      if (memberOperationStatus.type === 'idle') {
        loadProjectMembers(true); // Silent refresh
      }
    }, 30000); // 30 seconds

    refreshIntervalRef.current = intervalId;
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefreshEnabled, project?.id, user?.id, memberOperationStatus.type, loadProjectMembers]);

  // Memoize the collaborators list to prevent unnecessary recalculations
  const collaboratorsList = useMemo(() => {
    // If we have collaborators from props, use them directly
    if (collaborators && collaborators.length > 0) {
      return collaborators;
    }

    // Otherwise, derive from projectMembers
    return (projectMembers || [])
      .filter(member => member?.user_id && member.user_id !== user?.id)
      .map(member => {
        if (!member) return null;
        
        // Generate a consistent color based on user ID
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
      .filter(Boolean) as Collaborator[]; // Filter out any nulls from the map
  }, [collaborators, projectMembers, user?.id]);

  // Memoize effectiveCollaborators to prevent recreation
  const effectiveCollaborators = useMemo(() => {
    return collaborators && collaborators.length > 0 ? collaborators : collaboratorsList;
  }, [collaborators, collaboratorsList]);

  // Initialize scripts based on project language
  useEffect(() => {
    console.log("LANGUAGE: ", project?.language);
    if (project?.language) {
      const scripts = getLanguageScripts(project.language);
      setCompileScript(scripts.compile);
      setRunScript(scripts.run);
    }
  }, [project?.language]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

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
    if (!project?.id || !updatedMember?.id) return;
    
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
        description: `${updatedMember.user?.name || 'Member'} permissions updated successfully`,
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
    if (!project?.id || !removedMemberId) return;
    
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
        description: `${removedMember?.user?.name || 'Member'} removed from project`,
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
    setMemberOperationStatus({ type: 'adding', memberId: newMember?.user_id });
    
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

    try {
      const data = await runJudge0Code({
        projectId: project?.id,
        compileScript: compileScript,
        runScript: runScript,
      });
      let output = '';
      if (data.stdout) output += data.stdout;
      if (data.stderr) output += '\n[stderr]\n' + data.stderr;
      if (data.compile_output) output += '\n[compiler]\n' + data.compile_output;
      if (data.message) output += '\n[message]\n' + data.message;
      setOutput(output || '[No output]');
    } catch (err: any) {
      setOutput('Error running code: ' + (err?.message || err));
    }
    setIsRunning(false);
  };

  const getLanguageFromFile = (filename: string) => {
    const extension = filename.split('.').pop();
    const languageMap: { [key: string]: string } = {
      'java': 'java',
      'py': 'python',
      'js': 'javascript',
      'ts': 'typescript',
      'c': 'c',
      'cpp': 'cpp',
      'cs': 'csharp',
      'md': 'markdown',
      'txt': 'plaintext',
      'html': 'html',
      'css': 'css',
      'json': 'json',
      'yaml': 'yaml',
      'yml': 'yaml',
      'graphql': 'graphql',
      'gql': 'graphql',
    };
    return languageMap[extension || ''] || 'plaintext';
  };

  const openFile = async (filename: string, fileId?: string) => {
    // First try to find by file ID if provided, then fall back to filename
    const existingIndex = fileId 
      ? openFiles.findIndex(file => file.id === fileId)
      : openFiles.findIndex(file => file.name === filename);
      
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

    const { ydoc, provider, ytext } = await getOrCreateDoc(fileId, fileContent, dbUser);

    const newFile: OpenFile & { id?: string } = {
      name: filename,
      content: ytext.toString(),
      language: getLanguageFromFile(filename),
      id: fileId,
      ytext,
      provider
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
    const newOpenFiles = openFiles.filter((_, i) => i !== index);
    setOpenFiles(newOpenFiles);
    
    if (index === activeFileIndex) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (index < activeFileIndex) {
      setActiveFileIndex(activeFileIndex - 1);
    }

    destroyDoc(openFiles[index].id);
  };

  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const [isSaving, setIsSaving] = useState(false);

  const saveCurrentFile = async (isAutoSave = false) => {
    const currentFile = openFiles[activeFileIndex];
    if (!currentFile?.id) {
      toast({
        title: 'Cannot Save',
        description: 'File must be created before it can be saved',
        variant: 'destructive'
      });
      return;
    }

    if (isSaving) return;
    setIsSaving(true);

    try {
      // Get the latest content directly from the editor view if available
      const { ydoc, provider, ytext } = await getOrCreateDoc(currentFile.id, "", dbUser);
      const latestContent = ytext.toString();
      
      const now = new Date().toISOString();
      const { error } = await projectFilesApi.updateFile(currentFile.id, {
        content: latestContent,
        updated_at: now,
        size_bytes: latestContent.length
      });

      if (error) {
        console.error('Manual save error:', error);
        throw error;
      }

      // Update local state to match saved content
      const updatedFiles = [...openFiles];
      updatedFiles[activeFileIndex] = {
        ...currentFile,
        content: latestContent,
        lastSaved: now
      };
      setOpenFiles(updatedFiles);

      toast({
        title: 'File Saved',
        description: `${currentFile.name} saved successfully`
      });
    } catch (error: any) {
      console.error('Save failed:', error);
      toast({
        title: 'Save Failed',
        description: `Failed to save ${currentFile.name}: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save on Cmd+S (Mac) or Ctrl+S (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        saveCurrentFile(false); // Explicit save (not auto-save)
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveCurrentFile]);

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

  // Handle cursor position updates
  const handleCursorChange = useCallback((cursor: { x: number; y: number } | null) => {
    // No-op for now
  }, []);

  // Transform project members to chat collaborators format
  const chatCollaborators = projectMembers
    .filter(member => member.user_id !== user?.id) // Exclude current user
    .map(member => ({
      id: parseInt(member.id.slice(-8), 16), // Convert UUID to number for mock compatibility
      name: member.user?.name || member.user?.email?.split('@')[0] || 'Unknown',
      color: '#3B82F6',
      cursor: null as { line: number; column: number } | null,
      isTyping: false,
      accessLevel: member.role as 'owner' | 'edit' | 'view'
    }));

  const activeFile = openFiles[activeFileIndex];

  const handleFileRenamed = useCallback((fileId: string, oldName: string, newName: string) => {
    setOpenFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId || (file.id === undefined && file.name === oldName)
          ? { ...file, name: newName, language: getLanguageFromFile(newName) }
          : file
      )
    );
  }, []);

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.updateSettings({
        tabSize,
        autocomplete,
        syntaxTheme,
      });
    }
  }, [tabSize, autocomplete, syntaxTheme]);

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-2 sm:px-4 py-2">
        <div className="flex items-center justify-between w-full">
          {/* Left section - Back button and project name */}
          <div className="flex-1 flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="text-gray-300 hover:text-white hover:bg-gray-700 px-2 sm:px-3"
              >
                <ArrowLeft className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Back to Dashboard</span>
              </Button>
            </div>
            
            <div className="hidden md:flex items-center space-x-3 min-w-0">
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
                <div className="flex items-center group min-w-0">
                  <h1 className="text-lg font-semibold text-white truncate max-w-[200px] md:max-w-none" title={project?.name}>
                    {project?.name.length > 10 ? (
                      <>
                        <span className="hidden lg:inline">{project?.name}</span>
                        <span className="lg:hidden">
                          {project?.name.length > 10 ? `${project?.name.substring(0, 10)}...` : project?.name}
                        </span>
                      </>
                    ) : (
                      project?.name
                    )}
                  </h1>
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
            </div>
          </div>

          {/* MocsCode Branding - Center section */}
          <div className="flex-1 flex items-center justify-center px-2">
            <div className="text-center">
              <span className="text-xl sm:text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
                MocsCode
              </span>
            </div>
          </div>

          {/* Right section - Action buttons */}
          <div className="flex-1 flex items-center justify-end space-x-1 sm:space-x-2 md:space-x-3 overflow-x-auto py-1">
            {/* Editor Settings Dropdown */}
            <div className="flex-shrink-0">
              <Popover onOpenChange={setSettingsOpen} open={settingsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-white hover:bg-gray-700"
                  aria-label="Editor Settings"
                  onClick={(e) => {
                    e.preventDefault();
                    setSettingsOpen(!settingsOpen);
                  }}
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                align="end" 
                className="w-56 p-4"
                onInteractOutside={(e) => {
                  // Prevent closing when clicking on the trigger button
                  const target = e.target as HTMLElement;
                  if (target.closest('[aria-label="Editor Settings"]')) {
                    e.preventDefault();
                  }
                }}
              >
                <div className="space-y-4">
                  <h4 className="font-medium leading-none">Editor Settings</h4>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tab-size">Tab Size</Label>
                    <select
                      id="tab-size"
                      value={tabSize}
                      onChange={(e) => setTabSize(Number(e.target.value))}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value={2}>2 spaces</option>
                      <option value={4}>4 spaces</option>
                      <option value={8}>8 spaces</option>
                    </select>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autocomplete">Autocomplete</Label>
                    <Switch
                      id="autocomplete"
                      checked={autocomplete}
                      onCheckedChange={(checked) => {
                        setAutocomplete(checked);
                      }}
                      className="data-[state=checked]:bg-blue-600"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="syntax-theme">
                      <div className="flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        <span>Syntax Theme</span>
                      </div>
                    </Label>
                    <select
                      id="syntax-theme"
                      value={syntaxTheme}
                      onChange={(e) => setSyntaxTheme(e.target.value)}
                      className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="default">Default</option>
                      <option value="dracula">Dracula</option>
                      <option value="solarized-light">Solarized Light</option>
                      <option value="monokai">Monokai</option>
                    </select>
                  </div>
                </div>
              </PopoverContent>
              </Popover>
            </div>

            {/* Only show run button if user has edit permissions */}
            {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
              <Button
                onClick={runCode}
                disabled={isRunning}
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
              >
                <Play className="h-4 w-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">{isRunning ? 'Running...' : 'Run Code'}</span>
              </Button>
            )}
            
            {/* Only show share button if user can manage members */}
            {canManageMembers() && (
              <Button
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
                onClick={() => setShowShareDialog(true)}
              >
                <Share className="h-4 w-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            )}


            {/* Save button - show for editors and owners */}
            {(currentUserRole === 'owner' || currentUserRole === 'editor') && (
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  saveCurrentFile(false);
                }}
                variant="outline"
                className="border-gray-600 text-gray-600 hover:bg-gray-700 hover:text-white px-3 sm:px-4 py-2 whitespace-nowrap overflow-hidden text-ellipsis"
              >
                <Check className="h-4 w-4 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">Save</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar with Toggle */}
        <div className="flex flex-row h-full bg-gray-800" style={{ width: isSidebarCollapsed ? '16px' : `${fileExplorerWidth}px` }}>
          {/* Sidebar Content */}
          <div 
            className="bg-gray-800 border-r border-gray-700 flex flex-col h-full flex-shrink-0 overflow-hidden"
            style={{
              width: isSidebarCollapsed ? 0 : '100%',
              minWidth: isSidebarCollapsed ? 0 : 172,
              maxWidth: isSidebarCollapsed ? 0 : '100%',
            }}
          >
            {!isSidebarCollapsed && (
              <>
                <div className="flex-1 overflow-y-auto" style={{ height: 'calc(100% - 16rem)' }}>
                  <FileExplorer 
                    currentFile={openFiles[activeFileIndex]?.name || ''} 
                    onFileSelect={openFile}
                    onFileRenamed={handleFileRenamed}
                    projectId={project.id}
                  />
                </div>
                <div className="border-t border-gray-700 h-64 overflow-y-auto" style={{ height: '16rem' }}>
                  <CollaboratorPanel 
                    projectId={project.id}
                    onMemberClick={handleMemberClick}
                    onInviteClick={() => setShowShareDialog(true)}
                    refreshTrigger={memberRefreshTrigger}
                    onlineUsers={onlineUsers}
                  />
                </div>
              </>
            )}
          </div>
          
          {/* Toggle button and resize handle column */}
          <div className="relative h-full flex-shrink-0">
            {/* Toggle Button - now on the left */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSidebarCollapsed(!isSidebarCollapsed);
              }}
              className={`absolute left-0 top-0 bottom-0 w-4 flex items-center justify-center ${isSidebarCollapsed ? 'bg-gray-800' : 'bg-gray-700'} hover:bg-blue-600 text-white transition-all duration-200 z-10`}
              aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <div className={`transform transition-transform duration-200 ${isSidebarCollapsed ? 'rotate-180' : 'rotate-0'}`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-gray-400 hover:text-white"
                >
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </div>
            </button>
            
            {/* Resize handle - now on the right */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startX = e.clientX;
                const startWidth = fileExplorerWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = moveEvent.clientX - startX;
                  const newWidth = startWidth + delta;
                  // Constrain between 172px and 600px
                  setFileExplorerWidth(Math.max(172, Math.min(600, newWidth)));
                };

                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
              }}
            />
            
            {/* Project name when collapsed */}
            {isSidebarCollapsed && (
              <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center">
                <span className="transform -rotate-90 whitespace-nowrap text-[10px] font-medium text-gray-500 tracking-wider">
                  {project.name}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Main Editor Area */}
        <div 
          className="flex-1 flex flex-col overflow-hidden relative bg-gray-900"
          style={{
            minWidth: 0,
            width: `calc(100% - ${isSidebarCollapsed ? '16px' : `${fileExplorerWidth}px`} - ${isChatPanelCollapsed ? '16px' : `${chatPanelWidth}px`})`,
            transition: 'width 0.2s ease-out, margin 0.2s ease-out',
            marginLeft: isSidebarCollapsed ? '0' : '0',
          }}
        >
          {/* File Tabs */}
          <EditorTabBar
            openFiles={openFiles}
            activeFileIndex={activeFileIndex}
            setActiveFileIndex={setActiveFileIndex}
            closeFile={closeFile}
          />

          {/* Main Editor and Output Container */}
          <div className="flex-1 flex flex-col" style={{ minHeight: 0 }}>
            {/* Editor Section */}
            <div className="overflow-hidden" style={{ height: `${editorHeight}%`, minHeight: 100 }}>
              {openFiles.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full w-full text-center select-none">
                  <div className="mx-auto max-w-md p-8 rounded-lg bg-gray-900/80 border border-gray-700 shadow-lg">
                    <h2 className="text-2xl font-bold mb-2 text-blue-400">Welcome to the Code Editor</h2>
                    <p className="text-gray-300 mb-4">To get started, open or create a file from the file explorer panel on the left.</p>
                    <div className="flex justify-center">
                      <FileText className="h-10 w-10 text-blue-400" />
                    </div>
                  </div>
                </div>
              ) : (
                activeFile && (
                  <CodeMirrorEditor
                    value={activeFile.content.toString()}
                    language={activeFile.language}
                    tabSize={tabSize}
                    autocomplete={autocomplete}
                    syntaxTheme={syntaxTheme}
                    ytext={activeFile.ytext}
                    provider={activeFile.provider}
                    onChange={updateFileContent}
                  />
                )
              )}
            </div>

            {/* Output Panel with custom resize handle */}
            <div className="relative flex flex-col bg-gray-800 border-t border-gray-700" style={{ height: `${100 - editorHeight}%` }}>
              {/* Resize handle */}
              <div 
                className="h-2 w-full bg-gray-700 hover:bg-blue-500 cursor-row-resize active:bg-blue-600 relative z-10"
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const startY = e.clientY;
                  const startHeight = editorHeight;
                  const container = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect();
                  if (!container) return;
                  
                  const onMouseMove = (moveEvent: MouseEvent) => {
                    const delta = moveEvent.clientY - startY;
                    const newEditorHeight = startHeight + (delta / container.height * 100);
                    // Constrain between 10% and 90% of container height
                    setEditorHeight(Math.max(10, Math.min(90, newEditorHeight)));
                  };

                  const onMouseUp = () => {
                    document.removeEventListener('mousemove', onMouseMove);
                    document.removeEventListener('mouseup', onMouseUp);
                  };

                  document.addEventListener('mousemove', onMouseMove);
                  document.addEventListener('mouseup', onMouseUp, { once: true });
                }}
              />
              
              {/* Output panel content */}
              <div className="flex-1 overflow-auto">
                <OutputPanel 
                  output={output}
                  setOutput={setOutput}
                  isRunning={isRunning}
                  compileScript={compileScript}
                  setCompileScript={setCompileScript}
                  runScript={runScript}
                  setRunScript={setRunScript} 
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar with Toggle */}
        <div className="flex flex-row h-full bg-gray-800" style={{ width: isChatPanelCollapsed ? '16px' : `${chatPanelWidth}px` }}>
          {/* Toggle button and resize handle column */}
          <div className="relative h-full flex-shrink-0">
            {/* Resize handle - now on the left */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1 bg-gray-600 hover:bg-blue-500 cursor-col-resize active:bg-blue-600 z-20"
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                const startX = e.clientX;
                const startWidth = chatPanelWidth;
                
                const onMouseMove = (moveEvent: MouseEvent) => {
                  const delta = startX - moveEvent.clientX; // Invert delta for right panel
                  const newWidth = startWidth + delta;
                  // Constrain between 200px and 600px
                  setChatPanelWidth(Math.max(200, Math.min(600, newWidth)));
                };

                const onMouseUp = () => {
                  document.removeEventListener('mousemove', onMouseMove);
                  document.removeEventListener('mouseup', onMouseUp);
                };

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp, { once: true });
              }}
            />
            
            {/* Toggle Button - on the right */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsChatPanelCollapsed(!isChatPanelCollapsed);
              }}
              className={`absolute right-0 top-0 bottom-0 w-4 flex items-center justify-center ${isChatPanelCollapsed ? 'bg-gray-800' : 'bg-gray-700'} hover:bg-blue-600 text-white transition-all duration-200 z-10`}
              aria-label={isChatPanelCollapsed ? 'Expand chat' : 'Collapse chat'}
            >
              <div className={`transform transition-transform duration-200 ${isChatPanelCollapsed ? 'rotate-0' : 'rotate-180'}`}>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  width="12" 
                  height="12" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  className="text-gray-400 hover:text-white"
                >
                  <path d="M15 18l-6-6 6-6"/>
                </svg>
              </div>
            </button>
            
            {/* Chat label when collapsed */}
            {isChatPanelCollapsed && (
              <div className="absolute left-0 right-0 bottom-4 flex items-center justify-center">
                <span className="transform -rotate-90 whitespace-nowrap text-[10px] font-medium text-gray-500 tracking-wider">
                  Chat
                </span>
              </div>
            )}
          </div>
          
          {/* Chat Panel Content */}
          <div 
            className="bg-gray-800 border-l border-gray-700 flex flex-col h-full flex-shrink-0 overflow-hidden"
            style={{
              width: isChatPanelCollapsed ? 0 : '100%',
              minWidth: isChatPanelCollapsed ? 0 : 200,
              maxWidth: isChatPanelCollapsed ? 0 : '100%',
            }}
          >
            {!isChatPanelCollapsed && (
              <>
                <div className="px-3 py-2 text-sm font-medium text-gray-300 bg-gray-800 border-b border-gray-700">
                  Chat
                </div>
                <div className="flex-1 min-h-0 overflow-y-auto">
                  <ChatPanel 
                    collaborators={collaborators}
                    projectMembers={projectMembers}
                    currentUser={dbUser}
                    isLoadingMembers={isLoadingMembers}
                    memberOperationStatus={memberOperationStatus}
                    onMemberClick={handleMemberClick}
                    onInviteClick={() => setShowShareDialog(true)}
                    canManageMembers={canManageProject()}
                    projectId={project.id}
                  />
                </div>
              </>
            )}
          </div>
        </div>
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
          onMembersChanged={() => setMemberRefreshTrigger(t => t + 1)}
        />
      )}
    </div>
  );
};

export default CodeEditor;