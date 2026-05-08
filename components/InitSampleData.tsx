"use client";

import { useEffect } from "react";
import { getTodos, saveTodos, generateId } from "@/lib/storage";
import { Todo } from "@/lib/types";
import { format, addDays } from "date-fns";

const today = format(new Date(), "yyyy-MM-dd");
const tomorrow = format(addDays(new Date(), 1), "yyyy-MM-dd");
const nextWeek = format(addDays(new Date(), 5), "yyyy-MM-dd");

const SAMPLE_TODOS: Omit<Todo, "id" | "createdAt" | "updatedAt">[] = [
  { title: "1분기 불량클레임 현황 정리", detail: "브랜드별 집계 후 팀장 보고", category: "quality", priority: "high", dueDate: today, completed: false },
  { title: "믿음 마감 확인", detail: "납기일 및 물량 체크", category: "deadline", priority: "high", dueDate: today, completed: false },
  { title: "KC 기안 작성", detail: "결재 올리기", category: "document", priority: "medium", dueDate: tomorrow, completed: false },
  { title: "4월 개인경비 정산", category: "expense", priority: "medium", dueDate: tomorrow, completed: false },
  { title: "매뉴얼 내용 추가", detail: "신규 공정 추가 내용 업데이트", category: "document", priority: "low", dueDate: nextWeek, completed: false },
  { title: "부자재 단가 확인 및 업로드", detail: "케어라벨, 테리 포인트 단가", category: "material", priority: "medium", dueDate: nextWeek, completed: false },
  { title: "케어라벨 스티커 회수 확인", detail: "테리 포인트 셋업 그린 컬러 진행 여부 포함", category: "material", priority: "high", dueDate: tomorrow, completed: false },
  { title: "전년비 우비 최종 업데이트", detail: "비교 데이터 최종 반영", category: "general", priority: "medium", dueDate: nextWeek, completed: false },
  { title: "회의록 작성", detail: "주간 회의 내용 정리", category: "meeting", priority: "low", dueDate: today, completed: false },
];

export default function InitSampleData() {
  useEffect(() => {
    // 딱 한 번만 실행: 초기화 마커가 없을 때만 샘플 데이터 삽입
    if (localStorage.getItem("initialized")) return;
    if (getTodos().length > 0) {
      localStorage.setItem("initialized", "1");
      return;
    }
    const now = new Date().toISOString();
    const todos: Todo[] = SAMPLE_TODOS.map((t) => ({
      ...t,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }));
    saveTodos(todos);
    localStorage.setItem("initialized", "1");
    // reload 없이 storage 이벤트로 다른 컴포넌트에 알림
    window.dispatchEvent(new Event("todosUpdated"));
  }, []);

  return null;
}
