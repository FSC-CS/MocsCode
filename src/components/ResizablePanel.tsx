import React, { useState, useEffect, useRef } from 'react';

interface ResizablePanelProps {
  direction: 'horizontal' | 'vertical';
  initialSize: number;
  minSize?: number;
  maxSize?: number;
  children: React.ReactNode;
  className?: string;
  onResize?: (newSize: number) => void;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({
  direction,
  initialSize,
  minSize = 100,
  maxSize = 2000,
  children,
  className = '',
  onResize,
}) => {
  const [size, setSize] = useState(initialSize);
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const startPosRef = useRef(0);
  const startSizeRef = useRef(initialSize);

  const isHorizontal = direction === 'horizontal';
  const resizeHandleClass = isHorizontal 
    ? 'w-2 cursor-col-resize hover:bg-blue-500 active:bg-blue-600 transition-colors duration-150'
    : 'h-2 cursor-row-resize hover:bg-blue-500 active:bg-blue-600 transition-colors duration-150';

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const delta = isHorizontal ? e.clientX - startPosRef.current : e.clientY - startPosRef.current;
      let newSize = startSizeRef.current + delta;

      // Apply constraints
      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      
      setSize(newSize);
      onResize?.(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = isHorizontal ? 'col-resize' : 'row-resize';
      document.body.style.userSelect = 'none';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging, isHorizontal, minSize, maxSize, onResize]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    startPosRef.current = isHorizontal ? e.clientX : e.clientY;
    startSizeRef.current = size;
  };

  const style = isHorizontal 
    ? { width: `${size}px`, minWidth: `${minSize}px`, maxWidth: `${maxSize}px` }
    : { height: `${size}px`, minHeight: `${minSize}px`, maxHeight: `${maxSize}px` };

  return (
    <div 
      ref={panelRef}
      className={`relative ${isHorizontal ? 'flex' : ''} ${className}`}
      style={style}
    >
      {children}
      <div
        className={`absolute ${isHorizontal ? 'right-0 top-0 h-full' : 'bottom-0 left-0 w-full'}`}
        onMouseDown={handleMouseDown}
      >
        <div className={resizeHandleClass} />
      </div>
    </div>
  );
};

export default ResizablePanel;
