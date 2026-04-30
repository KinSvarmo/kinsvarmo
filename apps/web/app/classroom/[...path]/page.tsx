import { redirect } from "next/navigation";

export default async function ClassroomPathRedirectPage({ params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  redirect(`/workplace/${path.join("/")}`);
}
