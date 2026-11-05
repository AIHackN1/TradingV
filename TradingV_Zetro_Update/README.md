# Zetro System × N1 Terminal (TradingV Update)

`https://ath.zetro.io/` (Zetro System) 레이아웃과 `https://tradings-black.vercel.app/` (`AIHackN1/TradingV`)의 N1 엔진 기능을 통합한 업데이트 패키지입니다.

## 주요 업데이트 내역
1. **Zetro System 상단 헤더 및 멀티 차트 프리셋**: `Single chart`, `Bitcoin split`, `Altcoin split`, `Majors comp` 1·2·4분할 레이아웃 즉시 전환
2. **차트 컨트롤 바**: 종목 드롭다운(`BTC USDT perp` 등), 타임프레임(`1m`, `5m`, `10m`, `15m`, `1h`, `4h`, `D`, `W`), `ATH indicators` 설정, `Layout · Saved`, `Share chart`, `Split screen`
3. **N1 엔진 + Zetro ATH 지표 통합**: `APEX · Four Range Cloud`, `EMA 20/50 구름대`, `Zetro ATH/ATL 자동 고저점 수평선`, `Volume Profile (POC)` 동시 지원 및 `TradingView 위젯` 전환 토글
4. **우측 11개 아이콘 탭 & 사이드바**: `Watch`(Pinned/Favorites/Index), `Indicators`, `Screener`, `Book`(실시간 호가창), `Masters`(고래 롱/숏 비율), `Alerts`(N1 봉 마감 알람 & 사운드), `News`, `Positions`(선물 청산가 계산기), `Events`, `Objects`(드로잉 객체 관리), `Scripts`(수식 편집 & JSON 백업)
5. **하단 상태 바**: 실시간 코인 티커, `한국어로 보기 | English` 다국어 전환, `KST` 실시간 시계
6. **무제한 로컬 모드**: 로그인이나 7일 체험 제한 없이 `localStorage` 기반으로 영구 동작

## 배포 방법 (GitHub & Vercel)
`AIHackN1/TradingV` 저장소의 루트 `index.html`을 본 패키지의 파일로 교체 후 커밋·푸시하면 Vercel(`https://tradings-black.vercel.app/`)에 자동 반영됩니다.
