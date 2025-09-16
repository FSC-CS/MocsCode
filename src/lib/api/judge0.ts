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
  inputCallback?: () => Promise<string>;
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
  'https://judge.mocscode.com/submissions?base64_encoded=true&wait=true';

export async function runJudge0Code({
  projectId,
  compileScript,
  runScript,
  stdin = '',
  expected_output,
  cpu_time_limit = 5, // Default 5 seconds
  memory_limit = 128000, // Default 128MB
  inputCallback
}: Judge0SubmissionRequest): Promise<Judge0SubmissionResponse> {
  // API key and host should be set in environment variables for security
  const additional_files = await projectFilesApi.exportProjectAsBase64Zip(projectId, compileScript, runScript);
  
  // If we have an input callback, we'll handle input interactively
  const isInteractive = !!inputCallback;
  let combinedOutput = '';
  let combinedError = '';

  // For interactive execution, we need to use WebSocket
  if (isInteractive) {
    try {
      // First, create a new submission to get a token
      const createResponse = await fetch(`${JUDGE0_ENDPOINT}/submissions?base64_encoded=false&wait=false`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_code: additional_files,
          language_id: 63, // JavaScript as default, should be dynamic based on project
          stdin: stdin,
          expected_output: expected_output,
          cpu_time_limit: cpu_time_limit,
          memory_limit: memory_limit,
          interactive: true
        })
      });

      if (!createResponse.ok) {
        throw new Error(`Failed to create submission: ${await createResponse.text()}`);
      }

      const { token } = await createResponse.json();
      
      // Open WebSocket connection for interactive I/O
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${wsProtocol}//${apiHost}/submissions/${token}/ws`;
      const ws = new WebSocket(wsUrl);
      
      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          console.log('WebSocket connection established');
        };
        
        ws.onmessage = async (event) => {
          const data = JSON.parse(event.data);
          
          if (data.type === 'output') {
            combinedOutput += data.data;
            // Update the output in real-time if needed
            if (inputCallback) {
              // This would trigger the UI to update
            }
          } else if (data.type === 'error') {
            combinedError += data.data;
          } else if (data.type === 'input_requested') {
            try {
              // Request input from the user
              const userInput = await inputCallback?.();
              if (userInput !== undefined) {
                ws.send(JSON.stringify({
                  type: 'input',
                  data: userInput
                }));
              }
            } catch (error) {
              console.error('Error getting input:', error);
              ws.close();
              reject(error);
            }
          } else if (data.type === 'completed') {
            ws.close();
            resolve({
              stdout: combinedOutput,
              stderr: combinedError,
              status: { id: 3, description: 'Accepted' },
              time: data.time,
              memory: data.memory
            });
          }
        };
        
        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          ws.close();
          reject(new Error('WebSocket connection error'));
        };
        
        ws.onclose = () => {
          console.log('WebSocket connection closed');
        };
      });
    } catch (error) {
      console.error('Interactive execution error:', error);
      return {
        stderr: `Interactive execution failed: ${error.message}`,
        status: { id: 11, description: 'Runtime Error' }
      };
    }
  }
  
  // Non-interactive execution
  const response = await fetch(JUDGE0_ENDPOINT + '/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

  console.log("Judge0 Response", response, response.url);
  
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
