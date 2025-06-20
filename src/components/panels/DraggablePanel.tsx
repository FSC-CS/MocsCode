import React, { useRef, useState, useCallback } from 'react';
import { useDrag, useDrop } from 'react-dnd';
import { PanelId, usePanels } from '@/contexts/PanelContext';
import { cn } from '@/lib/utils';

interface DraggablePanelProps {
  id: PanelId;
  title: string;
  children: React.ReactNode;
  className?: string;
  isActive?: boolean;
  onActivate?: () => void;
  onClose?: () => void;
  onMinimize?: () => void;
  onRestore?: () => void;
  isMinimized?: boolean;
  showHeader?: boolean;
}

interface DragItem {
  type: string;
  id: PanelId;
  originalPosition: string;
}

export const DraggablePanel: React.FC<DraggablePanelProps> = ({
  id,
  title,
  children,
  className,
  isActive = true,
  onActivate,
  onClose,
  onMinimize,
  onRestore,
  isMinimized = false,
  showHeader = true,
}) => {
  const { movePanel, addToTabGroup, removeFromTabGroup } = usePanels();
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const [{ isDragging }, drag] = useDrag({
    type: 'panel',
    item: { id, type: 'panel' },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'panel',
    hover: (item: DragItem, monitor) => {
      if (!panelRef.current) return;
      
      const dragId = item.id;
      const hoverId = id;

      // Don't replace items with themselves
      if (dragId === hoverId) return;

      // Only set dragging over if we're over the panel header
      const isHoveringHeader = monitor.getClientOffset() && 
        panelRef.current.getBoundingClientRect().top + 40 > (monitor.getClientOffset()?.y || 0);
      
      setIsDraggingOver(isHoveringHeader);
    },
    drop: (item: DragItem, monitor) => {
      const dragId = item.id;
      const hoverId = id;

      if (dragId === hoverId) return;

      // Check if we're dropping on the header (to create a tab group)
      const isDroppingOnHeader = monitor.getClientOffset() && 
        panelRef.current &&
        panelRef.current.getBoundingClientRect().top + 40 > (monitor.getClientOffset()?.y || 0);

      if (isDroppingOnHeader) {
        // Create or add to tab group
        const tabGroupId = `tab-group-${hoverId}-${Date.now()}`;
        addToTabGroup(dragId, tabGroupId);
        addToTabGroup(hoverId, tabGroupId);
      } else {
        // Move panel to this position
        movePanel(dragId, 'right'); // Default to right for now, adjust based on your layout
      }
      
      setIsDraggingOver(false);
      return { id: hoverId };
    },
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true }),
    }),
  });

  // Combine drag and drop refs
  const setRefs = useCallback(
    (element: HTMLDivElement | null) => {
      drag(drop(element));
      panelRef.current = element;
    },
    [drag, drop]
  );

  const opacity = isDragging ? 0.5 : 1;
  const borderColor = isOver ? 'border-blue-500' : 'border-transparent';
  const backgroundColor = isActive ? 'bg-gray-800' : 'bg-gray-800/80';

  return (
    <div
      ref={setRefs}
      className={cn(
        'flex flex-col h-full rounded-lg border-2 transition-all',
        borderColor,
        backgroundColor,
        className,
        {
          'opacity-50': isDragging,
          'cursor-grabbing': isDragging,
          'cursor-grab': !isDragging,
        }
      )}
      style={{ opacity }}
      onClick={onActivate}
      role="button"
      tabIndex={0}
    >
      {showHeader && (
        <div 
          className="flex items-center justify-between px-4 py-2 border-b border-gray-700 bg-gray-900/50 rounded-t-lg"
          onDoubleClick={isMinimized ? onRestore : onMinimize}
        >
          <h3 className="text-sm font-medium text-gray-300 select-none">{title}</h3>
          <div className="flex items-center space-x-2">
            {onMinimize && !isMinimized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMinimize();
                }}
                className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700"
                aria-label="Minimize panel"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    fill="currentColor"
                    d="M10.25 6.75h-8.5a.75.75 0 110-1.5h8.5a.75.75 0 010 1.5z"
                  />
                </svg>
              </button>
            )}
            {onRestore && isMinimized && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRestore();
                }}
                className="text-gray-400 hover:text-gray-200 p-1 rounded hover:bg-gray-700"
                aria-label="Restore panel"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    fill="currentColor"
                    d="M6 3.25a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5V4a.75.75 0 01.75-.75z"
                  />
                </svg>
              </button>
            )}
            {onClose && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
                className="text-gray-400 hover:text-red-400 p-1 rounded hover:bg-gray-700"
                aria-label="Close panel"
              >
                <svg width="12" height="12" viewBox="0 0 12 12">
                  <path
                    fill="currentColor"
                    d="M2.22 2.22a.75.75 0 011.06 0L6 4.94l2.72-2.72a.75.75 0 111.06 1.06L7.06 6l2.72 2.72a.75.75 0 11-1.06 1.06L6 7.06l-2.72 2.72a.75.75 0 01-1.06-1.06L4.94 6 2.22 3.28a.75.75 0 010-1.06z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
      )}
      <div className={cn('flex-1 overflow-auto', { 'hidden': isMinimized })}>
        {children}
      </div>
      {isDraggingOver && (
        <div className="absolute inset-0 bg-blue-500/20 border-2 border-blue-500 rounded pointer-events-none" />
      )}
    </div>
  );
};
