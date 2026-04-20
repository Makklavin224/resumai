'use client';

import { useDropzone } from 'react-dropzone';
import { FilePlus, FileText, Trash2 } from 'lucide-react';
import { useCallback } from 'react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { LIMITS } from '@resumai/shared';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
  onError?: (msg: string) => void;
}

export function PdfDropzone({ file, onChange, onError }: Props) {
  const onDrop = useCallback(
    (accepted: File[], rejected: unknown[]) => {
      if (rejected.length > 0) {
        onError?.('Файл не подошёл. Нужен PDF или DOCX до 10 МБ.');
        return;
      }
      const next = accepted[0];
      if (next) onChange(next);
    },
    [onChange, onError],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: LIMITS.pdfMaxBytes,
  });

  if (file) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
    return (
      <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-4">
        <span className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{file.name}</p>
          <p className="text-xs text-muted-foreground">{sizeMb} МБ · PDF / DOCX</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Удалить файл"
          onClick={() => onChange(null)}
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div
      {...getRootProps()}
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-muted/30 p-8 text-center transition',
        'hover:border-primary hover:bg-primary/5',
        isDragActive && 'border-primary bg-primary/10',
      )}
    >
      <input {...getInputProps()} aria-label="Загрузить резюме" />
      <span className="grid size-12 place-items-center rounded-xl bg-primary/12 text-primary">
        <FilePlus className="size-6" />
      </span>
      <p className="text-sm font-medium">
        {isDragActive ? 'Отпустите файл здесь' : 'Перетащите PDF резюме сюда'}
      </p>
      <p className="text-xs text-muted-foreground">
        или нажмите, чтобы выбрать. До 10 МБ · PDF или DOCX
      </p>
    </div>
  );
}
