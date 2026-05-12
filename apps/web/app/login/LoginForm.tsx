'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { parseLoginIdentifier } from '@/lib/auth/identifier'

type LoginLabels = {
  account: string
  accountPlaceholder: string
  accountHelp: string
  password: string
  submit: string
  loading: string
  error: string
  invalidAccount: string
  footer: string
}

export default function LoginForm({ labels }: { labels: LoginLabels }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [account, setAccount] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const identifier = parseLoginIdentifier(account)
    if (!identifier) {
      setError(labels.invalidAccount)
      return
    }
    setLoading(true)

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword(
      identifier.kind === 'phone'
        ? { phone: identifier.phone, password }
        : { email: identifier.email, password },
    )
    setLoading(false)

    if (signInError) {
      setError(labels.error)
      return
    }

    const next = searchParams.get('next')
    router.replace(next?.startsWith('/') ? next : '/')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {labels.account}
        </span>
        <input
          className="field-input px-4 py-3"
          type="text"
          autoComplete="username"
          required
          placeholder={labels.accountPlaceholder}
          value={account}
          onChange={event => setAccount(event.target.value)}
        />
        <span className="mt-1.5 block text-xs" style={{ color: 'var(--text-muted)' }}>{labels.accountHelp}</span>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {labels.password}
        </span>
        <input
          className="field-input px-4 py-3"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={event => setPassword(event.target.value)}
        />
      </label>

      {error ? (
        <div className="notice-banner rounded-xl px-4 py-3 text-sm" style={{ borderColor: 'var(--status-failed-text)' }}>
          {error}
        </div>
      ) : null}

      <button disabled={loading} type="submit" className="primary-action w-full rounded-xl px-4 py-3 text-sm font-semibold disabled:opacity-60">
        {loading ? labels.loading : labels.submit}
      </button>
      <p className="text-xs leading-5" style={{ color: 'var(--text-muted)' }}>
        {labels.footer}
      </p>
    </form>
  )
}
