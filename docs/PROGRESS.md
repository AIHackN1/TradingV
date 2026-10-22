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

## 2026-10-23 KST: 지표 구성요소 추가와 Vercel 조회

- 사용자가 제공한 프로젝트/배포: https://vercel.com/ha-ck/tradings/8w3PTwaD6ikKZYs8YUwgXt3o5urD
- 이 연결의 `get_project(tradings)` 및 배포 조회가 팀 ID와 명시 slug ha-ck 양쪽 모두 404를 반환. 이는 관리 API 응답이며 앱 자체의 HTTP404와 구분해야 한다. 프로젝트 미존재·비밀번호 누락으로 단정하지 않는다.
- 연결된 계정 인증·HAck 팀 조회는 성공. 현재 플러그인 목록에는 새 tradings가 노출되지 않는다. 로컬 CLI용 VERCEL_TOKEN/OIDC 토큰/프로젝트 링크는 없음(값 출력 없이 존재 여부만 확인).
- 앱 src/api에는 필수 환경변수·API 키·패스워드 참조가 없다. 공개 시세 방식이므로 Vercel 관리 토큰을 앱에 추가하는 방식으로 해결하지 않는다.
- 원본 APEX_FINAL_v1.7_FourRangeCloud.pine 478행을 보관하고 다운로드 제공. Pine 자체 실행과 브라우저 계산 이식을 구분한다.
- ASGMA(원본 트리거 A), WhaleFlow 스윕(원본 트리거 B), ATR 스파이크 구성요소 계산과 확정봉 후보 마커·개별 표시 토글, 각각 상/하방 후보 알람 6종 추가.
- 최종 전략의 HTF 레짐·점수 게이트·쿨다운·포지션·분할청산은 미이식. 후보 마커를 원본 전략 주문 신호로 표시하지 않는다.
- 18개 테스트 통과. 추가 검증: Pine 평활 초기값, 편향 표준편차, 평탄 시장 무신호, 거래량·꼬리 동반 스윕, 미확정봉 알람 차단, 중복 방지, 미래 봉 추가 시 과거 계산 불변. Vite 빌드 성공(번들 약266KB/압축87KB).
- 과거 대화에서 ASGMA v19.2와 ATH_Ultimate_Functional_Replica_v1.pine 이름도 확인. 별도 ATH 파일은 공개 계산식 기반 재현판이라는 기록이며 비공개 원본 수식과 같다는 근거 없음. 현재 별도 원본 코드는 확보하지 못했으므로 새 수식을 임의로 그 이름으로 등록하지 않는다.
- Vercel 프로젝트 설정·빌드 로그·Production 환경변수 확인은 해당 프로젝트 접근이 해결된 뒤 이어갈 것. 플러그인 반복 실패 후 브라우저로 전환하려면 사용자 승인이 필요하다.


## 2026-10-23 KST: ATH 실물 조사 및 가격축 복구

- 사용자 스크린샷의 운영 주소 tradings-black.vercel.app 확인. 공개 `/api/market?symbol=SOXL&interval=1d&kind=klines` 실제 수신: 1,000봉, 마지막 종가84.90, 최근140봉 최고302. 데이터 고가가3200이라는 증거 없음.
- 기존 setCandles(initial)와 fitBtn은 시간축만 변경하여 수동 가격축 상태를 복구하지 않았음. initial 로드 및 초기화 버튼에서 오른쪽 가격축 autoScale=true, mode=0, invertScale=false를 복원하고 최근140봉을 표시하도록 수정. 실시간 갱신 때는 사용자가 탐색 중인 뷰를 강제로 초기화하지 않음.
- ATH를 실제 브라우저로 열어 캔들과 왼쪽 도구, 관심종목, ATH indicators 메뉴 확인. DOM의 standalone Charting Library 경로에 v32.2.0-1 표시 확인. 공개 main JS를 서버로 받으려 했으나 Cloudflare403 HTML이었고 실제 코드 전체를 받았다고 주장할 수 없음.
- 공식 문서 확인: 위젯 사용자 Pine 삽입 불가, Advanced Charts는 JavaScript custom_indicators_getter 지원, Pine 직접 실행 미지원. 현재 레포에는 Advanced Charts 배포 파일/사용권 증거 없음. ATH 파일을 복사해 재배포할 권한이 있다고 간주하지 않음.
- 기존 4시간 예약의 일정·활성 상태를 유지하고 단일 차트 통합 목표, 가격축 회귀검증, 실제주소/배포대상, 라이브러리 확보 차단조건으로 prompt 수정 완료.
- 계산/알람/그리기/stock adapter 테스트18개 통과, Vite build 성공. 단일 TradingView 통합은 미완료이며 다음 실행에서 기존 두 보기 구현을 완료 형태로 되풀이하지 말 것.
