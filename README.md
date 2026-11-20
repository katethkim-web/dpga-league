# D-PGA 스크린대회 경기현황

링크만 있으면 누구나 경기 결과(승·무·패)를 볼 수 있고, 입력 PIN을 아는 사람은 결과를 입력할 수 있는 웹페이지.

- `public/` 화면 (index.html, app.js)
- `api/state.js` 경기 목록 읽기 (누구나). 매일 한 번 Vercel Cron이 불러 Supabase 무료 프로젝트가 멈추지 않게 함
- `api/update.js` 결과 입력·경기 추가·삭제 (PIN 필요, 5번 틀리면 10분 잠금, 모든 변경은 `league_log`에 기록)
- DB: Supabase 표 `league_matches`, `league_log`, `league_pin_fail` (RLS 켬, 정책 없음 = 서버만 접근)

## Vercel 환경변수
| 이름 | 값 |
|---|---|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API Keys의 service_role (secret) 키. 브라우저에 보내지 않음 |
| `LEAGUE_PIN` | 결과 입력용 숫자 PIN (4~8자리) |
