import { useState, useCallback, useRef } from 'react';
import { useApi } from '@/contexts/ApiContext';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { useYjsDocuments } from '@/editor/useYjsDocuments';
import type { OpenFile } from '../types';

interface UseFileManagementProps {
  projectId: string | undefined;
}

interface UseFileManagementReturn {
  openFiles: (OpenFile & { id?: string })[];
  activeFileIndex: number;
  activeFile: (OpenFile & { id?: string }) | undefined;
  isSaving: boolean;
  setActiveFileIndex: (index: number) => void;
  openFile: (filename: string, fileId?: string) => Promise<void>;
  closeFile: (index: number) => void;
  updateFileContent: (content: string) => void;
  saveCurrentFile: (isAutoSave?: boolean) => Promise<void>;
  handleFileRenamed: (fileId: string, oldName: string, newName: string) => void;
  handleFileDeleted: (deletedFileId: string) => void;
}

const LANGUAGE_MAP: Record<string, string> = {
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

function getLanguageFromFile(filename: string): string {
  const extension = filename.split('.').pop()?.toLowerCase() || '';
  return LANGUAGE_MAP[extension] || 'plaintext';
}

function getDefaultContent(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'java': {
      const className = fileName.replace('.java', '');
      return `public class ${className} {\n    public static void main(String[] args) {\n        System.out.println("Hello, World!");\n    }\n}`;
    }
    case 'py':
      return `# ${fileName}\n# Python file\n\nprint("Hello, World!")`;
    case 'js':
      return `// ${fileName}\n// JavaScript file\n\nconsole.log("Hello, World!");`;
    case 'c':
      return `#include <stdio.h>\n\nint main() {\n    printf("Hello, World!\\n");\n    return 0;\n}`;
    case 'cpp':
      return `#include <iostream>\n\nint main() {\n    std::cout << "Hello, World!" << std::endl;\n    return 0;\n}`;
    case 'cs':
      return `using System;\n\nclass Program {\n    static void Main() {\n        Console.WriteLine("Hello, World!");\n    }\n}`;
    case 'md':
      return `# ${fileName.replace('.md', '')}\n\nAdd your documentation here.`;
    case 'txt':
      return `This is a text file.\nAdd your content here.`;
    default:
      return `// ${fileName}\n// Add your code here`;
  }
}

export function useFileManagement({ projectId }: UseFileManagementProps): UseFileManagementReturn {
  const { projectFilesApi } = useApi();
  const { dbUser } = useAuth();
  const { toast } = useToast();
  const { getOrCreateDoc, destroyDoc } = useYjsDocuments();

  const [openFiles, setOpenFiles] = useState<(OpenFile & { id?: string })[]>([]);
  const [activeFileIndex, setActiveFileIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  
  const saveTimeout = useRef<NodeJS.Timeout | null>(null);

  const activeFile = openFiles[activeFileIndex];

  const openFile = useCallback(async (filename: string, fileId?: string) => {
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

    setOpenFiles(prev => [...prev, newFile]);
    setActiveFileIndex(openFiles.length);
  }, [openFiles, projectFilesApi, getOrCreateDoc, dbUser, toast]);

  const closeFile = useCallback((index: number) => {
    const fileToClose = openFiles[index];
    const newOpenFiles = openFiles.filter((_, i) => i !== index);
    setOpenFiles(newOpenFiles);
    
    if (index === activeFileIndex) {
      setActiveFileIndex(Math.max(0, index - 1));
    } else if (index < activeFileIndex) {
      setActiveFileIndex(activeFileIndex - 1);
    }

    if (fileToClose?.id) {
      destroyDoc(fileToClose.id);
    }
  }, [openFiles, activeFileIndex, destroyDoc]);

  const handleFileDeleted = useCallback((deletedFileId: string) => {
    const fileIndex = openFiles.findIndex(file => file.id === deletedFileId);
    if (fileIndex !== -1) {
      closeFile(fileIndex);
    }
  }, [openFiles, closeFile]);

  const handleFileRenamed = useCallback((fileId: string, oldName: string, newName: string) => {
    setOpenFiles(prevFiles => 
      prevFiles.map(file => 
        file.id === fileId || (file.id === undefined && file.name === oldName)
          ? { ...file, name: newName, language: getLanguageFromFile(newName) }
          : file
      )
    );
  }, []);

  const saveCurrentFile = useCallback(async (isAutoSave = false) => {
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
  }, [openFiles, activeFileIndex, isSaving, getOrCreateDoc, dbUser, projectFilesApi, toast]);

  const updateFileContent = useCallback((content: string) => {
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
          const { error } = await projectFilesApi.updateFile(currentFile.id!, {
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
  }, [openFiles, activeFileIndex, projectFilesApi, toast]);

  return {
    openFiles,
    activeFileIndex,
    activeFile,
    isSaving,
    setActiveFileIndex,
    openFile,
    closeFile,
    updateFileContent,
    saveCurrentFile,
    handleFileRenamed,
    handleFileDeleted,
  };
}
