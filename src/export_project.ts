import JSZip from 'jszip';
import { ProjectsApi } from '@/lib/api/projects';
import { ProjectFilesApi } from '@/lib/api/project-files';
import { Project, ProjectFile } from '@/lib/api/types';

/**
 * Utility to export a project as a ZIP file
 * @param options Export options
 * @returns Promise with the ZIP blob and any error
 */
export async function exportProjectAsZip({
  projectId,
  projectsApi,
  projectFilesApi,
  onProgress,
  includeMetadata = true,
}: {
  projectId: string,
  projectsApi: ProjectsApi,
  projectFilesApi: ProjectFilesApi,
  onProgress?: (percent: number) => void,
  includeMetadata?: boolean,
}): Promise<{ zipBlob: Blob | null, error: Error | null }> {
  try {
    // 1. Get project details
    const { data: project, error: projectError } = await projectsApi.getProject(projectId);
    if (projectError || !project) {
      return { zipBlob: null, error: projectError || new Error('Failed to fetch project details') };
    }

    // 2. Fetch all files for the project
    const { data: files, error: filesError } = await projectFilesApi.listProjectFiles(projectId);
    if (filesError || !files) {
      return { zipBlob: null, error: filesError || new Error('Failed to fetch project files') };
    }

    // 3. Create ZIP file
    const zip = new JSZip();
    const total = files.items.length;
    let processed = 0;

    // Map from file ID to file object for quick lookup
    const fileMap: Record<string, ProjectFile> = {};
    files.items.forEach(file => {
      fileMap[file.id] = file;
    });

    // Add project metadata if requested
    if (includeMetadata) {
      const metadata = {
        name: project.name,
        description: project.description,
        language: project.language,
        created_at: project.created_at,
        updated_at: project.updated_at,
        is_public: project.is_public,
      };
      zip.file('project-metadata.json', JSON.stringify(metadata, null, 2));
    }

    // Process each file and add to ZIP
    for (const file of files.items) {
      // Skip directories as they'll be created implicitly
      if (file.file_type === 'directory') {
        processed++;
        if (onProgress) onProgress(Math.round((processed / total) * 100));
        continue;
      }

      // Add file to ZIP with its full path
      zip.file(file.path, file.content || '');

      processed++;
      if (onProgress) onProgress(Math.round((processed / total) * 100));
    }

    // Generate ZIP blob
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    return { zipBlob, error: null };
  } catch (error) {
    return { zipBlob: null, error: error instanceof Error ? error : new Error(String(error)) };
  }
}

/**
 * Helper function to trigger a download of the exported project ZIP
 * @param zipBlob The ZIP blob to download
 * @param fileName The name for the downloaded file
 */
export function downloadProjectZip(zipBlob: Blob, fileName: string): void {
  const url = URL.createObjectURL(zipBlob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.endsWith('.zip') ? fileName : `${fileName}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
