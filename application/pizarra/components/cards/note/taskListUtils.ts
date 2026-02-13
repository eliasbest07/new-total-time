export interface TaskItem {
  text: string;
  checked: boolean;
}

export const TASK_LIST_MARKER = 'data-task-list="true"';

export const isTaskListContent = (content: string | null): boolean => {
  if (!content) return false;
  return content.includes(TASK_LIST_MARKER);
};

export const parseTaskItems = (content: string): TaskItem[] => {
  const items: TaskItem[] = [];
  const regex = /<li data-checked="(true|false)">([\s\S]*?)<\/li>/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    items.push({
      checked: match[1] === 'true',
      text: match[2],
    });
  }
  return items;
};

export const taskItemsToHtml = (items: TaskItem[]): string => {
  const lis = items
    .map((item) => `<li data-checked="${item.checked}">${item.text}</li>`)
    .join('');
  return `<ul ${TASK_LIST_MARKER}>${lis}</ul>`;
};

const htmlToPlainLines = (html: string): string[] => {
  let inner = html;
  inner = inner.replace(/<ul[^>]*data-task-list[^>]*>/g, '');
  inner = inner.replace(/<\/ul>/g, '');
  inner = inner.replace(/<li[^>]*>/g, '');
  inner = inner.replace(/<\/li>/g, '\n');
  inner = inner.replace(/<br\s*\/?>/gi, '\n');
  inner = inner.replace(/<div>/gi, '\n');
  inner = inner.replace(/<\/div>/gi, '');
  inner = inner.replace(/<p>/gi, '\n');
  inner = inner.replace(/<\/p>/gi, '');
  inner = inner.replace(/<[^>]+>/g, '');
  inner = inner.replace(/&amp;/g, '&');
  inner = inner.replace(/&lt;/g, '<');
  inner = inner.replace(/&gt;/g, '>');
  inner = inner.replace(/&nbsp;/g, ' ');
  return inner
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
};

export const contentToTaskItems = (content: string | null): TaskItem[] => {
  if (!content) return [{ text: '', checked: false }];
  if (isTaskListContent(content)) return parseTaskItems(content);
  const lines = htmlToPlainLines(content);
  if (lines.length === 0) return [{ text: '', checked: false }];
  return lines.map((line) => ({ text: line, checked: false }));
};
