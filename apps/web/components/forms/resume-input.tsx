'use client';

import { Link2, FileType, FileText } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PdfDropzone } from './pdf-dropzone';
import { HH_URL_REGEX, LIMITS } from '@resumai/shared';

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
  const urlValid = value.mode === 'url' ? HH_URL_REGEX.test(value.url) || value.url === '' : true;
  const charCount = value.mode === 'text' ? value.text.length : 0;

  return (
    <Tabs
      value={value.mode}
      onValueChange={(next) => {
        if (next === 'url') onChange({ mode: 'url', url: value.mode === 'url' ? value.url : '' });
        else if (next === 'text')
          onChange({ mode: 'text', text: value.mode === 'text' ? value.text : '' });
        else onChange({ mode: 'pdf', file: value.mode === 'pdf' ? value.file : null });
      }}
    >
      <TabsList className="w-full sm:w-auto">
        <TabsTrigger value="url" className="flex-1 sm:flex-none">
          <Link2 className="size-4" />
          Ссылка
        </TabsTrigger>
        <TabsTrigger value="text" className="flex-1 sm:flex-none">
          <FileType className="size-4" />
          Текст
        </TabsTrigger>
        <TabsTrigger value="pdf" className="flex-1 sm:flex-none">
          <FileText className="size-4" />
          PDF
        </TabsTrigger>
      </TabsList>

      <TabsContent value="url" className="space-y-2">
        <Label htmlFor="resume-url">Ссылка на резюме hh.ru</Label>
        <Input
          id="resume-url"
          type="url"
          placeholder="https://hh.ru/resume/abc123"
          inputMode="url"
          value={value.mode === 'url' ? value.url : ''}
          onChange={(e) => onChange({ mode: 'url', url: e.target.value })}
          aria-invalid={!urlValid}
        />
        {!urlValid && (
          <p role="alert" className="text-xs text-destructive">
            Ссылка должна начинаться с https://hh.ru/resume/
          </p>
        )}
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

      <TabsContent value="pdf">
        <PdfDropzone
          file={value.mode === 'pdf' ? value.file : null}
          onChange={(file) => onChange({ mode: 'pdf', file })}
          onError={onError}
        />
      </TabsContent>
    </Tabs>
  );
}
