import { redirect } from "next/navigation";

export default async function SessionSelectPage({ params }: { params: Promise<{ agent: string }> }) {
  const { agent } = await params;
  redirect(`/chat/${agent}/new`);
}