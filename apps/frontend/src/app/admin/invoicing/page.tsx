import { redirect } from 'next/navigation';

export default function AdminInvoicingRedirectPage() {
  redirect('/dashboard/invoicing');
}
