# Advanced Charts APEX 이식 코드 — 비활성 개발 단계

2026-10-23. 운영 UI에 연결하지 않았고, 정식 Charting Library 렌더링을 검증하지 않았다. 빌드 성공은 네이티브 지표 동작 검증이 아니다. 무료 iframe에는 이 코드를 적용할 수 없다.

## 구현한 연결 코드

- `src/advanced/apex-study.js`: `custom_indicators_getter`에 등록할 CustomIndicator 객체. 네이티브 Inputs에 EMA 기간8개, 현재/직전 확정1h/4h 구름 계산 시간축, 점수/CI/ATR/대기봉 입력. Style에 8선·4채움·점수필터 LONG/SHORT 형태를 선언한다.
- `src/advanced/apex-session.js`: 거래소 포함 종목명/시간봉별 불변 시세 스냅샷. 같은 스냅샷을 지표와 기존 `evaluateRule`에 전달한다. 현물/선물 별칭 혼용 금지, 공급자 관측 시각 이후 봉은 마커/알람에서 제외, 오래된 응답 거부.
- `src/advanced/mount-chart.js`: 공식 라이브러리 생성자·데이터피드를 인자로 받아 한 차트를 생성하고 APEX 등록. 라이브러리 없으면 오류. iframe으로 대체하지 않는다.

원본 구름 기간144/155,89/100,55/65,34/40 및 색상/투명도 기본값을 반영했다. HTF 구름은 현재 봉 시작 전에 확정된 HTF 봉만 사용한다. 시그널은 기존 `calculateApexSignals`의 **부분 이식**을 재사용한다. 원본 포지션·분할청산·브레이커·체결 조건을 새로 구현하거나 원본 성능 동등성을 검증한 것은 아니다. HTF 이력이 없으면 해당 구름/필터 시그널을 만들지 않는다.

## 호스트 연결 계약

공식 라이브러리 사용 승인을 받고 허용된 공급자 데이터피드를 준비한 뒤에만 운영 엔트리에 연결한다. 다음은 연결 예시이며 현재 실행되는 엔트리가 아니다.

```js
import {createApexSession} from '../src/advanced/apex-session.js';
import {mountApexChart} from '../src/advanced/mount-chart.js';
const session = createApexSession();
// Host datafeed must publish the SAME retained history it supplies to the chart,
// before getBars / subscribeBars callbacks. Rebuild retained history on pagination.
// candles: time seconds, closeTime milliseconds; sorted unique OHLCV.
// h1/h4: independent histories for the exact same exchange/product.
session.publish({symbol, resolution, candles, h1, h4, observedAt});
const chart = mountApexChart({
  Widget: TradingView.widget, container: 'chart', datafeed,
  session, symbol, resolution,
});
await chart.ready;
// Explicit registration must snapshot native input values with
// session.signalSettingsFromInputs(inputCallback), set nativeSymbol, interval,
// armedAt, kind:'apex-signal', enabled:true, once:false, and persist the rule.
// Host polling calls session.evaluateAlarm(rule,{symbol,resolution}), persists
// returned rule cursor, then delivers returned events through its notification UI.
// Calling study.main during redraw NEVER sends notifications.
```

호스트의 데이터피드/페이지네이션/실시간 구독, 네이티브 설정 조회→알람 등록 UI, 저장/복원, 기기 알림 전달은 아직 연결되지 않았다. 라이브러리의 ticker 반환값과 세션 symbol은 동일해야 한다. 지표 설정 변경 후 라이브러리 재계산, HTF 갱신 시 재계산, 종목/시간봉 전환, 세션 해제는 실제 엔진에서 추가 검증해야 한다. 계산 캐시는 시세 스냅샷 객체와 설정별이며 표시 봉마다 전체 계산을 반복하지 않는다.

## 검증과 남은 조건

- 65개 Node 테스트 통과. 신규6개: 원본8EMA 수치, HTF 미래값 배제, 네이티브 출력 계약과 알람 동일봉/중복방지, 미확정봉 제외, 종목격리/변조/오래된 응답 거부, 생성자·데이터피드 등록 계약.
- 생성자는 테스트 대역을 사용했다. 실제 TradingView 라이브러리·설정창·채움·도형·그리기 브라우저 검증은 미실시.
- Vite 기존 앱 빌드 통과. 신규 모듈은 아직 기존 엔트리에서 import하지 않으므로 운영 번들은 기존과 동일하다.
- 정식 라이브러리 승인/파일과 실제 접근 가능한 선물 데이터가 여전히 필요하다. 기존 Binance 선물451은 해결되지 않았다. 서버 영속 알람/잠금화면 푸시도 미구현이다.

공식 문서:
- https://www.tradingview.com/charting-library-docs/latest/custom_studies/
- https://www.tradingview.com/charting-library-docs/latest/custom_studies/Custom-Studies-Examples/
- https://www.tradingview.com/charting-library-docs/latest/connecting_data/Datafeed-API/
- https://www.tradingview.com/charting-library-docs/latest/quick-start/
