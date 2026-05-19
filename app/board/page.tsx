"use client";

import { useEffect, useState, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Plus, Trash2, X, MessageCircle, Heart, Send, ChevronDown } from "lucide-react";
import { isAdmin } from "@/lib/auth";
import Avatar from "@/components/Avatar";

interface TeamChatMessage {
  id: string;
  name: string;
  imageUrl: string | null;
  text: string;
  createdAt: string;
}

type BoardTab = "posts" | "chat";

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
  likes?: string[];
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
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [boardTab, setBoardTab] = useState<BoardTab>("posts");
  const [chatMessages, setChatMessages] = useState<TeamChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const email = user?.primaryEmailAddress?.emailAddress ?? "";
  const admin = isAdmin(email);
  const myName = user?.firstName ?? user?.username ?? email.split("@")[0];
  const myImage = user?.imageUrl ?? null;

  const getImage = (author: string, stored?: string | null) => {
    if (author === myName && myImage) return myImage;
    return profiles[author] ?? stored ?? null;
  };

  const load = async () => {
    try {
      const [boardRes, profileRes] = await Promise.all([fetch("/api/board"), fetch("/api/profiles")]);
      const data = await boardRes.json();
      const pData = await profileRes.json();
      setPosts(data.posts ?? []);
      setProfiles(pData.profiles ?? {});
    } catch { /* no-op */ }
    finally { setLoading(false); }
  };

  const loadChat = async () => {
    try {
      const res = await fetch("/api/team-chat");
      const data = await res.json();
      setChatMessages(data.messages ?? []);
    } catch { /* no-op */ }
  };

  const sendChat = async () => {
    if (!chatText.trim() || chatSending) return;
    setChatSending(true);
    const text = chatText.trim();
    setChatText("");
    try {
      await fetch("/api/team-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: myName, imageUrl: myImage, text }),
      });
      await loadChat();
    } finally { setChatSending(false); }
  };

  useEffect(() => {
    if (!isLoaded) return;
    load();
    loadChat();
    const chatInterval = setInterval(loadChat, 5000);
    return () => clearInterval(chatInterval);
  }, [isLoaded]);

  useEffect(() => {
    if (boardTab === "chat") chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, boardTab]);

  const submit = async () => {
    if (!title.trim() || saving) return;
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

  const toggleLike = async (postId: string) => {
    await fetch("/api/board", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: postId, name: myName }),
    });
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
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f9fa]">
      {/* 헤더 */}
      <div className="bg-white px-5 pt-14 pb-0 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-[22px] font-bold text-gray-900">
              {boardTab === "posts" ? "📋 게시판" : "💬 팀 채팅"}
            </h1>
            <p className="text-[13px] text-gray-400 mt-0.5">
              {boardTab === "posts" ? "팀원들과 자유롭게 소통해요" : "자유롭게 대화해요"}
            </p>
          </div>
          {boardTab === "posts" && (
            <button type="button" onClick={() => setShowForm(!showForm)}
              className="flex items-center gap-1.5 bg-blue-500 text-white rounded-2xl px-3.5 py-2 text-[13px] font-semibold">
              <Plus size={15} /> 글쓰기
            </button>
          )}
        </div>
        {/* 탭 */}
        <div className="flex gap-0">
          {([["posts", "📋 게시판"], ["chat", "💬 팀 채팅"]] as [BoardTab, string][]).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setBoardTab(key)}
              className={`flex-1 py-2.5 text-[14px] font-semibold border-b-2 transition-colors ${
                boardTab === key
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-400"
              }`}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 팀 채팅 탭 ── */}
      {boardTab === "chat" && (
        <div className="flex flex-col chat-panel-height">
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <p className="text-4xl mb-2">💬</p>
                <p className="text-[14px] text-gray-400">팀원들과 자유롭게 대화해보세요</p>
                <p className="text-[12px] text-gray-300 mt-1">첫 메시지를 남겨보세요</p>
              </div>
            )}
            {chatMessages.map((msg) => {
              const isMine = msg.name === myName;
              return (
                <div key={msg.id} className={`flex items-end gap-2 ${isMine ? "flex-row-reverse" : "flex-row"}`}>
                  {!isMine && <Avatar imageUrl={msg.imageUrl} name={msg.name} size={32} />}
                  <div className={`max-w-[75%] flex flex-col gap-0.5 ${isMine ? "items-end" : "items-start"}`}>
                    {!isMine && <p className="text-[11px] text-gray-400 px-1">{msg.name}</p>}
                    <div className={`px-3.5 py-2.5 rounded-2xl text-[14px] leading-relaxed ${
                      isMine ? "bg-blue-500 text-white rounded-br-sm" : "bg-white text-gray-800 rounded-bl-sm shadow-sm"
                    }`}>
                      {msg.text}
                    </div>
                    <p className="text-[10px] text-gray-300 px-1">{format(new Date(msg.createdAt), "HH:mm")}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
          {/* 입력창 */}
          <div className="border-t border-gray-100 bg-white flex items-center gap-2 px-4 py-3">
            <Avatar imageUrl={myImage} name={myName} size={32} />
            <input
              value={chatText}
              onChange={(e) => setChatText(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
              placeholder="메시지 입력..."
              className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button type="button" onClick={sendChat} disabled={chatSending || !chatText.trim()}
              aria-label="전송" title="전송"
              className="w-10 h-10 bg-blue-500 text-white rounded-2xl flex items-center justify-center flex-shrink-0 disabled:opacity-40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M2 21l21-9L2 3v7l15 2-15 2z"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* ── 게시판 탭 ── */}
      {boardTab === "posts" && <div className="px-4 py-4 space-y-3">
        {/* 작성 폼 */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Avatar imageUrl={myImage} name={myName} size={34} />
                <p className="text-[14px] font-semibold text-gray-800">{myName}</p>
              </div>
              <button type="button" onClick={() => setShowForm(false)} aria-label="닫기" title="닫기" className="text-gray-400">
                <X size={16} />
              </button>
            </div>
            <input type="text" placeholder="제목을 입력하세요 *" value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400" />
            <textarea placeholder="내용을 입력하세요 (선택)" value={content}
              onChange={(e) => setContent(e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none" />
            <div className="flex gap-2">
              <button type="button" onClick={submit} disabled={saving || !title.trim()}
                className="flex-1 bg-blue-500 text-white rounded-xl py-2.5 text-[14px] font-semibold disabled:opacity-50">
                {saving ? "등록 중..." : "등록"}
              </button>
              <button type="button" onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2.5 text-[14px]">취소</button>
            </div>
          </div>
        )}

        {posts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-10 text-center">
            <p className="text-4xl mb-2">📝</p>
            <p className="text-[14px] text-gray-400">아직 게시글이 없어요</p>
            <p className="text-[12px] text-gray-300 mt-1">첫 번째 글을 남겨보세요</p>
          </div>
        ) : (
          posts.map((post) => {
            const commentsOpen = openComments.has(post.id);
            const commentCount = post.comments?.length ?? 0;
            const likes = post.likes ?? [];
            const liked = likes.includes(myName);
            return (
              <div key={post.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* 포스트 헤더 */}
                <div className="flex items-start gap-3 px-4 pt-4 pb-3">
                  <Avatar imageUrl={getImage(post.author, post.authorImage)} name={post.author} size={38} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[14px] font-semibold text-gray-900">{post.author}</p>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p className="text-[12px] text-gray-400">
                          {format(new Date(post.createdAt), "M월 d일 HH:mm", { locale: ko })}
                        </p>
                        {(admin || post.author === myName) && (
                          <button type="button" onClick={() => removePost(post.id)} aria-label="삭제"
                            className="text-gray-200 hover:text-red-400">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    {/* 제목 + 내용 */}
                    <p className="text-[16px] font-bold text-gray-900 mt-1 leading-snug">{post.title}</p>
                    {post.content && (
                      <p className="text-[14px] text-gray-600 mt-1.5 leading-relaxed whitespace-pre-wrap">
                        {post.content}
                      </p>
                    )}
                  </div>
                </div>

                {/* 액션 바 */}
                <div className="flex items-center gap-4 px-4 py-2.5 border-t border-gray-50">
                  <button type="button" onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-[13px] font-semibold transition-colors ${liked ? "text-red-500" : "text-gray-400 hover:text-red-400"}`}>
                    <Heart size={16} className={liked ? "fill-red-500" : ""} />
                    {likes.length > 0 && <span>{likes.length}</span>}
                  </button>
                  <button type="button" onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-[13px] font-semibold text-gray-400 hover:text-blue-500 transition-colors">
                    <MessageCircle size={16} />
                    {commentCount > 0 && <span>{commentCount}</span>}
                    <span className="text-[12px] font-normal">댓글</span>
                    <ChevronDown size={13} className={`transition-transform ${commentsOpen ? "rotate-180" : ""}`} />
                  </button>
                </div>

                {/* 댓글 섹션 */}
                {commentsOpen && (
                  <div className="border-t border-gray-50 bg-gray-50/50 px-4 py-3 space-y-3">
                    {(post.comments ?? []).length === 0 && (
                      <p className="text-[12px] text-gray-400 text-center py-1">첫 댓글을 남겨보세요</p>
                    )}
                    {(post.comments ?? []).map((c) => (
                      <div key={c.id} className="flex items-start gap-2.5">
                        <Avatar imageUrl={getImage(c.author, c.authorImage)} name={c.author} size={28} />
                        <div className="flex-1 bg-white rounded-2xl px-3 py-2 shadow-sm">
                          <div className="flex items-center justify-between gap-2 mb-0.5">
                            <p className="text-[13px] font-semibold text-gray-800">{c.author}</p>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <p className="text-[11px] text-gray-400">{format(new Date(c.createdAt), "HH:mm")}</p>
                              {(admin || c.author === myName) && (
                                <button type="button" aria-label="댓글 삭제"
                                  onClick={() => removeComment(post.id, c.id)}
                                  className="text-gray-200 hover:text-red-400">
                                  <X size={12} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[13px] text-gray-700 leading-relaxed">{c.content}</p>
                        </div>
                      </div>
                    ))}
                    {/* 댓글 입력 */}
                    <div className="flex items-center gap-2 pt-1">
                      <Avatar imageUrl={myImage} name={myName} size={28} />
                      <div className="flex-1 flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3 py-2 shadow-sm">
                        <input type="text" placeholder="댓글 달기..."
                          value={commentInputs[post.id] ?? ""}
                          onChange={(e) => setCommentInputs((prev) => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") submitComment(post.id); }}
                          className="flex-1 text-[13px] focus:outline-none bg-transparent placeholder:text-gray-400"
                        />
                        <button type="button" onClick={() => submitComment(post.id)} aria-label="댓글 등록" title="댓글 등록"
                          className="text-blue-500 flex-shrink-0 disabled:opacity-30"
                          disabled={!commentInputs[post.id]?.trim()}>
                          <Send size={15} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>}
    </div>
  );
}
