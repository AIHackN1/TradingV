# 지표 조사와 독립 구현 범위 (2026-10-23)

ATH 실제 앱의 `ATH indicators` 창을 열어 조사했다. Boost ranking 상위에는 Atropos, Cluster, Hexagon, Diamond, Cloud Bands가 표시됐으며 Popular this week는 Atropos / Trade bubbles·levels / Arachne / Alt Hexagon / Open interest였다. 일반 지표 목록에는 Volume profile, CVD, Delta, Open interest, Funding rate 등이 있었다. 이는 앱의 자체 표시이지 수익 성과 검증 순위가 아니다.

추천 지표 스위치는 `Log in to unlock / Free for 7 days` 잠금 상태였다. 원본 계산식이나 구현 코드를 확보하지 못했으므로 복제했다고 표시하지 않는다. 실체결·호가·선물 OI/펀딩 데이터가 없는 현물 OHLCV만으로 이를 동일 재현할 수 있다고 하지 않는다. 원본 또는 사용권이 있는 자료가 제공되면 별도 대조할 수 있다.

현재 추가한 다섯 지표는 분석 용도가 겹치지 않도록 공개된 계산식을 독립적으로 구현한 모음이다. `src/studies.js`를 차트와 알람이 함께 사용한다.

|지표|구현|근거·차이|
|---|---|---|
|볼린저|SMA20, 편향 표준편차20×2|https://www.tradingview.com/support/solutions/43000501840-bollinger-bands-bb/|
|돈치안 돌파|현재 봉 제외 이전20봉 최고·최저|https://www.tradingview.com/support/solutions/43000502253-donchian-channels-dc/ 일반 표시와 1봉 시프트를 구분|
|슈퍼트렌드|RMA ATR10×3, 최종 밴드 carry 및 방향 전환|https://www.tradingview.com/support/solutions/43000634738-supertrend/|
|세션 VWAP|UTC 날짜 리셋, HLC3 거래량 가중 누적|https://www.tradingview.com/support/solutions/43000502018-volume-weighted-average-price-vwap/ 암호화폐 분봉만, 초기 수신일 일부이력은 불완전|
|프로파일 근사|최근200봉 24구간, 봉 고저범위에 거래량 균등분배|https://www.tradingview.com/support/solutions/43000502040-volume-profile-indicators-basic-concepts/ 정식 하위봉/체결 프로파일과 다름|

과거 APEX 4색 구름대/ASGMA/스윕/ATR스파이크 구성요소는 그대로 유지한다. 이번 다섯 지표를 ATH 지표명으로 등록하거나 검증되지 않은 수익률을 표기하지 않는다.
