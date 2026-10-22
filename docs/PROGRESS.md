# 진행 기록

## 2026-10-22 KST

- 원본 앱: 이전 Aihackerton 저장소에 있던 N1 Terminal. 사용자 지정 목적지는 비공개 AIHackN1/TradingV(main).
- TradingV 초기 HEAD: 2f55f77b7274f7fcae95c8d166e9de2c0a7c7be7. README 외 내용 없음 확인.
- SOXL 선택 시 TradingView 공식 `AMEX:SOXL` 위젯을 연다. `hide_side_toolbar: false`, 상단 옵션·지표·봉 유형·날짜 범위 활성화.
- 브라우저에서 SOXL 실제 캔들, `BATS_DLY:SOXL` 지연 데이터 표시, 추세선/피보나치/패턴/포지션/브러시/텍스트/측정 도구 모음 확인.
- 자체 차트용 DrawingLayer와 시간·가격 좌표 변환을 구현했다. 도형은 종목·시간봉별 localStorage 및 백업 JSON에 포함된다.
- Yahoo 일봉 어댑터와 Vercel API 경로 구현. 현재 조사 환경에서 Yahoo는 `Edge: Too Many Requests`를 반환해 실데이터 수신 미검증. Stooq도 자바스크립트 검증 페이지로 차단되어 사용하지 않는다. 제한을 우회하지 않는다.
- SOXL 자체 API 연결 실패 시 오류와 TradingView/CSV 경로를 제공한다. 시세를 만들거나 샘플로 자동 전환하지 않는다.
- 테스트 13개 통과: 기존 엔진 8개 + 좌표 보간/미래 좌표, 히트 테스트, 도형 검증, CSV 유효성, SOXL 응답 변환·정규장 종료 시각.
- Vite 빌드 성공, 번들 약250KB(압축81KB).
- Vercel 팀 HAck: team_lTTnZDDzVoLexwRtVtWAtFBW. 목록에는 sunny-sai와 n1-heat-safety-map만 확인. TradingV 연결 프로젝트는 현재 조회되지 않음. 관련 없는 프로젝트는 수정 금지.
- 기존 개인용 게시 Site: appgprj_6ada1d4d2fc48191a82d9122f9326cb5 / https://n1-chart-terminal.wnssuql.chatgpt.site. 비공개 유지. 이 게시 환경은 정적이므로 Vercel API 함수는 실행하지 않으며 SOXL은 공식 위젯 또는 CSV를 이용한다.
- 4시간 간격 개발 예약 활성화. 첫 실행 2026-10-23 03:41 KST 예정. 기존 이력·체크리스트를 확인하고 실제 남은 작업을 이어갈 것.

## 다음 우선순위

1. Vercel 임포트 프로젝트가 실제로 생성되면 이름과 ID·Git 연결·운영 URL을 확인하고 최신 main을 배포, API/시세를 검증.
2. 자체 SOXL 데이터 제공자 접근 검증 및 안정적인 데이터 경로 확보. 검증 전 자동 실시간 SOXL 알람 지원으로 표시하지 않을 것.
3. APEX 추가 계산식의 수치/신호 정합성 테스트와 그리기 터치 UX 검증.

## 추가 확인

- 자체 수평선 생성 → undo → redo → 페이지 새로고침 후 1개 복원까지 브라우저 검증 통과.
- TradingV에 전체 소스 25개 파일 반영 완료(99f406a5509ccfe29b37502caf71cfe9c2e89ece).
- 2026-10-22 재시도에서도 Vercel `POST /v11/projects`는 `403 forbidden: You don't have permission to create the project` 반환. HAck의 다른 프로젝트를 재사용하거나 덮어쓰지 않음. CLI도 앞선 시도에서 로그인 정보 없음 확인.
- 사용자가 Vercel 임포트를 완료하면 실제 생성된 프로젝트 ID와 URL을 기준으로 최신 TradingV main 배포를 이어갈 것. 추측한 URL을 운영 주소로 보고하지 말 것.
