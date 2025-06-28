import JSZip from 'jszip';
import { ProjectsApi } from '@/lib/api/projects';
import { ProjectFilesApi } from '@/lib/api/project-files';
import { Project, ProjectFile } from '@/lib/api/types';

// Utility to import a ZIP as a new project
export async function importZipAsProject({
  zipFile,
  projectName,
  userId,
  projectsApi,
  projectFilesApi,
  onProgress,
  isPublic = false,
  description = '',
  language = 'JavaScript',
}: {
  zipFile: File,
  projectName: string,
  userId: string,
  projectsApi: ProjectsApi,
  projectFilesApi: ProjectFilesApi,
  onProgress?: (percent: number) => void,
  isPublic?: boolean,
  description?: string,
  language?: string,
}): Promise<{ project: Project | null, error: Error | null }> {
  // 0. Check for duplicate project name
  const { data: projectsList, error: projectsListError } = await projectsApi.listUserProjects(userId);
  if (projectsListError) return { project: null, error: projectsListError };
  const normalizedNewName = projectName.trim().toLowerCase();
  if (projectsList?.items.some(p => p.name.trim().toLowerCase() === normalizedNewName)) {
    return { project: null, error: new Error('A project with this name already exists.') };
  }

  // 1. Create the project
  const { data: project, error: projectError } = await projectsApi.createProject({
    name: projectName,
    description,
    owner_id: userId,
    is_public: isPublic,
    language,
  });
  if (projectError || !project) return { project: null, error: projectError || new Error('Failed to create project') };

  // 2. Extract ZIP and upload files/folders
  const zip = await JSZip.loadAsync(zipFile);
  const files = Object.values(zip.files);
  const total = files.length;
  let processed = 0;

  // --- Detect common root folder (if any) ---
  // Get all non-empty, non-dot root segments
  const rootSegments = files
    .map(f => f.name.split('/').filter(Boolean)[0])
    .filter(Boolean);
  const rootFolder = rootSegments.length > 0 && rootSegments.every(seg => seg === rootSegments[0]) ? rootSegments[0] : '';

  // Map from folder path to file ID for parent_id resolution
  // All keys will be relative to the project root (with rootFolder stripped)
  const folderIdMap: Record<string, string | null> = { '': null }; // project root

  for (const entry of files) {
    // Strip root folder from path if present
    let relativePath = entry.name;
    if (rootFolder && relativePath.startsWith(rootFolder + '/')) {
      relativePath = relativePath.slice(rootFolder.length + 1);
    } else if (rootFolder && relativePath === rootFolder) {
      // This is the root folder entry itself, skip it
      continue;
    }
    const path = relativePath.replace(/\/$/, ''); // Remove trailing slash for folders
    if (!path) continue; // Skip empty path (would be root folder)
    const segments = path.split('/');
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/');

    if (entry.dir) {
      // Create directory in DB
      const { data: folder, error } = await projectFilesApi.createFile({
        project_id: project.id,
        name,
        path: relativePath, // already stripped root
        file_type: 'directory',
        mime_type: undefined,
        size_bytes: 0,
        parent_id: folderIdMap[parentPath] || null,
        content: undefined,
        created_by: userId,
      });
      if (error) return { project, error };
      folderIdMap[path] = folder?.id || null;
    } else {
      // Create file in DB
      const content = await entry.async('string');
      const { data: file, error } = await projectFilesApi.createFile({
        project_id: project.id,
        name,
        path: relativePath,
        file_type: 'file',
        mime_type: undefined, // Optionally infer from extension
        size_bytes: content.length,
        parent_id: folderIdMap[parentPath] || null,
        content,
        created_by: userId,
      });
      if (error) return { project, error };
    }

    processed++;
    if (onProgress) onProgress(Math.round((processed / total) * 100));
  }

  return { project, error: null };
}