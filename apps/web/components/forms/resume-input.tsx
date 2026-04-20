'use client';

import { FileType, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PdfDropzone } from './pdf-dropzone';
import { LIMITS } from '@resumai/shared';

export type ResumeValue =
  | { mode: 'url'; url: string }
  | { mode: 'text'; text: string }
  | { mode: 'pdf'; file: File | null };

interface Props {
  value: ResumeValue;
  onChange: (v: ResumeValue) => void;
  onError?: (msg: string) => void;
}

export function ResumeInput({ value, onChange, onError }: Props) {
  const charCount = value.mode === 'text' ? value.text.length : 0;
  // URL is not exposed in the UI anymore — resume comes from PDF upload
  // (preferred) or pasted text.
  const safeMode: 'text' | 'pdf' = value.mode === 'url' ? 'pdf' : value.mode;

  return (
    <Tabs
      value={safeMode}
      onValueChange={(next) => {
        if (next === 'text')
          onChange({ mode: 'text', text: value.mode === 'text' ? value.text : '' });
        else onChange({ mode: 'pdf', file: value.mode === 'pdf' ? value.file : null });
      }}
    >
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="pdf" className="flex-1 sm:flex-none">
          <FileText className="size-4" />
          PDF
        </TabsTrigger>
        <TabsTrigger value="text" className="flex-1 sm:flex-none">
          <FileType className="size-4" />
          Текст
        </TabsTrigger>
      </TabsList>

      <TabsContent value="pdf">
        <PdfDropzone
          file={value.mode === 'pdf' ? value.file : null}
          onChange={(file) => onChange({ mode: 'pdf', file })}
          onError={onError}
        />
      </TabsContent>

      <TabsContent value="text" className="space-y-2">
        <Label htmlFor="resume-text">Текст резюме</Label>
        <Textarea
          id="resume-text"
          placeholder="Скопируйте полностью текст своего резюме с hh.ru и вставьте сюда…"
          value={value.mode === 'text' ? value.text : ''}
          onChange={(e) => onChange({ mode: 'text', text: e.target.value })}
          maxLength={LIMITS.resumeTextMax}
          className="min-h-[180px]"
        />
        <p className="text-right text-xs text-muted-foreground">
          {charCount.toLocaleString('ru-RU')} / {LIMITS.resumeTextMax.toLocaleString('ru-RU')}
        </p>
      </TabsContent>
    </Tabs>
  );
}
