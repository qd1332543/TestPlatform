import { createClient } from '@/lib/supabase/server'
import OpenAI from 'openai'
import { NextRequest, NextResponse } from 'next/server'


export async function POST(req: NextRequest) {
  const { message, history } = await req.json()
  if (!message?.trim()) return NextResponse.json({ error: 'empty message' }, { status: 400 })

  const supabase = await createClient()

  // 查询最近任务、报告、AI 分析作为上下文
  const { data: tasks } = await supabase
    .from('tasks')
    .select('id, status, environment, created_at, projects(name), test_suites(name), reports(summary, log_url), ai_analyses(failure_reason, suggestion, flaky_probability)')
    .order('created_at', { ascending: false })
    .limit(20)

  const context = JSON.stringify(tasks ?? [], null, 2)

  const systemPrompt = `You are a test platform assistant. Answer questions about test tasks, reports, and AI failure analyses.
Use the following recent task data to answer:
<data>
${context}
</data>
Reply in the same language as the user's message. Be concise.`

  const messages = [
    ...(history ?? []),
    { role: 'user' as const, content: message },
  ]

  const openai = new OpenAI({ apiKey: process.env.DEEPSEEK_API_KEY, baseURL: 'https://api.deepseek.com/v1' })
  const response = await openai.chat.completions.create({
    model: 'deepseek-chat',
    max_tokens: 1024,
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
  })

  const reply = response.choices[0].message.content ?? ''
  return NextResponse.json({ reply })
}
