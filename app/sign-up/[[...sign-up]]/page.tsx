"use client";
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="mb-6 text-center">
        <div className="text-4xl mb-2">🐷</div>
        <h1 className="text-xl font-bold text-gray-900">Work Manager</h1>
        <p className="text-sm text-gray-500 mt-1">생산품질팀</p>
      </div>
      <SignUp />
    </div>
  );
}
