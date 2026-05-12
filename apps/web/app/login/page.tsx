import { getDictionary } from '@/lib/i18n'
import LoginForm from './LoginForm'

export default async function LoginPage() {
  const t = await getDictionary()

  return (
    <div className="page-shell min-h-[calc(100vh-3rem)] flex items-center justify-center">
      <section className="console-hero w-full max-w-xl rounded-2xl p-6">
        <div className="mb-6">
          <div className="kicker mb-3">{t.auth.kicker}</div>
          <h1 className="page-title">{t.auth.title}</h1>
          <p className="page-subtitle">{t.auth.description}</p>
        </div>
        <LoginForm labels={t.auth} />
      </section>
    </div>
  )
}
