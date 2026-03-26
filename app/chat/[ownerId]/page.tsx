import { OwnerChatPanel } from "@/components/OwnerChatPanel";
import { getPublicUserProfileById } from "@/lib/services/users";
import type { PublicUserProfile } from "@/types";

interface ChatPageProps {
  params: Promise<{ ownerId: string }>;
}

export default async function ChatPage({ params }: ChatPageProps) {
  const { ownerId } = await params;

  let owner: PublicUserProfile | null = null;

  try {
    owner = await getPublicUserProfileById(ownerId);
  } catch (error) {
    // swallow; the client chat panel will still render an input but messages may be demo
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-stone-950">Chat với chủ xe</h1>
        <p className="mt-2 text-sm text-stone-600">Trao đổi trực tiếp với chủ xe trước khi gửi yêu cầu đặt.</p>
      </div>

      <OwnerChatPanel ownerId={ownerId} ownerLabel={owner?.name ?? ownerId} />
    </div>
  );
}
