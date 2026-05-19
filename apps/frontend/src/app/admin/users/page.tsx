import { redirect } from 'next/navigation'

export default function AdminUsersRedirectPage() {
  redirect('/admin/users-roles?tab=users')
}
