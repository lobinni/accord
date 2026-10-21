import { AccordDetail } from "@/components/accord/accord-detail";

export const metadata = { title: "Accord — ACCORD" };

export default async function AccordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AccordDetail id={id} />;
}
