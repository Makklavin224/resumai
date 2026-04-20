'use client';

import { Link2, FileType } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { HH_URL_REGEX, LIMITS } from '@resumai/shared';

export type VacancyValue =
  | { mode: 'url'; url: string }
  | { mode: 'text'; text: string };

interface Props {
  value: VacancyValue;
  onChange: (v: VacancyValue) => void;
}

export function VacancyInput({ value, onChange }: Props) {
  const urlValid = value.mode === 'url' ? HH_URL_REGEX.test(value.url) || value.url === '' : true;
  const charCount = value.mode === 'text' ? value.text.length : 0;

  return (
    <Tabs
      value={value.mode}
      onValueChange={(next) => {
        if (next === 'url') onChange({ mode: 'url', url: value.mode === 'url' ? value.url : '' });
        else onChange({ mode: 'text', text: value.mode === 'text' ? value.text : '' });
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
      </TabsList>

      <TabsContent value="url" className="space-y-2">
        <Label htmlFor="vacancy-url">Ссылка на вакансию hh.ru</Label>
        <Input
          id="vacancy-url"
          type="url"
          placeholder="https://hh.ru/vacancy/12345678"
          inputMode="url"
          value={value.mode === 'url' ? value.url : ''}
          onChange={(e) => onChange({ mode: 'url', url: e.target.value })}
          aria-invalid={!urlValid}
        />
        {!urlValid && (
          <p role="alert" className="text-xs text-destructive">
            Ссылка должна начинаться с https://hh.ru/vacancy/
          </p>
        )}
      </TabsContent>

      <TabsContent value="text" className="space-y-2">
        <Label htmlFor="vacancy-text">Текст вакансии</Label>
        <Textarea
          id="vacancy-text"
          placeholder="Скопируйте описание вакансии целиком и вставьте сюда…"
          value={value.mode === 'text' ? value.text : ''}
          onChange={(e) => onChange({ mode: 'text', text: e.target.value })}
          maxLength={LIMITS.vacancyTextMax}
          className="min-h-[180px]"
        />
        <p className="text-right text-xs text-muted-foreground">
          {charCount.toLocaleString('ru-RU')} / {LIMITS.vacancyTextMax.toLocaleString('ru-RU')}
        </p>
      </TabsContent>
    </Tabs>
  );
}
