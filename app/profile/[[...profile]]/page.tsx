"use client";

import { UserProfile } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  return (
    <div className="pb-4">
      <div className="flex items-center gap-2 px-4 pt-5 pb-3">
        <button type="button" onClick={() => router.back()} aria-label="뒤로가기"
          className="text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-900">프로필 설정</h1>
      </div>
      <div className="flex justify-center">
        <UserProfile routing="hash" />
      </div>
    </div>
  );
}
