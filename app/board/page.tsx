"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { Plus, Trash2, X, MessageCircle, Send } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";

interface Comment {
  id: string;
  content: string;
  author: string;
  authorImage?: string | null;
  createdAt: string;
}

interface Post {
  id: string;
  title: string;
  content: string;
  author: string;
  authorImage?: string | null;
  createdAt: string;
  comments?: Comment[];
}

export default function BoardPage() {
  const { user, isLoaded } = useUser();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [openComments, setOpenComments] = useState<Set<string>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];
  const myImage = user?.imageUrl ?? null;
  const [profiles, setProfiles] = useState<Record<string, string>>({});

  const getImage = (author: string, stored?: string | null) => {
    if (author === myName && myImage) return myImage;
    return profiles[author] ?? stored ?? null;
  };

  const load = async () => {
    try {
      const [boardRes, profileRes] = await Promise.all([
        fetch("/api/board"),
        fetch("/api/profiles"),
      ]);
      const data = await boardRes.json();
      const pData = await profileRes.json();
      setPosts(data.posts ?? []);
      setProfiles(pData.profiles ?? {});
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
        body: JSON.stringify({ title: title.trim(), content: content.trim(), author: myName, authorImage: myImage }),
      });
      setTitle(""); setContent(""); setShowForm(false);
      await load();
    } finally { setSaving(false); }
  };

  const removePost = async (id: string) => {
    if (!confirm("삭제할까요?")) return;
    await fetch(`/api/board?id=${id}`, { method: "DELETE" });
    await load();
  };

  const toggleComments = (postId: string) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const submitComment = async (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    await fetch("/api/board/comment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postId, content: text, author: myName, authorImage: myImage }),
    });
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
    await load();
  };

  const removeComment = async (postId: string, commentId: string) => {
    await fetch(`/api/board/comment?postId=${postId}&commentId=${commentId}`, { method: "DELETE" });
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
            <div className="flex items-center gap-2">
              <Avatar imageUrl={myImage} name={myName} size={28} />
              <h2 className="text-sm font-semibold text-gray-700">새 글</h2>
            </div>
            <button type="button" onClick={() => setShowForm(false)} aria-label="닫기" className="text-gray-400">
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
        <div className="space-y-3">
          {posts.map((post) => {
            const commentsOpen = openComments.has(post.id);
            const commentCount = post.comments?.length ?? 0;
            return (
              <div key={post.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <Avatar imageUrl={getImage(post.author, post.authorImage)} name={post.author} size={34} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-semibold text-gray-700">{post.author}</span>
                        <span className="text-xs text-gray-400">· {format(new Date(post.createdAt), "MM/dd HH:mm")}</span>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{post.title}</p>
                      {post.content && (
                        <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{post.content}</p>
                      )}
                    </div>
                  </div>
                  {(admin || post.author === myName) && (
                    <button type="button" onClick={() => removePost(post.id)} aria-label="글 삭제"
                      className="text-gray-300 hover:text-red-400 flex-shrink-0">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <button type="button" onClick={() => toggleComments(post.id)}
                  className="flex items-center gap-1 mt-3 text-xs text-gray-400 hover:text-blue-500 transition-colors">
                  <MessageCircle size={13} />
                  댓글 {commentCount > 0 ? commentCount : ""}
                  <span className="text-gray-300">{commentsOpen ? "▲" : "▼"}</span>
                </button>

                {commentsOpen && (
                  <div className="mt-2 pt-2 border-t border-gray-100 space-y-2">
                    {(post.comments ?? []).map((c) => (
                      <div key={c.id} className="flex items-start gap-2">
                        <Avatar imageUrl={getImage(c.author, c.authorImage)} name={c.author} size={26} />
                        <div className="flex-1 bg-gray-50 rounded-xl px-3 py-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-gray-700">{c.author}</span>
                            <span className="text-xs text-gray-400">{format(new Date(c.createdAt), "HH:mm")}</span>
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5">{c.content}</p>
                        </div>
                        {(admin || c.author === myName) && (
                          <button type="button" aria-label="댓글 삭제"
                            onClick={() => removeComment(post.id, c.id)}
                            className="text-gray-300 hover:text-red-400 mt-2 flex-shrink-0">
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    ))}

                    <div className="flex gap-2 mt-1 items-center">
                      <Avatar imageUrl={myImage} name={myName} size={26} />
                      <input
                        type="text"
                        placeholder="댓글 입력..."
                        value={commentInputs[post.id] ?? ""}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                        onKeyDown={(e) => { if (e.key === "Enter") submitComment(post.id); }}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                      <button type="button" onClick={() => submitComment(post.id)} aria-label="댓글 등록"
                        className="bg-blue-500 text-white rounded-xl px-3 py-1.5 flex-shrink-0">
                        <Send size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
