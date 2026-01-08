/**
 * CodeEditor Component
 * 
 * This file re-exports the refactored CodeEditor from the features directory.
 * The component has been split into smaller, more maintainable pieces:
 * 
 * - src/features/editor/CodeEditor.tsx - Main component
 * - src/features/editor/components/ - UI components
 * - src/features/editor/hooks/ - Custom hooks
 * - src/features/editor/types.ts - TypeScript interfaces
 * 
 * @deprecated Import from '@/features/editor' instead for new code
 */
export { default } from '@/features/editor/CodeEditor';
export * from '@/features/editor/types';
