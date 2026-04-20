'use client';

import { useState } from 'react';
import { Copy, Download, Mail, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useClipboard } from '@/lib/hooks';

export function CoverLetter({
  text,
  locked,
  previewText,
}: {
  text: string;
  locked?: boolean;
  previewText?: string;
}) {
  const { copy, copied } = useClipboard();
  const [downloading, setDownloading] = useState(false);

  async function onCopy() {
    const ok = await copy(text);
    toast[ok ? 'success' : 'error'](ok ? 'Скопировано' : 'Не получилось скопировать');
  }

  function onDownload() {
    setDownloading(true);
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'cover-letter.txt';
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Скачан cover-letter.txt');
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Mail className="size-5 text-primary" />
            Сопроводительное письмо
          </h3>
          {!locked && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onCopy}>
                {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                {copied ? 'Скопировано' : 'Копировать'}
              </Button>
              <Button variant="ghost" size="sm" onClick={onDownload} disabled={downloading}>
                <Download className="size-3.5" />
                .txt
              </Button>
            </div>
          )}
        </div>
        <p
          className={`whitespace-pre-line rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm leading-relaxed ${
            locked ? 'italic text-muted-foreground' : ''
          }`}
        >
          {locked ? previewText || text : text}
        </p>
      </CardContent>
    </Card>
  );
}
