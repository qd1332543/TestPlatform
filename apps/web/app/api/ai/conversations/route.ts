import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { messageToRow, normalizeAiMessage, rowToConversation, rowToMessage, type AiMessage } from '@/lib/account/aiHistory'

const conversationFields = 'id, title, created_at, updated_at'
const messageFields = 'id, role, content, suggestions, actions, created_at'

export async function GET() {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const { data: conversations, error } = await supabase
    .from('ai_conversations')
    .select(conversationFields)
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const ids = (conversations ?? []).map(row => row.id).filter(Boolean)
  if (!ids.length) return NextResponse.json({ conversations: [] })

  const { data: messages, error: messageError } = await supabase
    .from('ai_messages')
    .select(`conversation_id, ${messageFields}`)
    .in('conversation_id', ids)
    .order('created_at', { ascending: true })

  if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })
  const messagesByConversation = new Map<string, AiMessage[]>()
  ;(messages ?? []).forEach(row => {
    const conversationId = typeof row.conversation_id === 'string' ? row.conversation_id : ''
    if (!conversationId) return
    messagesByConversation.set(conversationId, [...(messagesByConversation.get(conversationId) ?? []), rowToMessage(row)])
  })

  return NextResponse.json({
    conversations: (conversations ?? []).map(row => rowToConversation(row, messagesByConversation.get(row.id) ?? [])),
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user
  if (!user) return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })

  const body = await req.json() as { title?: string; messages?: AiMessage[] }
  const title = String(body.title ?? '').trim() || 'New conversation'
  const { data: conversation, error } = await supabase
    .from('ai_conversations')
    .insert({ user_id: user.id, title })
    .select(conversationFields)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const messages = Array.isArray(body.messages) ? body.messages.map(normalizeAiMessage).filter(Boolean) as AiMessage[] : []
  if (messages.length) {
    const { error: messageError } = await supabase
      .from('ai_messages')
      .insert(messages.map(message => messageToRow(user.id, conversation.id, message)))
    if (messageError) return NextResponse.json({ error: messageError.message }, { status: 500 })
  }

  return NextResponse.json({ conversation: rowToConversation(conversation, messages) })
}
