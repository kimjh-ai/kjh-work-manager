"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { Plus, Trash2, X } from "lucide-react";
import { isAdmin } from "@/lib/auth";

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

export default function BoardPage() {
  const { user, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];

  const load = async () => {
    try {
      const res = await fetch("/api/board");
      const data = await res.json();
      setPosts(data.posts ?? []);
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  useEffect(() => { if (isLoaded) load(); }, [isLoaded]);

  const submit = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/board", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), author: myName }),
      });
      setTitle(""); setContent(""); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const remove = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/board?id=${id}`, { method: "DELETE" });
    await load();
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">📋 게시판</h1>
        <button type="button" onClick={() => setShowForm(true)}
          className="flex items-center gap-1 bg-blue-600 text-white rounded-xl px-3 py-2 text-sm font-medium">
          <Plus size={15} /> 글쓰기
        </button>
      </div>

      {showForm && (
        <div className="card mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700">새 글</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-400">
              <X size={16} />
            </button>
          </div>
          <input type="text" placeholder="제목 *" value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <textarea placeholder="내용 (선택)" value={content}
            onChange={(e) => setContent(e.target.value)} rows={3}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          <div className="flex gap-2">
            <button type="button" onClick={submit} disabled={saving || !title.trim()}
              className="flex-1 bg-blue-600 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-50">
              {saving ? "저장 중..." : "등록"}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="flex-1 bg-gray-100 text-gray-700 rounded-xl py-2 text-sm font-medium">
              취소
            </button>
          </div>
        </div>
      )}

      {posts.length === 0 ? (
        <div className="card text-center py-12 text-gray-400">
          <p className="text-sm">게시글이 없습니다</p>
        </div>
      ) : (
        <div className="space-y-2">
          {posts.map((post) => (
            <div key={post.id} className="card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{post.title}</p>
                  {post.content && (
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{post.content}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-2">
                    {post.author} · {format(new Date(post.createdAt), "MM/dd HH:mm")}
                  </p>
                </div>
                {(admin || post.author === myName) && (
                  <button type="button" onClick={() => remove(post.id)}
                    className="text-gray-300 hover:text-red-400 flex-shrink-0">
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
