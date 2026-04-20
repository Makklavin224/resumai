'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authApi } from '@/lib/auth-client';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await authApi.register(email, password, displayName || undefined);
      toast.success('Аккаунт создан. Добро пожаловать!');
      router.push('/profile');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6 sm:py-24">
      <Card>
        <CardContent className="space-y-6 p-8">
          <header className="space-y-1 text-center">
            <h1 className="font-display text-3xl font-bold">Регистрация</h1>
            <p className="text-sm text-muted-foreground">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="font-semibold text-primary hover:underline">
                Войти
              </Link>
            </p>
          </header>

          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя (необязательно)</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Пароль</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Минимум 8 символов.</p>
            </div>
            {error && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              <UserPlus className="size-4" />
              {loading ? 'Создаём…' : 'Создать аккаунт'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Регистрируясь, вы соглашаетесь с{' '}
              <Link href="/legal/terms" className="underline hover:text-foreground">
                офертой
              </Link>{' '}
              и{' '}
              <Link href="/legal/privacy" className="underline hover:text-foreground">
                политикой конфиденциальности
              </Link>
              .
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
