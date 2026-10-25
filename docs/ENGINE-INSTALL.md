# 정식 엔진 설치 및 검증

`/engine.html`은 실제 네이티브 엔진용 진입점이다. 무료 iframe 위에 지표를 덧씌우지 않는다. 엔진 파일이 없는 현재 배포는 설치 대기 상태이며, 실차트 검증이 아니다.

1. 승인된 공식 배포 파일을 배포 산출물의 `/charting_library/`에 설치한다. 공개 Git에는 라이브러리를 커밋하지 않는다. 현재 저장소에는 해당 파일과 취득 자동화가 없다.
2. 공급자가 확인한 종목 메타데이터로 배포 산출물 `/chart-engine.json`을 만든다. 구조는 아래와 같으며 대문자 자리표시자를 실제 값으로 바꾼다. pricescale/minmov는 숫자여야 한다. 임의로 추정하지 않는다.

```json
{"version":1,"markets":[{"symbol":"EXACT_APP_ID","dataSymbol":"EXACT_PROVIDER_ID","tvSymbol":"EXCHANGE:EXACT_PRODUCT","name":"상품 이름","type":"perpetual","pricescale":"PROVIDER_INTEGER","minmov":"PROVIDER_INTEGER"}]}
```

지원 type: crypto(현물), perpetual(무기한), stock(미국 주식 일봉). 같은 이름의 다른 거래소·현물·선물을 섞지 않는다. 기존 `/api/market`는 Binance 현물/선물 및 Yahoo 주식 일봉이다. 공급자를 바꾸려면 market-source/API도 해당 상품에 맞게 구현해야 한다. Binance451은 현재 해결되지 않았다. 인증값은 JSON이나 공개 Git에 넣지 않는다.

3. `/engine.html`에서 종목/시간봉을 선택한다. 생성자는 기존 `startApexChart`를 통해 로드하고 실제 공급원→세션→데이터피드→APEX 스터디를 연결한다. 입력/스타일 및 왼쪽 도구는 네이티브 엔진의 UI를 사용한다.
4. 실제 엔진에서 Inputs/Style, 구름대8선4채움, 확정 LONG/SHORT, 종목전환·축복구·5/10/15/30/1h/4h·터치 그리기를 검증한다. 현재 APEX는 부분 이식이다. 원본 전체 전략 동등성을 주장하지 않는다.
5. 네이티브 알람 등록·입력값 복사·그림 저장/복원은 추가 연결이 필요하다. 현재 워크스페이스의 기존 브라우저 알람/사용자 JSON 지표는 `/`에서 사용할 수 있으며 네이티브 페이지와 통합됐다고 표시하지 않는다. 서버 감시·푸시도 미구현이다.

빌드 결과에 `engine.html`과 관련 번들이 포함된다. 정식 엔진 미설치 상태의 안내 표시만 확인해도 실제 네이티브 차트 렌더링 검증을 대신할 수 없다.
