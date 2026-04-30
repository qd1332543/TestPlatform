import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import yaml from 'js-yaml'

type SuiteContract = {
  id?: string
  key?: string
  suite_key?: string
  name?: string
  type?: string
  command?: string
  requires?: string[]
}

type ContractDocument = {
  suites?: SuiteContract[]
}

export async function POST(req: NextRequest) {
  try {
    const { project_id, yml, suites: rawSuites } = await req.json() as {
      project_id?: string
      yml?: string
      suites?: SuiteContract[]
    }
    if (!project_id) return NextResponse.json({ error: 'missing project_id' }, { status: 400 })

    let suites = rawSuites
    if (!suites && yml) {
      const doc = yaml.load(yml) as ContractDocument | null
      suites = doc?.suites
    }
    if (!Array.isArray(suites) || suites.length === 0)
      return NextResponse.json({ error: 'no suites found' }, { status: 400 })

    const supabase = await createClient()
    const rows = suites.map((s) => {
      const suiteKey = s.key ?? s.id ?? s.suite_key
      if (!suiteKey || !s.name || !s.type || !s.command) {
        throw new Error('each suite must include key/id, name, type, and command')
      }
      return {
        project_id,
        suite_key: suiteKey,
        name: s.name,
        type: s.type,
        command: s.command,
        requires: s.requires ?? [],
      }
    })

    const { error } = await supabase.from('test_suites').upsert(rows, { onConflict: 'project_id,suite_key' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ imported: rows.length })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'failed to import suites'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
