import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import yaml from 'js-yaml'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { project_id, yml } = await req.json()
  if (!project_id || !yml) return NextResponse.json({ error: '参数缺失' }, { status: 400 })

  let contract: any
  try {
    contract = yaml.load(yml)
  } catch {
    return NextResponse.json({ error: 'YAML 解析失败' }, { status: 400 })
  }

  const suites = contract?.suites
  if (!Array.isArray(suites) || !suites.length)
    return NextResponse.json({ error: '未找到 suites 字段' }, { status: 400 })

  const rows = suites.map((s: any) => ({
    project_id,
    suite_key: s.id ?? s.key ?? s.suite_key,
    name: s.name ?? s.id ?? s.key,
    type: s.type ?? 'api',
    command: s.command ?? '',
  }))

  const { error } = await supabase.from('test_suites').upsert(rows, {
    onConflict: 'project_id,suite_key',
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ imported: rows.length })
}
