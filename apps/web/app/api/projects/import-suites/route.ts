import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import yaml from 'js-yaml'

export async function POST(req: NextRequest) {
  const { project_id, yml, suites: rawSuites } = await req.json()
  if (!project_id) return NextResponse.json({ error: 'missing project_id' }, { status: 400 })

  let suites = rawSuites
  if (!suites && yml) {
    const doc = yaml.load(yml) as any
    suites = doc?.suites
  }
  if (!Array.isArray(suites) || suites.length === 0)
    return NextResponse.json({ error: 'no suites found' }, { status: 400 })

  const supabase = await createClient()
  const rows = suites.map((s: any) => ({
    project_id,
    suite_key: s.key,
    name: s.name,
    type: s.type,
    command: s.command,
    requires: s.requires ?? [],
  }))

  const { error } = await supabase.from('test_suites').upsert(rows, { onConflict: 'project_id,suite_key' })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ imported: rows.length })
}
