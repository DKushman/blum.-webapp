'use client';

import { memo, useLayoutEffect, useRef, useState } from 'react';

export type TodoStrikeState = 'idle' | 'striking' | 'struck';

type TodoStrikeTitleProps = {
  text: string;
  strikeState: TodoStrikeState;
  id?: string;
};

function TodoStrikeTitleInner({ text, strikeState, id }: TodoStrikeTitleProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const [lineCount, setLineCount] = useState(1);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const style = getComputedStyle(el);
      const lineHeight = parseFloat(style.lineHeight);
      if (!lineHeight) {
        setLineCount(1);
        return;
      }
      const lines = Math.max(1, Math.min(4, Math.round(el.scrollHeight / lineHeight)));
      setLineCount(lines);
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const isMultiLine = lineCount >= 2;
  const className = [
    'todo-title-strike block text-[#222222]',
    strikeState === 'striking' ? 'is-striking' : '',
    strikeState === 'struck' ? 'is-struck' : '',
    isMultiLine ? 'is-multiline' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <span
      ref={ref}
      id={id}
      className={className}
      data-lines={isMultiLine ? String(Math.min(lineCount, 2)) : '1'}
    >
      {text}
    </span>
  );
}

export const TodoStrikeTitle = memo(TodoStrikeTitleInner);
