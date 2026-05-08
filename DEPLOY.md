# Work Manager 배포 가이드

## 무료 배포 (Vercel - 권장)

1. https://github.com 가입 (없으면)
2. 이 폴더를 GitHub에 업로드:
   ```
   git init
   git add .
   git commit -m "init"
   # GitHub에서 새 repo 만들고 push
   ```
3. https://vercel.com 접속 → GitHub 계정 연동
4. "New Project" → 이 repo 선택 → Deploy
5. 완료! 예: https://work-manager-xxx.vercel.app

## 아이폰 홈 화면에 앱으로 추가

1. 아이폰 Safari에서 위 URL 접속
2. 하단 공유 버튼(□↑) 탭
3. "홈 화면에 추가" 선택
4. "추가" 탭 → 앱 아이콘으로 설치 완료!

## PC에서 앱으로 설치

Chrome 브라우저에서 URL 접속 →
주소창 오른쪽 끝 ⊕ 아이콘 클릭 → "설치"

## 로컬 실행 (개발용)

```
npm run dev
```
→ http://localhost:3000

## 데이터 동기화

현재: 기기 내 로컬 저장 (localStorage)
동기화 원하시면 Firebase 연동 필요 (별도 요청)
