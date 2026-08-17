// design-system/src/patterns/DiffPreview.tsx
// DiffPreview — inline diff view for proposal changes, intervention diff, entity diff

import * as React from 'react';
import { clsx } from 'clsx';
import { Panel } from './Panel';
import { Badge } from '../primitives/Badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../primitives/Tabs';
import { Button } from '../primitives/Button';
import { CopyIcon } from 'lucide-react';

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged' | 'context';
  content: string;
  lineNumber?: { old?: number; new?: number };
}

interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  lines: DiffLine[];
}

interface FileDiff {
  path: string;
  oldPath?: string;
  newPath?: string;
  status: 'added' | 'removed' | 'modified' | 'renamed';
  hunks: DiffHunk[];
  binary?: boolean;
}

interface DiffPreviewProps {
  diffs: FileDiff[];
  defaultView?: 'unified' | 'split';
  showLineNumbers?: boolean;
  maxLinesPerFile?: number;
  onViewChange?: (view: 'unified' | 'split') => void;
  className?: string;
}

export const DiffPreview = React.forwardRef<HTMLDivElement, DiffPreviewProps>(
  ({ className, diffs, defaultView = 'unified', showLineNumbers = true, maxLinesPerFile = 200, onViewChange, ...props }, ref) => {
    const [view, setView] = React.useState<'unified' | 'split'>(defaultView);

    const handleViewChange = (newView: 'unified' | 'split') => {
      setView(newView);
      onViewChange?.(newView);
    };

    return (
      <Panel variant="outlined" density="compact" className={clsx('w-full', className)} {...props}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-4">
            <Tabs value={view} onValueChange={handleViewChange} className="w-auto">
              <TabsList className="bg-transparent p-0">
                <TabsTrigger value="unified" className="px-3 py-1.5 text-body-xs">
                  Unified
                </TabsTrigger>
                <TabsTrigger value="split" className="px-3 py-1.5 text-body-xs">
                  Split
                </TabsTrigger>
              </TabsList>
            </Tabs>
            {diffs.some((d) => d.status === 'renamed') && (
              <Badge variant="outline" size="xs">
                {diffs.filter((d) => d.status === 'renamed').length} renamed
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="xs">
              <CopyIcon className="h-3 w-3" aria-hidden="true" />
              Copy Diff
            </Button>
          </div>
        </div>

        <TabsContent value="unified" className="mt-2">
          <UnifiedDiffView diffs={diffs} showLineNumbers={showLineNumbers} maxLinesPerFile={maxLinesPerFile} />
        </TabsContent>

        <TabsContent value="split" className="mt-2">
          <SplitDiffView diffs={diffs} showLineNumbers={showLineNumbers} maxLinesPerFile={maxLinesPerFile} />
        </TabsContent>
      </Panel>
    );
  }
);
DiffPreview.displayName = 'DiffPreview';

function UnifiedDiffView({ diffs, showLineNumbers, maxLinesPerFile }: { diffs: FileDiff[]; showLineNumbers: boolean; maxLinesPerFile: number }) {
  return (
    <div className="space-y-4 font-mono text-body-xs overflow-x-auto">
      {diffs.map((fileDiff) => (
        <FileDiffUnified key={fileDiff.path} diff={fileDiff} showLineNumbers={showLineNumbers} maxLines={maxLinesPerFile} />
      ))}
    </div>
  );
}

function SplitDiffView({ diffs, showLineNumbers, maxLinesPerFile }: { diffs: FileDiff[]; showLineNumbers: boolean; maxLinesPerFile: number }) {
  return (
    <div className="space-y-4 font-mono text-body-xs overflow-x-auto">
      {diffs.map((fileDiff) => (
        <FileDiffSplit key={fileDiff.path} diff={fileDiff} showLineNumbers={showLineNumbers} maxLines={maxLinesPerFile} />
      ))}
    </div>
  );
}

function lineClassName(type: DiffLine['type']): string {
  switch (type) {
    case 'added':
      return 'bg-success/10';
    case 'removed':
      return 'bg-critical/10';
    case 'context':
      return 'bg-surface-muted/50';
    default:
      return '';
  }
}

function statusVariant(status: FileDiff['status']): BadgeProps['variant'] {
  switch (status) {
    case 'added':
      return 'success';
    case 'removed':
      return 'critical';
    case 'renamed':
      return 'warning';
    default:
      return 'brand';
  }
}

function FileDiffUnified({ diff, showLineNumbers, maxLines }: { diff: FileDiff; showLineNumbers: boolean; maxLines: number }) {
  if (diff.binary) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center gap-2 text-body-xs">
          <Badge variant="outline" size="xs">{diff.status}</Badge>
          <span className="font-mono">{diff.path}</span>
          <span className="text-text-muted">(binary file)</span>
        </div>
      </div>
    );
  }

  let totalLines = 0;
  const allLines: (DiffLine & { hunkIndex: number })[] = [];
  diff.hunks.forEach((hunk, hunkIndex) => {
    hunk.lines.forEach((line) => {
      if (totalLines < maxLines) {
        allLines.push({ ...line, hunkIndex });
        totalLines++;
      }
    });
  });
  const truncated = totalLines >= maxLines && diff.hunks.some((h) => h.lines.length > 0);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center gap-2 text-body-xs">
        <Badge variant={statusVariant(diff.status)} size="xs">{diff.status}</Badge>
        <span className="font-mono flex-1 truncate">{diff.path}</span>
        {diff.oldPath && diff.oldPath !== diff.path && <span className="text-text-muted">← {diff.oldPath}</span>}
        {truncated && (
          <Badge variant="outline" size="xs">
            +{diff.hunks.reduce((a, h) => a + h.lines.length, 0) - maxLines} more lines
          </Badge>
        )}
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        <table className="w-full border-collapse text-left">
          <tbody>
            {allLines.map((line, i) => (
              <tr key={i} className={lineClassName(line.type)}>
                {showLineNumbers && (
                  <>
                    <td className={clsx('w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none', line.lineNumber?.old ? '' : 'empty')}>
                      {line.lineNumber?.old ?? ''}
                    </td>
                    <td className={clsx('w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none', line.lineNumber?.new ? '' : 'empty')}>
                      {line.lineNumber?.new ?? ''}
                    </td>
                  </>
                )}
                <td className="p-1.5 whitespace-pre-wrap break-all">{line.content}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FileDiffSplit({ diff, showLineNumbers, maxLines }: { diff: FileDiff; showLineNumbers: boolean; maxLines: number }) {
  if (diff.binary) {
    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center gap-2 text-body-xs">
          <Badge variant="outline" size="xs">{diff.status}</Badge>
          <span className="font-mono">{diff.path}</span>
          <span className="text-text-muted">(binary file)</span>
        </div>
      </div>
    );
  }

  const leftLines: (DiffLine & { lineNumber?: number })[] = [];
  const rightLines: (DiffLine & { lineNumber?: number })[] = [];

  diff.hunks.forEach((hunk) => {
    hunk.lines.forEach((line) => {
      if (line.type === 'removed' || line.type === 'unchanged') {
        leftLines.push({ ...line, lineNumber: line.lineNumber?.old });
      }
      if (line.type === 'added' || line.type === 'unchanged') {
        rightLines.push({ ...line, lineNumber: line.lineNumber?.new });
      }
      if (line.type === 'context') {
        leftLines.push({ ...line, lineNumber: line.lineNumber?.old });
        rightLines.push({ ...line, lineNumber: line.lineNumber?.new });
      }
    });
  });

  const maxLen = Math.max(leftLines.length, rightLines.length);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="px-3 py-2 bg-surface-muted border-b border-border flex items-center gap-2 text-body-xs">
        <Badge variant={statusVariant(diff.status)} size="xs">{diff.status}</Badge>
        <span className="font-mono flex-1 truncate">{diff.path}</span>
      </div>
      <div className="grid grid-cols-2 max-h-[400px] overflow-y-auto">
        <div className="border-r border-border bg-surface-muted/30">
          <div className="sticky top-0 px-2 py-1 bg-surface-muted border-b border-border text-center text-text-muted font-medium text-body-xs">
            Old
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {leftLines.slice(0, maxLines).map((line, i) => (
                <tr key={i} className={lineClassName(line.type === 'removed' ? 'removed' : 'unchanged')}>
                  {showLineNumbers && (
                    <td className="w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none">
                      {line.lineNumber ?? ''}
                    </td>
                  )}
                  <td className="p-1.5 whitespace-pre-wrap break-all">{line.content || ''}</td>
                </tr>
              ))}
              {leftLines.length < maxLen && [...Array(maxLen - leftLines.length)].map((_, i) => (
                <tr key={`empty-left-${i}`}>
                  {showLineNumbers && <td className="w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none" />}
                  <td className="p-1.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <div className="sticky top-0 px-2 py-1 bg-surface-muted border-b border-border text-center text-text-muted font-medium text-body-xs">
            New
          </div>
          <table className="w-full border-collapse">
            <tbody>
              {rightLines.slice(0, maxLines).map((line, i) => (
                <tr key={i} className={lineClassName(line.type === 'added' ? 'added' : 'unchanged')}>
                  {showLineNumbers && (
                    <td className="w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none">
                      {line.lineNumber ?? ''}
                    </td>
                  )}
                  <td className="p-1.5 whitespace-pre-wrap break-all">{line.content || ''}</td>
                </tr>
              ))}
              {rightLines.length < maxLen && [...Array(maxLen - rightLines.length)].map((_, i) => (
                <tr key={`empty-right-${i}`}>
                  {showLineNumbers && <td className="w-16 pr-3 text-right text-text-muted border-r border-border/50 select-none" />}
                  <td className="p-1.5" />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'critical' | 'outline' | 'brand';
  size?: 'xs' | 'sm' | 'md';
  children: React.ReactNode;
}