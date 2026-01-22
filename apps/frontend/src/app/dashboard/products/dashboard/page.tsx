import { redirect } from 'next/navigation';

export default async function Page(props: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const searchParams = await props.searchParams;
  const qs = new URLSearchParams();
  Object.entries(searchParams || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach(v => qs.append(key, String(v)));
    } else if (value !== undefined) {
      qs.append(key, String(value));
    }
  });
  const suffix = qs.toString() ? `?${qs.toString()}` : '';
  redirect(`/dashboard/products${suffix}`);
}