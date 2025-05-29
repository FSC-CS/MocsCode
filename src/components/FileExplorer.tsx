
import React, { useState } from 'react';
import { FileText, Folder, FolderOpen, Plus, MoreHorizontal, Edit, Trash } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface FileItem {
  name: string;
  type: 'file' | 'folder';
  language?: string;
  children?: FileItem[];
}

interface FileExplorerProps {
  currentFile: string;
  onFileSelect: (filename: string) => void;
}

const FileExplorer = ({ currentFile, onFileSelect }: FileExplorerProps) => {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['src']));
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  
  const [fileStructure, setFileStructure] = useState<FileItem[]>([
    {
      name: 'src',
      type: 'folder',
      children: [
        { name: 'main.java', type: 'file', language: 'java' },
        { name: 'Utils.java', type: 'file', language: 'java' },
        { name: 'DataStructure.java', type: 'file', language: 'java' }
      ]
    },
    {
      name: 'test',
      type: 'folder', 
      children: [
        { name: 'TestMain.java', type: 'file', language: 'java' }
      ]
    },
    { name: 'README.md', type: 'file', language: 'markdown' },
    { name: '.gitignore', type: 'file', language: 'gitignore' }
  ]);

  const toggleFolder = (folderName: string) => {
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(folderName)) {
        newSet.delete(folderName);
      } else {
        newSet.add(folderName);
      }
      return newSet;
    });
  };

  const startEditing = (itemName: string) => {
    setEditingItem(itemName);
    setEditingText(itemName);
  };

  const saveEdit = () => {
    if (editingText.trim() && editingItem) {
      // Update file structure with new name
      const updateStructure = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.name === editingItem) {
            return { ...item, name: editingText.trim() };
          }
          if (item.children) {
            return { ...item, children: updateStructure(item.children) };
          }
          return item;
        });
      };
      
      setFileStructure(updateStructure(fileStructure));
      setEditingItem(null);
      setEditingText('');
    }
  };

  const cancelEdit = () => {
    setEditingItem(null);
    setEditingText('');
  };

  const deleteItem = (itemName: string) => {
    const removeFromStructure = (items: FileItem[]): FileItem[] => {
      return items.filter(item => item.name !== itemName).map(item => {
        if (item.children) {
          return { ...item, children: removeFromStructure(item.children) };
        }
        return item;
      });
    };
    
    setFileStructure(removeFromStructure(fileStructure));
  };

  const createNewItem = (type: 'file' | 'folder', parentFolder?: string) => {
    const newName = type === 'file' ? 'newfile.txt' : 'newfolder';
    const newItem: FileItem = {
      name: newName,
      type,
      children: type === 'folder' ? [] : undefined
    };

    if (parentFolder) {
      // Add to specific folder
      const updateStructure = (items: FileItem[]): FileItem[] => {
        return items.map(item => {
          if (item.name === parentFolder && item.type === 'folder') {
            return {
              ...item,
              children: [...(item.children || []), newItem]
            };
          }
          if (item.children) {
            return { ...item, children: updateStructure(item.children) };
          }
          return item;
        });
      };
      setFileStructure(updateStructure(fileStructure));
      setExpandedFolders(prev => new Set([...prev, parentFolder]));
    } else {
      // Add to root
      setFileStructure([...fileStructure, newItem]);
    }
    
    // Start editing the new item immediately
    startEditing(newName);
  };

  const handleDragStart = (e: React.DragEvent, itemName: string) => {
    setDraggedItem(itemName);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetFolder: string) => {
    e.preventDefault();
    if (!draggedItem || draggedItem === targetFolder) return;

    // Move item to target folder
    let itemToMove: FileItem | null = null;
    
    // Remove item from current location
    const removeItem = (items: FileItem[]): FileItem[] => {
      return items.filter(item => {
        if (item.name === draggedItem) {
          itemToMove = item;
          return false;
        }
        return true;
      }).map(item => {
        if (item.children) {
          return { ...item, children: removeItem(item.children) };
        }
        return item;
      });
    };

    // Add item to target folder
    const addToTarget = (items: FileItem[]): FileItem[] => {
      return items.map(item => {
        if (item.name === targetFolder && item.type === 'folder' && itemToMove) {
          return {
            ...item,
            children: [...(item.children || []), itemToMove]
          };
        }
        if (item.children) {
          return { ...item, children: addToTarget(item.children) };
        }
        return item;
      });
    };

    let newStructure = removeItem(fileStructure);
    if (itemToMove) {
      newStructure = addToTarget(newStructure);
      setFileStructure(newStructure);
      setExpandedFolders(prev => new Set([...prev, targetFolder]));
    }
    
    setDraggedItem(null);
  };

  const getFileIcon = (filename: string) => {
    return <FileText className="h-4 w-4 text-blue-400" />;
  };

  const getItemPath = (itemName: string, items: FileItem[] = fileStructure, currentPath: string[] = []): string[] => {
    for (const item of items) {
      if (item.name === itemName) {
        return [...currentPath, itemName];
      }
      if (item.children) {
        const found = getItemPath(itemName, item.children, [...currentPath, item.name]);
        if (found.length > 0) return found;
      }
    }
    return [];
  };

  const renderFileStructure = (items: FileItem[], depth = 0, parentPath: string[] = []) => {
    return items.map((item) => {
      const itemPath = [...parentPath, item.name].join('/');
      const isEditing = editingItem === item.name;
      
      return (
        <div key={itemPath}>
          <div
            className={`flex items-center space-x-2 px-2 py-1 hover:bg-gray-700 cursor-pointer group ${
              item.type === 'file' && currentFile === item.name ? 'bg-gray-700 text-blue-400' : 'text-gray-300'
            }`}
            style={{ paddingLeft: `${8 + depth * 16}px` }}
            draggable={!isEditing}
            onDragStart={(e) => handleDragStart(e, item.name)}
            onDragOver={item.type === 'folder' ? handleDragOver : undefined}
            onDrop={item.type === 'folder' ? (e) => handleDrop(e, item.name) : undefined}
            onDoubleClick={() => item.type === 'file' && startEditing(item.name)}
            onClick={() => {
              if (item.type === 'folder') {
                toggleFolder(item.name);
              } else if (!isEditing) {
                onFileSelect(item.name);
              }
            }}
          >
            {item.type === 'folder' ? (
              expandedFolders.has(item.name) ? (
                <FolderOpen className="h-4 w-4 text-yellow-400" />
              ) : (
                <Folder className="h-4 w-4 text-yellow-400" />
              )
            ) : (
              getFileIcon(item.name)
            )}
            
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
                  <DropdownMenuItem onClick={() => startEditing(item.name)} className="text-gray-200 hover:bg-gray-600">
                    <Edit className="h-3 w-3 mr-2" />
                    Rename
                  </DropdownMenuItem>
                  {item.type === 'folder' && (
                    <>
                      <DropdownMenuItem onClick={() => createNewItem('file', item.name)} className="text-gray-200 hover:bg-gray-600">
                        <FileText className="h-3 w-3 mr-2" />
                        New File
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => createNewItem('folder', item.name)} className="text-gray-200 hover:bg-gray-600">
                        <Folder className="h-3 w-3 mr-2" />
                        New Folder
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem onClick={() => deleteItem(item.name)} className="text-red-400 hover:bg-gray-600">
                    <Trash className="h-3 w-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {item.type === 'folder' && expandedFolders.has(item.name) && item.children && (
            <div>
              {renderFileStructure(item.children, depth + 1, [...parentPath, item.name])}
            </div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="p-3 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-gray-300">Explorer</h3>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-gray-400 hover:text-white">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-gray-700 border-gray-600">
              <DropdownMenuItem onClick={() => createNewItem('file')} className="text-gray-200 hover:bg-gray-600">
                <FileText className="h-3 w-3 mr-2" />
                New File
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => createNewItem('folder')} className="text-gray-200 hover:bg-gray-600">
                <Folder className="h-3 w-3 mr-2" />
                New Folder
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2">
        {renderFileStructure(fileStructure)}
      </div>
    </div>
  );
};

export default FileExplorer;
