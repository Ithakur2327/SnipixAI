"use client";
import { useParams, useRouter } from "next/navigation";
import DocumentChat from "@/components/chat/DocumentChat";

export default function DocumentPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  return <DocumentChat key={params.id} documentId={params.id} onClose={() => router.push("/library")} variant="page" />;
}
