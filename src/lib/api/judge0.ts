import { ProjectFilesApi } from './project-files';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const apiConfig = { client: supabase };
const projectFilesApi = new ProjectFilesApi(apiConfig);

export interface Judge0SubmissionRequest {
  projectId: string;
  stdin?: string;
  expected_output?: string;
  cpu_time_limit?: number;
  memory_limit?: number;
  compileScript?: string;
  runScript?: string;
}

export interface Judge0SubmissionResponse {
  stdout?: string;
  stderr?: string;
  compile_output?: string;
  message?: string;
  status?: { id: number; description: string };
  time?: string;
  memory?: number;
}

const JUDGE0_ENDPOINT =
  'https://judge.mocscode.com';

export async function runJudge0Code({
  projectId,
  compileScript,
  runScript,
  stdin,
  expected_output,
  cpu_time_limit,
  memory_limit,
}: Judge0SubmissionRequest): Promise<Judge0SubmissionResponse> {
  // API key and host should be set in environment variables for security
  const apiHost = 'judge.mocscode.com';
  const additional_files = await projectFilesApi.exportProjectAsBase64Zip(projectId, compileScript, runScript);

  const response = await fetch(JUDGE0_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-RapidAPI-Host': apiHost,
    },
    body: JSON.stringify({
      additional_files,
      language_id: 89,
      stdin,
      expected_output,
      cpu_time_limit,
      memory_limit,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Judge0 API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  data.stdout = data.stdout !== null ? atob(data.stdout) : data.stdout;
  data.stderr = data.stderr !== null ? atob(data.stderr) : data.stderr;
  data.compile_output = data.compile_output !== null ? atob(data.compile_output) : data.compile_output;
  data.message = data.message !== null ? atob(data.message) : data.message;

  return data;
}
