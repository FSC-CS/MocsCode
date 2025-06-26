import React, { useState, useEffect } from 'react';
import { FileText, Folder, FolderOpen, Plus, MoreHorizontal, Edit, Trash, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApi } from '@/contexts/ApiContext';
import { useToast } from '@/components/ui/use-toast';
import { ProjectFile } from '@/lib/api/types';
import { useAuth } from '@/contexts/AuthContext';

interface FileItem extends ProjectFile {
  type: 'file' | 'folder';
  children?: FileItem[];
}

interface FileExplorerProps {
  currentFile: string;
  onFileSelect: (filename: string, fileId: string) => void;
  onFileRenamed?: (fileId: string, oldName: string, newName: string) => void;
  projectId: string;
}

// Utility to build a hierarchical file tree from a flat array
function buildFileTree(flatFiles: ProjectFile[]): FileItem[] {
  const fileMap = new Map<string, FileItem>();
  const rootFiles: FileItem[] = [];

  // First pass: create all items
  flatFiles.forEach(file => {
    fileMap.set(file.id, {
      ...file,
      type: file.file_type === 'directory' ? 'folder' : 'file',
      children: file.file_type === 'directory' ? [] : undefined
    });
  });

  // Second pass: build hierarchy
  flatFiles.forEach(file => {
    const item = fileMap.get(file.id)!;
    if (file.parent_id) {
      const parent = fileMap.get(file.parent_id);
      if (parent && parent.children) {
        parent.children.push(item);
      }
    } else {
      rootFiles.push(item);
    }
  });

  return rootFiles;
}

// Helper to flatten the file tree back to array
function flattenFileTree(items: FileItem[]): FileItem[] {
  let flat: FileItem[] = [];
  for (const item of items) {
    flat.push(item);
    if (item.children) {
      flat = flat.concat(flattenFileTree(item.children));
    }
  }
  return flat;
}

// Helper to find an item by ID in the tree
function findItemById(items: FileItem[], id: string): FileItem | null {
  for (const item of items) {
    if (item.id === id) return item;
    if (item.children) {
      const found = findItemById(item.children, id);
      if (found) return found;
    }
  }
  return null;
}

// Helper to generate file path
function generatePath(parentPath: string, fileName: string): string {
  // Handle root directory
  if (!parentPath || parentPath === '/') {
    return `/${fileName}`;
  }
  
  // Ensure parent path doesn't end with slash (except root)
  const normalizedParent = parentPath.endsWith('/') ? parentPath.slice(0, -1) : parentPath;
  
  return `${normalizedParent}/${fileName}`;
}

// --- Sorting Utilities ---
interface SortOptions {
  foldersFirst: boolean;
  caseSensitive: boolean;
  direction: 'asc' | 'desc';
}

const defaultSortOptions: SortOptions = {
  foldersFirst: true,
  caseSensitive: false,
  direction: 'asc',
};

function sortItems(items: FileItem[], options: SortOptions = defaultSortOptions): FileItem[] {
  return items.sort((a, b) => {
    // Folders first if enabled
    if (options.foldersFirst && a.type !== b.type) {
      return a.type === 'folder' ? -1 : 1;
    }
    // Name comparison
    const nameA = options.caseSensitive ? a.name : a.name.toLowerCase();
    const nameB = options.caseSensitive ? b.name : b.name.toLowerCase();
    const comparison = nameA.localeCompare(nameB);
    return options.direction === 'asc' ? comparison : -comparison;
  });
}

function sortFileStructureRecursively(items: FileItem[], options: SortOptions = defaultSortOptions): FileItem[] {
  const sorted = sortItems([...items], options);
  return sorted.map(item => ({
    ...item,
    children: item.children ? sortFileStructureRecursively(item.children, options) : undefined
  }));
}

const FileExplorer = ({ currentFile, onFileSelect, onFileRenamed, projectId }: FileExplorerProps) => {
  const { user, dbUser } = useAuth();
  const currentUserId = user?.id || dbUser?.id;
  // ...state declarations

  // --- File/Folder Editing & CRUD Functions ---
  const startEditing = (itemId: string, currentName: string) => {
    setEditingItem(itemId);
    setEditingText(currentName);
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingText('');
  };

  const updateChildrenPaths = async (renamedFolder: FileItem, newFolderPath: string) => {
    const childrenToUpdate = flattenFileTree(fileStructure).filter(
      f => f.path.startsWith(renamedFolder.path + '/')
    );
    
    for (const child of childrenToUpdate) {
      const relativePath = child.path.substring(renamedFolder.path.length);
      const newChildPath = newFolderPath + relativePath;
      
      try {
        const { error } = await projectFilesApi.updateFile(child.id, {
          path: newChildPath,
          updated_at: new Date().toISOString()
        });
        
        if (error) {
          console.error(`Failed to update child path for ${child.name}:`, error);
        }
      } catch (error) {
        console.error(`Error updating child path for ${child.name}:`, error);
      }
    }
  };

  const saveEdit = async () => {
    if (!editingItem || !editingText.trim()) {
      cancelEdit();
      return;
    }
    
    try {
      const itemToEdit = findItemById(fileStructure, editingItem);
      if (!itemToEdit) {
        throw new Error('File not found');
      }
      
      const newName = editingText.trim();
      
      // Generate the new path
      let newPath: string;
      if (itemToEdit.parent_id) {
        // Find parent to get parent path
        const parent = findItemById(fileStructure, itemToEdit.parent_id);
        if (!parent) {
          throw new Error('Parent folder not found');
        }
        newPath = generatePath(parent.path, newName);
      } else {
        // Root level file/folder
        newPath = `/${newName}`;
      }
      
      // Check if new path already exists (avoid duplicate constraint)
      const existingItem = flattenFileTree(fileStructure).find(
        f => f.path === newPath && f.id !== editingItem
      );
      
      if (existingItem) {
        toast({
          title: 'Error',
          description: `A file or folder with the name "${newName}" already exists in this location`,
          variant: 'destructive'
        });
        return;
      }
      
      // Update both name and path
      const { error } = await projectFilesApi.updateFile(editingItem, {
        name: newName,
        path: newPath,
        updated_at: new Date().toISOString()
      });
      
      if (error) throw error;
      
      // If renaming a folder, we need to update all children's paths recursively
      if (itemToEdit.file_type === 'directory') {
        await updateChildrenPaths(itemToEdit, newPath);
      }
      
      // Update local state with sorting applied
      const updatedFiles = flattenFileTree(fileStructure).map(f => {
        if (f.id === editingItem) {
          return { ...f, name: newName, path: newPath };
        }
        // Update children paths if this was a folder rename
        if (itemToEdit.file_type === 'directory' && f.path.startsWith(itemToEdit.path + '/')) {
          const relativePath = f.path.substring(itemToEdit.path.length);
          return { ...f, path: newPath + relativePath };
        }
        return f;
      });
      
      updateAndSortStructure(updatedFiles);
      toast({ 
        title: 'Success', 
        description: `${itemToEdit.file_type === 'directory' ? 'Folder' : 'File'} renamed successfully` 
      });
      onFileRenamed?.(editingItem, itemToEdit.name, newName);
    } catch (error: any) {
      console.error('Rename error:', error);
      toast({ 
        title: 'Error', 
        description: `Failed to rename: ${error.message}`, 
        variant: 'destructive' 
      });
    } finally {
      cancelEdit();
    }
  };

  // Helper: Generate default content based on file extension
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

  // Helper function to generate a unique name for new files/folders
  const generateUniqueName = (baseName: string, isFile: boolean, parentId?: string): string => {
    const allFiles = flattenFileTree(fileStructure);
    const siblings = allFiles.filter(file => file.parent_id === (parentId || null));
    
    // Extract base name and extension
    let name = baseName;
    let extension = '';
    
    if (isFile) {
      const lastDot = baseName.lastIndexOf('.');
      if (lastDot > 0) {
        name = baseName.substring(0, lastDot);
        extension = baseName.substring(lastDot);
      }
    }
    
    // Check if name already exists
    let newName = baseName;
    let counter = 1;
    
    while (siblings.some(file => file.name === newName)) {
      newName = isFile 
        ? `${name} (${counter})${extension}`
        : `${name} (${counter})`;
      counter++;
    }
    
    return newName;
  };

  const createNewItem = async (type: 'file' | 'folder', parentId?: string) => {
    // Check if user is authenticated
    if (!currentUserId) {
      toast({
        title: 'Authentication Required',
        description: 'You must be logged in to create files',
        variant: 'destructive'
      });
      return;
    }
    setIsCreating(true);
    try {
      const baseName = type === 'file' ? 'new-file.txt' : 'new-folder';
      const name = generateUniqueName(baseName, type === 'file', parentId);
      const parent = parentId ? findItemById(fileStructure, parentId) : null;
      const parentPath = parent?.path || '/';
      const filePath = generatePath(parentPath, name);
      const defaultContent = type === 'file' ? getDefaultContent(name) : undefined;
      const now = new Date().toISOString();
      const { data, error } = await projectFilesApi.createFile({
        project_id: projectId,
        name,
        path: filePath,
        file_type: type === 'folder' ? 'directory' : 'file',
        mime_type: type === 'file' ? 'text/plain' : undefined,
        size_bytes: defaultContent ? defaultContent.length : 0,
        parent_id: parentId || null,
        content: defaultContent,
        created_at: now,
        updated_at: now,
        created_by: currentUserId
      });

      if (error) {
        console.error('File creation error:', {
          error: {
            message: error.message,
            details: (error as any).details,
            hint: (error as any).hint,
            code: (error as any).code
          },
          fileData: { name, content: defaultContent }
        });
        throw error;
      }

      console.log('File created successfully:', {
        fileId: data?.id,
        name,
        hasContent: !!data?.content,
        contentLength: data?.content?.length || 0,
        data
      });

      // Add new item and apply sorting
      const allFiles = [...flattenFileTree(fileStructure), data];
      updateAndSortStructure(allFiles);
      // Expand parent folder if creating inside one
      if (parentId) {
        setExpandedFolders(prev => new Set([...prev, parentId]));
      }
      toast({ title: 'Success', description: `Created ${type}: ${name}` });
    } catch (error: any) {
      console.error(`Failed to create ${type}:`, error);
      toast({ title: 'Error', description: `Failed to create ${type}: ${error.message}`, variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await projectFilesApi.deleteFile(itemId);
      if (error) throw error;
      // Remove item and apply sorting
      const updatedFiles = flattenFileTree(fileStructure).filter(f => f.id !== itemId);
      updateAndSortStructure(updatedFiles);
      toast({ title: 'Success', description: 'Item deleted successfully' });
    } catch (error) {
      console.error('Failed to delete item:', error);
      toast({ title: 'Error', description: 'Failed to delete item', variant: 'destructive' });
    }
  };

  // Utility to update and sort structure after file operations
  const updateAndSortStructure = (flatFiles: ProjectFile[]) => {
    const hierarchicalFiles = buildFileTree(flatFiles);
    const sortedFiles = sortFileStructureRecursively(hierarchicalFiles, defaultSortOptions);
    setFileStructure(sortedFiles);
  };


  // Ensure toggleFolder is defined and accessible
  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderId)) {
        newSet.delete(folderId);
      } else {
        newSet.add(folderId);
      }
      return newSet;
    });
  };

  const { projectFilesApi } = useApi();
  const { toast } = useToast();

  const [fileStructure, setFileStructure] = useState<FileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dropTargets, setDropTargets] = useState<Set<string>>(new Set()); // For visual feedback

  // Load project files on component mount
  useEffect(() => {
    const loadProjectFiles = async () => {
      if (!projectId) return;
      setIsLoading(true);
      try {
        // Fetch ALL files for the project (not just root level)
        const { data, error } = await projectFilesApi.listProjectFiles(
          projectId,
          undefined, // parentId = undefined to get all files
          { page: 1, per_page: 1000 }
        );
        if (error) throw error;
        updateAndSortStructure(data?.items || []);
      } catch (error) {
        console.error('Failed to load project files:', error);
        toast({
          title: 'Error',
          description: 'Failed to load files',
          variant: 'destructive'
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadProjectFiles();
  }, [projectId, projectFilesApi, toast]);

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent bubbling to root handler
    if (!draggedItem || draggedItem === targetFolderId) return;

    try {
      const dragged = findItemById(fileStructure, draggedItem);
      const target = findItemById(fileStructure, targetFolderId);
      if (!dragged || !target || target.type !== 'folder') return;
      const newPath = generatePath(target.path, dragged.name);
      const { data, error } = await projectFilesApi.moveFile(dragged.id, target.id, newPath);
      if (error) throw error;
      // Update local state with sorting applied
      const updatedFiles = flattenFileTree(fileStructure).map(f =>
        f.id === dragged.id 
          ? { ...f, parent_id: target.id, path: newPath } 
          : f
      );
      updateAndSortStructure(updatedFiles);
      setExpandedFolders(prev => new Set([...prev, targetFolderId]));
      toast({ title: 'Success', description: 'Item moved successfully' });
    } catch (error) {
      console.error('Failed to move item:', error);
      toast({ title: 'Error', description: 'Failed to move item', variant: 'destructive' });
    } finally {
      setDraggedItem(null);
    }
  };

  const handleRootDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedItem) return;
    try {
      const dragged = findItemById(fileStructure, draggedItem);
      if (!dragged || !dragged.parent_id) return; // Already at root
      const newPath = `/${dragged.name}`;
      const { data, error } = await projectFilesApi.moveFile(dragged.id, null, newPath);
      if (error) throw error;
      // Update local state with sorting applied
      const updatedFiles = flattenFileTree(fileStructure).map(f =>
        f.id === draggedItem 
          ? { ...f, parent_id: null, path: newPath } 
          : f
      );
      updateAndSortStructure(updatedFiles);
      toast({ title: 'Success', description: 'File moved to root' });
    } catch (error) {
      console.error('Failed to move to root:', error);
      toast({ title: 'Error', description: 'Failed to move file to root', variant: 'destructive' });
    } finally {
      setDraggedItem(null);
    }
  };

  const getFileIcon = (filename: string) => {
    return <FileText className="h-4 w-4 text-blue-400" />;
  };

  const renderFileStructure = (items: FileItem[], depth = 0) => {
    return items.map((item) => {
      const isExpanded = expandedFolders.has(item.id);
      const isEditing = editingItem === item.id;
      const isCurrentFile = item.type === 'file' && currentFile === item.name;
      const isDraggedOver = dropTargets.has(item.id);
      const isDragging = draggedItem === item.id;
      return (
        <div key={item.id}>
          <div
            className={`flex items-center space-x-2 px-2 py-1 hover:bg-gray-700 cursor-pointer group ${
              isCurrentFile ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
            } ${isDragging ? 'opacity-50' : ''} ${isDraggedOver && item.type === 'folder' ? 'bg-blue-600/20 border-blue-400 border-dashed border-2' : ''}`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            draggable={!isEditing}
            onDragEnter={() => {
              if (item.type === 'folder' && draggedItem !== item.id) {
                setDropTargets(prev => new Set([...prev, item.id]));
              }
            }}
            onDragLeave={() => {
              setDropTargets(prev => {
                const newSet = new Set(prev);
                newSet.delete(item.id);
                return newSet;
              });
            }}
            onDragStart={(e) => handleDragStart(e, item.id)}
            onDragOver={item.type === 'folder' ? handleDragOver : undefined}
            onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.id) : undefined}
            onDoubleClick={() => item.type === 'file' && startEditing(item.id, item.name)}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.id);
              } else if (!isEditing) {
                onFileSelect(item.name, item.id);
              }
            }}
          >
            {/* Icon */}
            {item.type === 'folder' ? (
              isExpanded ? (
                <FolderOpen className="h-4 w-4 text-yellow-400" />
              ) : (
                <Folder className="h-4 w-4 text-yellow-400" />
              )
            ) : (
              getFileIcon(item.name)
            )}
            
            {/* Name or Edit Input */}
            {isEditing ? (
              <input
                type="text"
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={saveEdit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveEdit();
                  if (e.key === 'Escape') cancelEdit();
                }}
                className="bg-gray-600 text-white text-sm px-1 py-0 border-none outline-none flex-1"
                autoFocus
              />
            ) : (
              <span className="text-sm flex-1">{item.name}</span>
            )}
            
            {/* Actions Dropdown */}
            {!isEditing && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-4 w-4 p-0 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-700 border-gray-600">
                  <DropdownMenuItem 
                    onClick={() => startEditing(item.id, item.name)} 
                    className="text-gray-200 hover:bg-gray-600"
                  >
                    <Edit className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {item.type === 'folder' && (
                    <>
                      <DropdownMenuItem 
                        onClick={() => createNewItem('file', item.id)} 
                        className="text-gray-200 hover:bg-gray-600"
                      >
                        <FileText className="h-3 w-3 mr-2" />
                        New File
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => createNewItem('folder', item.id)} 
                        className="text-gray-200 hover:bg-gray-600"
                      >
                        <Folder className="h-3 w-3 mr-2" />
                        New Folder
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem 
                    onClick={() => deleteItem(item.id)} 
                    className="text-red-400 hover:bg-gray-600"
                  >
                    <Trash className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {/* Render children if folder is expanded */}
          {item.type === 'folder' && isExpanded && item.children && (
            <div>
              {renderFileStructure(item.children, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-700 border-gray-600">
              <DropdownMenuItem 
                onClick={() => createNewItem('file')} 
                className="text-gray-200 hover:bg-gray-600"
                disabled={isCreating}
              >
                <FileText className="h-3 w-3 mr-2" />
                New File
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => createNewItem('folder')} 
                className="text-gray-200 hover:bg-gray-600"
                disabled={isCreating}
              >
                <Folder className="h-3 w-3 mr-2" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {/* File Tree */}
      <div
        className={`flex-1 overflow-y-auto py-2 ${dropTargets.has('root') ? 'bg-blue-600/10 border-blue-400 border-dashed border-2' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleRootDrop}
        onDragEnter={() => setDropTargets(prev => new Set([...prev, 'root']))}
        onDragLeave={() => setDropTargets(prev => {
          const newSet = new Set(prev);
          newSet.delete('root');
          return newSet;
        })}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="animate-spin mr-2" />
            Loading files...
          </div>
        ) : (
          renderFileStructure(fileStructure)
        )}
      </div>
    </div>
  );
};

export default FileExplorer;