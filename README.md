# TradingV · N1 Terminal

개인 차트 · SOXL TradingView 공식 차트 · 그리기 · APEX EMA 구름대 · 확정봉 알람 워크스페이스.

기준 저장소: https://github.com/AIHackN1/TradingV

진행 기준과 다음 작업: [ROADMAP](docs/ROADMAP.md), [진행 기록](docs/PROGRESS.md).

## 실행

```sh
npm ci
npm run dev
```

프로덕션 빌드: `npm run build`, 계산 엔진 검증: `npm test`.
Node.js 22 이상 권장. Vercel에서는 GitHub 저장소를 Import하고 Framework를 Vite로 선택하면 됩니다. `vercel.json`에 빌드 및 출력 경로가 포함되어 있습니다. 시세 데이터는 공개 API를 사용하므로 API 키가 필요하지 않습니다.

## SOXL과 그리기

- **TradingView 보기**: SOXL(AMEX:SOXL) 공식 차트, 내장 왼쪽 그리기 도구/지표/봉 유형/날짜 범위. 위젯의 지연 데이터 표시를 따른다. 이 외부 위젯과 앱 자체 지표·알람은 별도이다.
- **내 지표·그리기**: 왼쪽 추세선/레이/수평선/수직선/사각형/피보나치/자유곡선/텍스트/가격·시간 측정/지우개. 시작점과 끝점을 차례로 클릭. 선택 후 드래그 이동 또는 기준점 수정. Delete 삭제, Ctrl+Z 되돌리기, Ctrl+Shift+Z 다시 실행.
- 자체 그림은 종목/시간봉별 시간·가격 좌표로 자동 저장. 앱 전체 백업에 포함된다. TradingView 위젯 그림은 이 백업과 별도이며 제공자의 저장 지원 범위에 따른다.
- SOXL 자체 분석용 Yahoo Finance 정규장 일봉 API 어댑터를 포함하지만 공급자의 레이트리밋/가용성에 의존한다. 구현과 실제 운영 시세 수신 성공을 구분한다. 지연 또는 일봉 데이터를 실시간으로 표시하지 않는다.
- CSV 가져오기(time/date, open, high, low, close, volume)로 자체 SOXL 지표·그리기를 사용할 수 있다. 고정 CSV는 실시간 알람의 입력으로 쓰지 않는다.

## 구현한 기능

- TradingView Lightweight Charts 5.2.1 캔들, 줌·이동, 거래량, RSI(14).
- Binance Spot USDT 8종(BTC, ETH, SOL, XRP, BNB, DOGE, AVAX, LINK) 및 별도 SOXL 공식 차트, 1m/5m/15m/1h/4h/1d.
- 초기 1,000봉 REST 조회, WebSocket 업데이트, 15초 REST 갱신.
- APEX FINAL v1.7 원본의 **현재 차트 4색 EMA 구름대만** 이식: 144/155, 89/100, 55/65, 34/40.
- 지표 기간·색상 변경, 안전한 JSON 설정 가져오기·내보내기.
- 가격 상/하향 돌파, EMA 골든/데드크로스, RSI 상/하향 돌파 알람.
- 확정봉 종가 기준 판정, 여러 종목·시간봉 감시, 반복/1회 알람, 기록·CSV 내보내기.
- 브라우저 알림(권한 필요), 소리, 로컬 저장·백업.
- 시세 실패 화면 및 **사용자가 명시적으로 선택하는** 샘플 모드. 샘플에서는 알람 감시 중지.

## 현재 범위와 제한

1. TradingView 웹사이트 전체 소스를 복제한 앱이 아닙니다. 공개 오픈소스 차트 엔진을 사용한 독립 앱입니다.
2. Pine Script를 직접 실행하지 않습니다. APEX 전략의 ASGMA, 스윕, 상위 시간봉 레짐, 진입·분할청산·포지션·주문 로직은 미포함입니다. EMA 교차 알람은 APEX 전략 진입 신호와 다릅니다.
3. 과거 Pine 예시가 무기한 선물(BTCUSDT.P/ETHUSDT.P)인 반면 이 앱은 **현물(Spot)** 시세입니다. 동일 상품·데이터 길이·초기화로 맞추기 전 수치 일치를 주장할 수 없습니다.
4. 알람은 페이지가 열려 있고 기기가 깨어 있을 때만 감시합니다. 탭 백그라운드 제한/절전/종료에서는 실행이 보장되지 않습니다. 24시간 서버 알람은 아직 없습니다.
5. 신규/재시작 알람은 처음 받은 마지막 확정봉을 기준으로 시작합니다. 과거 신호를 재생하지 않습니다. 연결 중단에서 돌아오면 조회 가능한 1,000봉 범위 안에서 누락 확정봉을 순서대로 확인합니다.
6. 설정은 동일 브라우저·동일 도메인의 localStorage에 저장됩니다. 계정·클라우드 동기화는 없습니다. 백업에서 가져온 알람은 중지 상태로 복원됩니다.
7. 실거래 주문·거래소 계정 연동·자동매매는 없습니다.
8. 거래소 또는 지역 제한으로 시세 연결이 실패할 수 있습니다. 서버 프록시도 외부 제공자의 가용성에 의존합니다.
9. `https://ath.zetro.io/`는 조사 당시 403으로 내용 확인 불가. 해당 사이트와 시각적/기능적 동일성을 검증하지 않았습니다.

## REA 조사

공식 `morluto/rea` 저장소와 `rea-agents@6.7.0`을 확인하고 Lightweight Charts 패키지에 정적 분석을 실행했습니다. 이 환경의 procps `ps`가 `fatal library error, lookup self`로 실패하여 REA가 자식 프로세스 소유권 검증 단계에서 `capability_unavailable`을 반환했습니다. 인벤토리 일부만 확보했으며 역공학 분석 성공으로 간주하지 않습니다. 보호 장치를 우회하지 않았습니다. 자세한 기록: [docs/rea-investigation.md](docs/rea-investigation.md).

## 개발 구조

- `src/engine.js`: 지표 계산·규칙 검증·확정봉 이벤트 판정(순수 함수).
- `src/cloud.js`: 차트 렌더링 주기에 맞춘 두 EMA 사이의 구름 채움.
- `src/drawings.js`, `src/drawing-geometry.js`: 자체 그리기·좌표·저장/편집.
- `src/stock-data.js`: SOXL 별도 공급자 응답 및 CSV 변환.
- `public/tradingview.html`: 공식 TradingView 위젯.
- `src/main.js`: UI, 시세 연결, 알람 모니터, JSON/CSV 입출력.
- `api/market.js`: Vercel 공개 시세 프록시. 허용한 종목·시간봉·요청 종류만 조회.
- `tests/engine.test.js`: 계산·확정봉·교차·재연결·중복 및 입력 검증.

## 라이선스/표기

차트 엔진: [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts), Apache-2.0. 차트 내 TradingView attribution과 홈페이지 링크를 유지합니다. 아이콘: Lucide, ISC. 라이브러리 고지: `public/licenses/`.

REA(MIT)는 조사 도구이며 런타임 의존성이나 TradingView 서버 복제 도구가 아닙니다. 참고 사이트의 비공개 코드나 유료 기능을 가져오지 않았습니다.
