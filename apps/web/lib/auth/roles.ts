import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const userRoles = ['viewer', 'operator', 'admin'] as const
export type UserRole = typeof userRoles[number]

const roleRank: Record<UserRole, number> = {
  viewer: 1,
  operator: 2,
  admin: 3,
}

export function hasRole(current: UserRole, required: UserRole) {
  return roleRank[current] >= roleRank[required]
}

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && userRoles.includes(value as UserRole)
}

export async function getCurrentUser() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error) return null
  return data.user ?? null
}

export async function getCurrentRole(): Promise<UserRole | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const { data } = await createAdminClient()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  return isUserRole(data?.role) ? data.role : 'viewer'
}

export async function requireRole(required: UserRole) {
  const role = await getCurrentRole()
  if (!role) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: 'Authentication required.' }, { status: 401 }),
    }
  }
  if (!hasRole(role, required)) {
    return {
      ok: false as const,
      response: NextResponse.json({ error: `${required} role required.` }, { status: 403 }),
    }
  }
  return { ok: true as const, role }
}
