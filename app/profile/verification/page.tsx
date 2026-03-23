import { VerificationUploader } from "@/components/VerificationUploader";

export default function ProfileVerificationPage() {
  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8">
      <VerificationUploader />
    </div>
  );
}
