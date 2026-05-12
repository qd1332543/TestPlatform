'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Labels = {
  editTitle: string
  editDesc: string
  displayName: string
  avatarUrl: string
  saveProfile: string
  saving: string
  saveSuccess: string
  saveFailed: string
  feedbackTitle: string
  feedbackDesc: string
  feedbackCategory: string
  feedbackMessage: string
  feedbackPlaceholder: string
  submitFeedback: string
  submitting: string
  feedbackSuccess: string
  feedbackFailed: string
  recentFeedback: string
  noFeedback: string
  feedbackCategories: Record<string, string>
}

type Feedback = {
  id: string
  category: string
  status: string
  message: string
  created_at: string
}

export default function ProfileForms({
  labels,
  initialProfile,
  feedbacks,
}: {
  labels: Labels
  initialProfile: { display_name: string; avatar_url: string }
  feedbacks: Feedback[]
}) {
  const router = useRouter()
  const [profile, setProfile] = useState(initialProfile)
  const [feedback, setFeedback] = useState({ category: 'general', message: '' })
  const [profileStatus, setProfileStatus] = useState('')
  const [feedbackStatus, setFeedbackStatus] = useState('')
  const [saving, setSaving] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setProfileStatus('')
    setSaving(true)
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    })
    setSaving(false)
    if (!res.ok) {
      setProfileStatus(labels.saveFailed)
      return
    }
    setProfileStatus(labels.saveSuccess)
    router.refresh()
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFeedbackStatus('')
    setSubmitting(true)
    const res = await fetch('/api/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedback),
    })
    setSubmitting(false)
    if (!res.ok) {
      setFeedbackStatus(labels.feedbackFailed)
      return
    }
    setFeedback({ category: 'general', message: '' })
    setFeedbackStatus(labels.feedbackSuccess)
    router.refresh()
  }

  return (
    <div className="proportional-layout">
      <section className="data-panel rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white">{labels.editTitle}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{labels.editDesc}</p>
        </div>
        <form onSubmit={saveProfile} className="space-y-4">
          <Field label={labels.displayName}>
            <input className="field-input px-3 py-2.5 text-sm" value={profile.display_name} onChange={event => setProfile(value => ({ ...value, display_name: event.target.value }))} />
          </Field>
          <Field label={labels.avatarUrl}>
            <input className="field-input px-3 py-2.5 text-sm" value={profile.avatar_url} onChange={event => setProfile(value => ({ ...value, avatar_url: event.target.value }))} />
          </Field>
          {profileStatus ? <Notice text={profileStatus} failed={profileStatus === labels.saveFailed} /> : null}
          <button disabled={saving} className="primary-action rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {saving ? labels.saving : labels.saveProfile}
          </button>
        </form>
      </section>

      <section className="data-panel rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-white">{labels.feedbackTitle}</h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{labels.feedbackDesc}</p>
        </div>
        <form onSubmit={submitFeedback} className="space-y-4">
          <Field label={labels.feedbackCategory}>
            <select className="field-input px-3 py-2.5 text-sm" value={feedback.category} onChange={event => setFeedback(value => ({ ...value, category: event.target.value }))}>
              {Object.entries(labels.feedbackCategories).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
          </Field>
          <Field label={labels.feedbackMessage}>
            <textarea className="field-input min-h-28 px-3 py-2.5 text-sm" required value={feedback.message} placeholder={labels.feedbackPlaceholder} onChange={event => setFeedback(value => ({ ...value, message: event.target.value }))} />
          </Field>
          {feedbackStatus ? <Notice text={feedbackStatus} failed={feedbackStatus === labels.feedbackFailed} /> : null}
          <button disabled={submitting} className="primary-action rounded-lg px-4 py-2.5 text-sm font-semibold disabled:opacity-60">
            {submitting ? labels.submitting : labels.submitFeedback}
          </button>
        </form>

        <div className="panel-inner rounded-lg p-4">
          <div className="mb-3 text-xs uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>{labels.recentFeedback}</div>
          <div className="space-y-3">
            {feedbacks.length ? feedbacks.map(item => (
              <div key={item.id} className="border-b pb-3 last:border-b-0 last:pb-0" style={{ borderColor: 'var(--border)' }}>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {labels.feedbackCategories[item.category] ?? item.category} · {item.status} · {new Date(item.created_at).toLocaleString()}
                </div>
                <div className="mt-1 line-clamp-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{item.message}</div>
              </div>
            )) : <div className="text-sm" style={{ color: 'var(--text-muted)' }}>{labels.noFeedback}</div>}
          </div>
        </div>
      </section>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-secondary)' }}>{label}</span>
      {children}
    </label>
  )
}

function Notice({ text, failed }: { text: string; failed: boolean }) {
  return (
    <div className="notice-banner rounded-xl px-4 py-3 text-sm" style={{ borderColor: failed ? 'var(--status-failed-text)' : 'var(--status-success-text)' }}>
      {text}
    </div>
  )
}
