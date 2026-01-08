import { useState, useCallback, useEffect } from 'react';
import { runJudge0Code } from '@/lib/api/judge0';
import { getLanguageScripts } from '@/lib/utils/script-templates';

interface UseCodeExecutionProps {
  projectId: string | undefined;
  projectLanguage?: string;
}

interface UseCodeExecutionReturn {
  output: string;
  isRunning: boolean;
  stdin: string;
  compileScript: string;
  runScript: string;
  setOutput: (output: string) => void;
  setStdin: (stdin: string) => void;
  setCompileScript: (script: string) => void;
  setRunScript: (script: string) => void;
  runCode: () => Promise<void>;
}

export function useCodeExecution({ 
  projectId, 
  projectLanguage 
}: UseCodeExecutionProps): UseCodeExecutionReturn {
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [stdin, setStdin] = useState('');
  const [compileScript, setCompileScript] = useState('');
  const [runScript, setRunScript] = useState('');

  // Initialize scripts based on project language
  useEffect(() => {
    if (projectLanguage) {
      const scripts = getLanguageScripts(projectLanguage);
      setCompileScript(scripts.compile);
      setRunScript(scripts.run);
    }
  }, [projectLanguage]);

  const runCode = useCallback(async () => {
    if (!projectId) return;
    
    setIsRunning(true);
    setOutput('');

    try {
      const data = await runJudge0Code({
        projectId: projectId,
        compileScript: compileScript,
        runScript: runScript,
        stdin: stdin,
      });

      const statusId = data.status?.id;
      const isSuccess = statusId === 3;
      const isCompileError = statusId === 6;
      const isInternalError = statusId === 13;
      
      if (isInternalError && data.message) {
        setOutput(prev => prev + `Internal Error: ${data.message}`);
      } else if (isCompileError && data.compile_output) {
        setOutput(prev => prev + `Compilation Error:\n${data.compile_output}`);
      } else if (data.stderr) {
        setOutput(prev => prev + data.stderr);
      } else if (data.stdout) {
        setOutput(prev => prev + data.stdout);
      } else if (!isSuccess && data.status?.description) {
        setOutput(prev => prev + `Error: ${data.status.description}${data.message ? '\n' + data.message : ''}`);
      } else {
        setOutput(prev => prev + 'Code executed successfully (no output)');
      }
    } catch (error: any) {
      console.error('Error running code:', error);
      setOutput(prev => prev + `\nError: ${error.message}`);
    } finally {
      setIsRunning(false);
    }
  }, [projectId, compileScript, runScript, stdin]);

  return {
    output,
    isRunning,
    stdin,
    compileScript,
    runScript,
    setOutput,
    setStdin,
    setCompileScript,
    setRunScript,
    runCode,
  };
}
