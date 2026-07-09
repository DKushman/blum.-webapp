'use client';

import { memo, startTransition, useCallback, type ReactNode } from 'react';

type TodoFolderGroupProps = {
  folderId: string;
  folderColor: string;
  folderName: string;
  todoCount: number;
  groupKey: string;
  isOpen: boolean;
  onToggle: (groupKey: string) => void;
  children: ReactNode;
};

export const TodoFolderGroup = memo(function TodoFolderGroup({
  folderId,
  folderColor,
  folderName,
  todoCount,
  groupKey,
  isOpen,
  onToggle,
  children,
}: TodoFolderGroupProps) {
  const handleToggle = useCallback(() => {
    startTransition(() => onToggle(groupKey));
  }, [groupKey, onToggle]);

  return (
    <div
      id={`todo-folder-group-${folderId}`}
      className="rounded-lg overflow-hidden bg-white shadow-sm border border-gray-100"
    >
      <button
        type="button"
        className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left text-[#222222] hover:bg-gray-50 transition-colors rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]"
        aria-expanded={isOpen}
        onClick={handleToggle}
      >
        <span className="flex items-center gap-2 min-w-0 flex-1">
          <span
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: folderColor }}
          />
          <span className="font-medium truncate">{folderName}</span>
          <span className="text-sm text-[#7D7D7D] shrink-0">{todoCount} To-Dos</span>
        </span>
        <svg
          className={`w-5 h-5 text-[#7D7D7D] shrink-0 transition-transform duration-200 ease-out motion-reduce:transition-none ${
            isOpen ? 'rotate-180' : ''
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden
        >
          <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out motion-reduce:transition-none"
        style={{
          maxHeight: isOpen ? `${Math.min(todoCount, 12) * 76 + 16}px` : 0,
          opacity: isOpen ? 1 : 0,
        }}
      >
        {isOpen ? (
          <div className="px-2 pb-2 pt-0 space-y-2 border-t border-gray-100 bg-[#F0F0F0]">
            {children}
          </div>
        ) : null}
      </div>
    </div>
  );
});
