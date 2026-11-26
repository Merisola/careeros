import { redirect } from "next/navigation";

export default function JobPage({ params }: { params: { id: string } }) {
  redirect(`/?job=${encodeURIComponent(params.id)}`);
}
