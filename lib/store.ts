// 임시 메모리 저장소 (Redis 연결 전)
// Vercel 서버리스 같은 인스턴스 내에서만 유지됨

export interface GatherCall {
  id: string;
  location: string;
  message: string;
  calledBy: string;
  calledAt: string;
  checkins: string[];
}

export interface BoardPost {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
}

// 전역 싱글톤 (같은 서버 인스턴스 내 공유)
const g = globalThis as typeof globalThis & {
  _gather: GatherCall | null;
  _board: BoardPost[];
};

if (g._gather === undefined) g._gather = null;
if (!g._board) g._board = [];

export const store = {
  getGather: () => g._gather,
  setGather: (call: GatherCall | null) => { g._gather = call; },
  getBoard: () => g._board,
  addPost: (post: BoardPost) => { g._board = [post, ...g._board].slice(0, 100); },
  removePost: (id: string) => { g._board = g._board.filter((p) => p.id !== id); },
  addCheckin: (name: string) => {
    if (!g._gather) return;
    if (!g._gather.checkins.includes(name)) {
      g._gather.checkins = [...g._gather.checkins, name];
    }
  },
};
