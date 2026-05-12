import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { messageToRow, normalizeAiMessage, rowToMessage, type AiMessage } from '@/lib/account/aiHistory'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { id } = await params
  const body = await req.json() as { message?: AiMessage; messages?: AiMessage[]; title?: string }
  const messages = (Array.isArray(body.messages) ? body.messages : body.message ? [body.message] : [])
    .map(normalizeAiMessage)
    .filter(Boolean) as AiMessage[]
  if (!messages.length) return NextResponse.json({ error: 'Message is required.' }, { status: 400 })

  const { data: conversation, error: conversationError } = await supabase
    .from('ai_conversations')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (conversationError) return NextResponse.json({ error: conversationError.message }, { status: 500 })
  if (!conversation) return NextResponse.json({ error: 'Conversation not found.' }, { status: 404 })

  const { data, error } = await supabase
    .from('ai_messages')
    .insert(messages.map(message => messageToRow(user.id, id, message)))
    .select('id, role, content, suggestions, actions, created_at')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const title = String(body.title ?? '').trim()
  await supabase
    .from('ai_conversations')
    .update({ updated_at: new Date().toISOString(), ...(title ? { title } : {}) })
    .eq('id', id)
    .eq('user_id', user.id)

  return NextResponse.json({ messages: (data ?? []).map(rowToMessage) })
}
