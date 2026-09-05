# WORKLOG - 작업 진행 로그 (단일 마스터 파일)

> 이 파일 하나에만 모든 작업 진행상황을 기록한다. 새 문서를 여러 개 만들지 않는다.
> 세션이 바뀌어도 이 파일 맨 위 "다음 세션 재개 지점"부터 이어서 작업한다.
> 최종 갱신: 2026-09-05

---

## [다음 세션 재개 지점] <- 여기부터 읽고 이어서

**[2026-09-05 세션 종료] 변환본 저장·조리용 계량표·전문가 초기화 수정 및 운영 배포 완료. 이번 요청의 미완료 작업 없음. 아래 7월 기록은 과거 이력이며 완료 여부를 현재 코드와 대조할 것.**

- 배포 주소: https://jungmanyoon.github.io/ (GitHub Pages, `gh-pages`). 최신 기능 커밋: `e7918be`; 배포 커밋: `29c617787f7c1f003c3b39a0e5ca92218016139e`. 운영 페이지·서비스워커가 검증한 빌드와 일치함을 확인했다.
- 완료: 표 내부 스크롤 제거, 모바일 작업 화면 분리, 원본 보존 및 최종 계량 결과를 별도 변환본으로 저장. 저장 직후 계량표 표시, 단계별 소계·계량 체크·공정/시간/온도, JSON/텍스트 결과 내보내기, 새로고침 복원.
- 변환본 재편집은 `conversion.workspace`의 입력·설정에서 시작해 배수가 중복 적용되지 않는다. 변환본만 갱신하거나 사본을 저장한다. 관련 커밋: `8634589`.
- 전문가 전체 초기화: 배수 1, 추가 제법 변환 해제, PC 원본 표만 표시, 모바일 재료 입력 화면 복귀. 원본 자체의 폴리시·탕종 재료 단계는 보존한다. 되돌리기는 이전 설정을 복원하며 초기화만으로 저장된 원본·변환본은 변경하지 않는다. 1배라도 제법 변환이 있으면 결과 표를 표시한다.
- 최종 검증: 단위 테스트 177개, Chrome·모바일 Safari 기본/반응형 E2E 34개, TypeScript 검사와 PWA 빌드 통과. 운영 사이트에서 저장·재편집·오프라인 재열기·초기화·되돌리기 및 원본 보존 확인.
- 재검증: `npm.cmd run test:run`, `npm.cmd run build`, `npx.cmd playwright test tests/e2e/responsive-workflow.spec.ts tests/e2e/basic-functionality.spec.ts --project=chromium --project="Mobile Safari" --workers=2 --reporter=line`. 배포본 검증은 `$env:REVIEW_URL='https://jungmanyoon.github.io'; node scripts/verify-saved-conversion.mjs`. 상세: `CODE_REVIEW_2026-09-05.md`.
- 기존 로컬 변경 `.claude/settings.local.json`, 미추적 `DEPLOYMENT_GUIDE.md`, `diag-dash.py`, `diag-mobile.py`는 이번 작업과 무관해 보존하고 커밋에서 제외했다. `.review-shots/`의 캡처·진단 자료는 Git 제외 상태다.
- 선택적 후속: 실물 휴대폰 키보드/PWA/백그라운드 타이머 검증, 다른 메뉴 이동 시 미저장 초안 복원, AdvancedDashboard 분리. Browserslist 오래된 데이터와 DDT 중복 import 경고는 빌드 실패를 일으키지 않는 기존 항목이다.
- 이전 세션의 Windows 샌드박스 복구 완료는 확인하지 못했다. 이번 세션은 샌드박스 비활성화 환경에서 정상 작업했으며 재설치를 반복하지 않았다.

---

**[2026-07-19 세션 G] taste 스킬 UI/UX 개선 실제 적용 완료(+간단/전문가 2모드 동반). 다음: (대형)AdvancedDashboard 분해·좌우표 공용 IngredientTable 추출 / PHASE_META 단계색·카테고리밴드색 뉴트럴화 / 설정 모달 접근성 통합 / 부가패널(영양·비용·추천) raw색 스윕.**

- **방법**: taste 스킬(design-taste-frontend)로 4개 화면군 감사(문제 40건)->3개 방향 경쟁 제안->심사. 승자 **"베이커의 작업대"**(89점, 사용성+브랜드+구현 석권)에 "프로 계기판"의 .tnum/게이지라벨 + "조용한 정밀 도구"의 하위호환·액센트잉크 원칙 이식. before/after 미리보기 `taste-preview.html` 선행 확인 후 적용.
- **토큰 인프라(직접)**: tailwind.config semantic 토큰을 flat->스케일 확장(success/warning/danger에 50/100/600/700, **DEFAULT 병기로 기존 flat 참조 하위호환**). index.css `.tnum` 유틸(tabular-nums slashed-zero) 신설. **bread-* 색 클래스 43곳 전량 brand-*로 수렴(hex 동일=시각 무변화)** + 죽은 bread 별칭 제거.
- **4화면군 병렬 스윕(파일 소유권 분할)**: 이모지->lucide(Footer 1·변환기 PHASE_META/source/모드/팬헤더/저온발효 다수·AutocompleteInput 13·삭제 X문자->Trash2) / raw색->semantic 토큰(Toast STYLE_MAP 24·설정탭 green/red/yellow/blue·변환기 amber/green/blue/orange) / 출처 6색 무지개->뉴트럴 단색 / 홈 장식아이콘 amber->ink-subtle+대표수치1개만 brand+히어로 CTA 신설 / 표 헤더 단위 **소문자 g·베이커스 % 유지**(게이지 라벨 uppercase 금지) / text-[10px]/[11px]->text-xs / shadow 토큰화.
- **좌우 재료표는 좌우 배치 유지**(사용자 피드백: 재료 많을 때 스크롤 없이 원본<->변환 한눈 대조가 주방 실사용 필수). 세로 스택 금지. 공용 IngredientTable 추출(행 정렬)은 별도 PR로 이월.
- **검증**: 3종(typecheck 0/test 164/build OK) + dev 서버 4탭(홈·변환기·레시피북·설정) 실렌더 콘솔에러 0. 홈 CTA·대표수치·출처뉴트럴·삭제아이콘·설정 danger 초기화 시각 확인.
- **보류(별도 PR)**: PHASE_META 발효 단계 구분색 9곳(기능색이라 유지, amber만 후속 정리) / recipeMeta 카테고리밴드 색 / 좌우표 공용컴포넌트 / 설정 인라인모달 접근성 통합 / 부가패널 raw색(감사 스코프 밖).
- **후속 정리(2026-07-20) 미완성 'AI 추천' 기능 제거**: 진단 결과 구조적으로 항상 0개 추천 - RecipeView가 `recipes={[recipe]}` 단일배열을 넘겨 엔진이 target(=자기자신) 제외(recommendationEngine.js:40) -> 후보 항상 빈배열. 실제 LLM 아닌 로컬 휴리스틱을 'AI'로 라벨링(package.json LLM SDK 전무). PreferenceSettings 모달·TS 이중엔진(recipeRecommendation.ts)·NutritionPanel/CostPanel 전부 미배선 고아. **조치**: RecipeView RecommendationPanel import/마운트 제거 + 고아 6파일 삭제(recommendation/·nutrition/ 패널4 + utils/ai·services 엔진2, 폴더째). 검증 typecheck0/test164/build OK + 상세뷰 실렌더 콘솔0(AI추천 완전 소거, RecipeView 청크 40->9kB). **후속(2026-07-21)**: RecipeView '영양 정보' -> '레시피 정보' 제목 정정(ko/en nutritionInfo 키 값만, PR #12 배포) - 실제 영양소 아닌 수화율/반죽수율(제빵)·총무게(제과)·제법 인라인 지표라 '영양 정보' 제목이 오해 유발했던 것 해소. (제과에서 총무게 한 줄만 남는 빈약함=잔여, 재료수 등 보강 미결정.)

**[2026-07-05 세션 F] redesign H + 라이브 폴리시 + H1/C4 전부 완료·PR #9 머지·배포·라이브200. 다음: 잔여 소소(B6 sticky·G6 공정열접기·G7 key경고 dev전용) / (대형)AdvancedDashboard 3063줄 분해·변환기 간단전문가 2모드·좌우표 완전단일화 / F4~F6(편집화면).**

- **PR #9(`fix/uiux-redesign-h`->main) 머지 완료(머지커밋 `bebf904`). `npm run deploy` 배포 완료, https://jungmanyoon.github.io/ 라이브 200 확인.** 로컬 브랜치 삭제.
- **세션 F 추가 작업(라이브 테스트 피드백 반영)**: 레시피목록 폴리시(필터 드롭다운 overflow 절단 버그 수정=overflow-x-hidden 제거+z-30 / 빵·쿠키 색 구분=쿠키 stone tint / 헤더 툴바 단일화·검색+필터+정렬 한 줄로 공간압축) · DDT 레이아웃 재배치(max-w-4xl+입력 2열+결과/참고 하단 2열, 빈 우측 해소) · 상세뷰 헤더밴드 슬림화 · 변환기 재료표 %/g 구분(% 단위+g 볼드+구분선)·원본표 단계 소계 추가·상단 헤더 의도된 2줄 정돈.
- **H1 베이킹 모드 완료**: 신규 `src/components/pwa/BakingMode.tsx` - navigator.wakeLock(화면유지, 미지원시 무시)+전체화면 큰글씨 단계뷰(진행바·완료체크·시간/온도 배지·이전/다음·Esc/좌우키). 공정 패널 헤더 진입버튼(공정 있을때만), completedProcesses 연동. bakingMode i18n.
- **C4 인쇄 폴리시 상향**: 배수칩·재료삭제×·공정삭제×·일괄입력/+재료 버튼 print-hide(소계·표내용 유지).
- **G6 이월 사유**: 단일 제법 공정열 접기는 phase 생성이 그 열 select에 의존 -> '사전반죽 추가' 어포던스 설계 선행 필요(기능 손실 방지).
- **G7 재확인**: key 경고 - AdvancedDashboard 가시 JSX map **전부 keyed** 재확인, 컴포넌트 스택도 'at div/AdvancedDashboard'까지만(파생/전이 렌더 추정). dev 전용·무해라 이월.

**[2026-07-05 세션 E] redesign 배치 H(H2~H6) 완료 (브랜치 `fix/uiux-redesign-h`, PR #9 생성 - 머지/배포는 사용자 결정 대기). 다음: H1(베이킹 모드) / 잔여(B6·G6·G7·C4폴리시) / (대형)AdvancedDashboard 분해·간단전문가 2모드.**

- 사용자 디자인 결정(AskUserQuestion): 이미지=**아이콘 헤더밴드만**(Recipe.image 미도입) · 밴드색=**하이브리드 미세 tint**(de-amber 정합) · 홈카드=**읽기전용** · 설정그룹=**도메인 정확판**.
- 완료: **공유 SSOT**(`src/constants/recipeMeta.ts` RECIPE_CATEGORY_META + `CategoryHeaderBand`, RecipeCard/HomePage 이모지 CATEGORY_ICONS 중복·불일치 제거, `category.*` i18n) · **H2**(카드/뷰 카테고리 헤더밴드, RecipeView raw enum→i18n 교정) · **H3**(HomePage 인라인카드→RecipeCard compact 단일소스, `hideActions` prop 신설·onDelete optional화, 홈 읽기전용) · **H4**(ProcessStep.phase 타입, 대시보드 공정패널 processesByPhase 그룹핑=다단계만 구분선/단일=기존 flat, 로드/저장 왕복+편집모드 phase select, 탕종식빵 시드 태깅) · **H5**(범용 `ConfirmModal` 신설, window.confirm→3버튼[덮어쓰기/사본으로/취소], 사본=강제신규+접미사) · **H6**(설정 9탭 그룹화 일반/계산설정6/시스템2 + 그룹소제목 + 모바일 edge-fade mask).
- 3종검증(typecheck0/test164/build OK) + 실렌더 스크린샷(목록·홈읽기전용·뷰대형밴드·설정그룹·공정타임라인 탕종/본반죽·중복3버튼모달·모바일 하단탭/edge-fade) 확인.
- **주의(H4)**: 공정 phase 번호는 전역 저장순서(findIndex) 기반 -> 시드처럼 phase순 정렬된 배열은 1~N 정상. 사용자가 phase를 뒤섞어 지정하면 번호가 저장순서를 따름(honest). 단일 phase는 회귀 없음(기존 flat 동일).
- **PhaseIngredientsView는 고아(미import) 확인** -> H4에서 손대지 않음(리스크 최소). 대시보드 PHASE_META(이모지)도 그대로 재사용(공정/재료 시각 일치).

**[2026-07-04 세션 D] 반응형 배치 완료 (브랜치 `fix/uiux-phase2-responsive`, PR 머지·배포 완료). 다음: redesign H / 잔여(B6·G6·G7·C4폴리시).**

- 완료: **D5**(모바일 하단 고정 탭바 `BottomNav.jsx` 신규 - 홈/변환기/레시피/DDT/설정 아이콘+라벨, Header 주요 nav는 데스크톱 전용화) · **H7**(변환 시 모바일/태블릿에서 변환표 먼저=결과우선, `order-first lg:order-none`. 데스크톱 좌우 2열 불변). 3종검증(typecheck0/test164/build OK) + 실렌더(375px 하단바·클리어런스 / 모바일 변환표 Y<원본 Y / 데스크톱 좌우 유지).
- **B6 이월(리스크)**: 요약 pill sticky는 세로로 긴 대시보드 헤더 밖으로 pill을 빼내는 리팩터 필요(sticky는 부모 박스 내에서만 유지) = 회귀 리스크. 총량은 이미 표 합계 푸터에 노출 -> 우선순위 낮음.

**[2026-07-04 세션 C] 실행모드 배치 C 완료 (브랜치 `fix/uiux-phase2-execmode`, PR #7 머지·배포 완료). 다음: 반응형(B6/D5/H7) / redesign H / G7(정밀 repro).**

- 완료(C1~C6): 공정 완료 체크박스+진행카운터(C1) · 변환표 계량 체크리스트 미장플라스(C2) · **TimerManager 고아 배선(C3) + 배선 중 발견한 무한루프 버그 수정** · 인쇄/PDF(C4, 기본 수준) · 공정 지시문 가독성(C5) · 삭제 undo(C6는 A4에서 이미 완료). 3종검증(typecheck0/test164/build OK) + 실렌더 스크린샷(공정 "완료 2/8" 체크·취소선 / 변환표 ×2 계량 체크 / 타이머 모달 루프없음 / 인쇄 크롬숨김).
- **TimerManager 버그(중요)**: `useNotifications`가 렌더마다 새 함수 반환 -> TimerManager의 `useEffect(..., [isOpen, getActiveTimers])`가 setActiveTimers를 무한 재호출. 고아(미마운트)라 여태 잠복. deps를 `[isOpen]`로 축소해 해결. (다른 곳에서 TimerManager/useNotifications 배선 시 동일 주의)
- **G7 key 경고**: 대시보드 수동 배수(×N) 흐름에서 재현 확인. 단 AdvancedDashboard 가시적 map은 전부 keyed -> 소스 미핀포인트, dev 전용·무해라 재이월. (실행모드 C 코드가 추가한 것 아님)
- ephemeral 원칙: C1 completedProcesses / C2 checkedIngredients는 **레시피에 저장 안 함**(실행 세션 전용 Set). C2는 배수 변경 시 초기화.

**[2026-07-04 세션 B] 기계적 후속 폴리시 + A3 도메인 버그 완료 (브랜치 `fix/uiux-phase2-polish`, PR #6 머지·배포 완료). 다음: 실행모드 C / 반응형 / redesign H.**

- 완료: **A3**(제과/제빵 지표 게이팅) · **G1**(gray 48개소->토큰, grep 0) · **G2**(헤딩 h1/h2/h3 타입스케일 토큰) · **G3**(변환 g셀 valueFlash 애니메이션) · **G5**(홈 히어로 '평균 재료 수'->'페이스트리·쿠키' 카테고리 집계) · **E2**(.focus-ring 유틸 정의 + SearchBar bread-500->brand-400 + RecipeCard 아이콘버튼 포커스링). 3종검증(typecheck0/test164/build OK) + 실렌더 스크린샷 검증(제과 요거트롤=수화율/반죽수율/제법 숨김·총무게만 / 제빵 우유식빵=수화율70%/반죽수율/제법 유지 / 목록 제법칩 제과만 숨김 / 홈 새카드 / 설정 토큰).
- **도메인 확정(사용자 지적 반영)**: 수화율·반죽수율·제법은 밀가루-반죽 기반 **제빵** 지표라 **제과**(스펀지·거품형 케이크·쿠키 등)엔 대체로 무의미(녹차롤 "수화율 338%"의 원인 = 제과에 제빵지표 표시). 대시보드는 이미 제법을 제빵 전용 게이팅(:2668)했으나 RecipeView/RecipeCard만 누락 -> `productType==='pastry'`면 숨김. **슈톨렌 예외**: straight가 아닌 실제 제법을 가진 제과는 계속 노출(`!isPastry || methodType!=='straight'`). => 아래 "A3 배선 후속" hydration 버그 해소됨.
- **이월(신중)**: **G6**(공정 열접기·moderate·'사전반죽 추가' 어포던스가 제빵 도메인과 얽혀 별도 판단) / **G7**(React key경고·이번 세션 흐름 home/list/view/settings/변환버튼에선 재현 안 됨(WebGL 경고만), 대시보드 변환표 특정 상호작용 repro 필요). 실행모드 C 전부·반응형 B6/D5/H7·redesign H는 그대로.
- (참고·후속 판단) 제과 재료표 BP%(베이커스%)는 여전히 전 레시피 표시됨 — 제과엔 관례상 안 쓰나 계산상 오도는 아님(renderIngredientTable 공유 컴포넌트라 게이팅 시 회귀범위 큼).

**[2026-07-04 세션 A] UI/UX Phase 2: quick-win 배치 A/B/D/E/F1-3/G 완료 + main 머지 + 배포 완료.**

- PR #5(`fix/uiux-phase2` -> `main`) 머지 완료(머지커밋 `25bd5a8`). `npm run deploy`로 gh-pages 배포 완료, https://jungmanyoon.github.io/ 라이브 200 확인.
- 완료 커밋: A `e00b90c`(P1 4건) / B `51a737b` / D `1143f3b` / E `4304984` / F1-3 `01b9f9f` / G `061a2f1`. 각 3종검증(typecheck0/test164/build OK) + 주요 P1은 실렌더 스크린샷 검증.
- **남은 이월분(다음 세션, 신중 패스 필요)**: 아래 체크리스트에서 미체크 항목.
  - **실행모드 패스**(상태/상호작용 무거움): 배치 C 전부(C1 공정 체크박스·C2 미장플라스·C3 타이머 배선·C5 모바일 공정), F4(편집표 AutocompleteInput), F5(일괄 phase), F6(DDT 연결). H1(베이킹 모드)과 함께.
  - **반응형 패스**: B6(sticky 요약)·D5(모바일 하단 탭바)·H7(태블릿 결과우선 레이아웃).
  - **기계적 후속**: ~~E2·G1·G2·G3·G5~~ **완료(세션 B)**. 잔여는 G6 열접기·G7 key경고(런타임 핀포인트)만.
  - **redesign 배치 H**: 레시피 이미지/카테고리 헤더밴드(+Recipe.image), 카드 SSOT, 공정-phase 타임라인, 덮어쓰기 ConfirmModal+사본저장, 설정 9탭 그룹화.
- **A3 배선으로 드러난 후속**: ~~RecipeView 수화율이 계란·생크림·식용유까지 liquid 합산해 과대치(녹차롤 338%)~~ **해소(세션 B)** - 제과에 제빵지표(수화율/반죽수율/제법) 표시 자체를 게이팅. hydration 재분류가 아니라 "제과엔 안 보임"이 도메인 정답.
- 감사 원본: 이 파일 "## [UI/UX Phase 2 감사 체크리스트 (2026-07-04)]" 절(배치 A~H, 근거 file:line 포함).

**[Phase 1 완료 이력] Phase 1 완료 + main 머지 + 배포 완료 (2026-07-04).**

- PR #4(`fix/uiux-phase1` -> `main`) 머지 완료(머지커밋 `efff849`). `npm run deploy`로 gh-pages 배포 완료, https://jungmanyoon.github.io/ 라이브 반영 확인(스크린샷 검증).
- 근본원인 확정: 뉴트럴 팔레트 토큰을 tailwind에 정의만 하고 화면에 미적용(gray 879회·bread 잔존). "안 바뀐" 진짜 이유.
- **Phase 1b(커밋 9cde235):** de-amber 전면(기반4파일 직접+병렬 12그룹, 색상1196·이모지19) + #3 좌우표 통합(isConverted, ×1 단일표+힌트, 변환시 2열). 휴지=뉴트럴, 앰버는 CTA/활성/포커스링/핵심숫자만.
- **Phase 1c(커밋 027bf49):**
  - #4 필터 접기: FilterControls productType 드롭다운 제거(카테고리칩이 단일 소스) + 난이도/시간/태그를 "필터" 토글 뒤로 접힘(기본 접힘·배지는 숨은필터만 카운트). 정렬은 항상 노출.
  - #5 새 레시피 빈 시작: 대시보드 useState 기본을 빈 재료1행/빈 공정으로, 로드이펙트에 빈-레시피 리셋(else) 추가. HomePage "새 레시피"도 빈 레시피 생성으로 통일(setCurrentRecipe(null) 버그 수정). "예시 불러오기" 버튼+안내배너(빈 상태) + "예시 데이터" 배지(로드 후).
  - #6 용어 통일: ko.json에서 폴리쉬→폴리시 15건, 스펀지법→중종법 2건+발효 1건(스펀지케이크 보존). preferment는 이미 사전반죽.
  - 검증 3종 통과: typecheck 0 / test 164 / build(PWA) OK.
- **UI 후속(선택·보류):** 데이터맵 이모지(PHASE_META.icon 📦, CATEGORY_ICONS 🍞🎂, 공정칩 ⏱🌡) → lucide 통일은 데이터구조 리팩터 필요. 설정 탭 섹션헤더 이모지 일부 잔존. #6 전문용어 툴팁(영문병기로 일부 갈음됨).
- **Phase 2 (다음, 주 단위):** AdvancedDashboard 3063줄 컴포넌트 분해, 변환기 간단/전문가 2모드, 모바일 결과우선 탭/바텀시트, 좌우표 완전 단일화(원본g|변환g 인라인 컬럼) - 하단 [보류 항목] 절 참고.
- 로컬 `fix/uiux-phase1` 브랜치는 머지 후 삭제됨(원격은 이 저장소 관행대로 유지). 무관파일(.claude/settings.local.json·DEPLOYMENT_GUIDE.md·diag-*.py)은 계속 커밋 제외.

### 다음 4개 항목 상세 + Codex(gpt-5.5) 확정 접근
1. **#4 필터 접기** (src/components/recipe/FilterControls.tsx, RecipeListPage.tsx)
   - `productType` 드롭다운 제거 -> 레시피목록의 카테고리칩을 제품/카테고리 단일 소스로.
   - 나머지 필터(difficulty/timeRange/tags)는 "필터" 토글 버튼 뒤로 **항상 접힘 + activeFilterCount 배지**.
   - 배지에 카테고리칩 선택은 미포함(숨겨진 필터만 카운트).
2. **#5 새 레시피 빈 시작 + 예시 분리**
   - 지금은 "새 레시피" 눌러도 강력분 식빵 예시가 채워져 내 데이터/샘플 구분 불가.
   - 새레시피 = 빈 재료 1행으로 시작 + 상단 안내배너. 예시는 별도 "예시 불러오기" 버튼 + "예시 데이터" 배지.
3. **#6 용어 통일** (src/i18n/locales/ko.json + 각 컴포넌트)
   - 프리퍼먼트 -> 사전반죽 등 화면마다 다른 표기 통일. 전문용어 보조설명/툴팁.
4. **#3 좌우표 통합** (src/components/dashboard/AdvancedDashboard.tsx, 약 2688행 좌우표)
   - 변환 판정: `Math.abs(effectiveMultiplier - 1) < 0.0001` (부동소수 안전).
   - 변환 없음: 변환표 렌더 안 하고 원본표 `lg:col-span-2` 전체폭 + 조용한 힌트배너(`bg-surface-muted border-line text-ink-muted`) "배수/팬을 바꾸면 여기 표시".
   - 변환 있음: 기존 좌우 2열 유지 + 변환표 헤더에 `×배수` 배지 + `총량 800g -> 1200g` 요약.
   - 행별 변화 강조는 비추천(전부 같은 배수라 노이즈). 완전 단일표 통합은 Phase 2로.
   - 원본표=편집폼(6컬럼), 변환표=읽기전용(3컬럼), 변환은 `effectiveMultiplier` 단일값(AdvancedDashboard.tsx:980).

### 뉴트럴 팔레트 토큰(추가됨, 앞으로 활용)
tailwind.config.js에 추가: `surface`(canvas #F8FAFC / paper #FFFFFF / muted #F1F5F9), `line`(DEFAULT #E2E8F0 / soft #F1F5F9 / strong #CBD5E1), `ink`(DEFAULT #0F172A / muted #475569 / subtle #64748B / disabled #94A3B8 / inverse #FFFFFF). brand(amber)는 액센트로만. bread는 하위호환 유지.

---

## [UI/UX Phase 2 감사 체크리스트 (2026-07-04)]

> 2차 전문가 감사(61 에이전트, 실렌더 21캡처+베이킹 8렌즈+적대적 검증) 확정 50건. 체크박스 완료 표기하며 진행. 위치는 미표기시 `src/components/dashboard/AdvancedDashboard.tsx` 기준.
> 핵심 진단: 계산은 맞으나 "그 숫자를 믿고 읽기 어렵다"는 신뢰·판독층에 문제 집중. 새 기능보다 이미 만든 자산(RecipeView/TimerManager) 배선 + 핵심 출력숫자(변환 g·베이커스%) 위계·대비·의미 교정이 우선.

### 배치 A - P1 (최우선, 전부 quick / 브랜치 시작점) [완료 2026-07-04 · 브랜치 fix/uiux-phase2 · typecheck0/test164/build OK · 실렌더 검증]
> 부수효과: A2로 E1(:2851 ink-disabled) 이미 해소. A3로 RecipeView가 노출되며 발견 -> RecipeView 수화율이 계란·생크림·식용유까지 liquid로 합산해 과대치(녹차롤 338%). 별도 후속 필요(RecipeView hydration 분류 교정, H/후속 배치).
- [x] A1 '손실률'->'팬 충전율': :1099-1102(계산),:2200(라벨/툴팁/색). 계산식 `convertedTotal/panTotalWeight`로 뒤집고 i18n '팬 충전율', 색 임계 >110 danger/85-110 success/<85 warning. 진짜 굽기손실은 yieldLoss로 별도 칩. (현재 라벨·계산·색 축이 서로 달라 정상 굽기손실을 경고색으로 오도)
- [x] A2 베이커스 % 열 로드직후 0 -> amount 파생: :2851(셀),:587(로드),:2015-2019(갱신). `flourTotal` useMemo로 `flour>0?amount/flour*100:0` 전 재료 동일식. 변환표(:2886-2890)에도 % 셀 추가. IngredientTable.jsx:73-80 로직 재사용.
- [x] A3 RecipeView 라우팅 배선(고아 컴포넌트 살리기): App.tsx:73(VALID_TABS)/:76-89(PAGE_TITLES)/:153-190(renderActive) + RecipeListPage.tsx:67, HomePage.tsx:89. 'view' 탭 추가, RecipeView 5 prop 배선, 카드 탭 dashboard->view(연필=editor 유지). RecipeView 잔존 amber(223,248-250) de-amber.
- [x] A4 파괴적 삭제 undo+터치타깃: :1995(removeIngredient),:2030(removeProcess), 버튼 :2857/:3072. 기존 `showUndoToast`(1535) 스냅샷 복원으로 감싸기(하드코딩 메시지 일반화), 버튼 `p-2 -m-2` 44px 히트영역.

### 배치 B - P2 quick: 변환기 판독·신뢰 [완료 2026-07-04 · 브랜치 fix/uiux-phase2 · typecheck0/test164/build OK · 실렌더(×2·375px) 검증 · B6만 H7 이월]
- [x] B1 변환 g 위계: :2914-2918,:195-200. g셀만 dynamicStyles 축소서 분리, 최소 text-sm+font-semibold.
- [x] B2 소수 스마트 반올림(formatWeight 헬퍼, 변환표 g/총계 적용; 총계 sum-of-rounded 정밀화는 후속): :1000,:1108,:2928. 포맷 헬퍼 10g↑ 정수/<10g만 0.1g, 총계 round-then-sum.
- [x] B3 변환표 % 열 추가 (A2에서 완료): :2888-2890. 우측정렬(스트레이트=ratio, 제법변환=단계밀가루 대비).
- [x] B4 단계별 소계 g (변환표 구분선 `소계 Ng` ml-auto; 다단계 변환시 표시): :2894-2909,:2928. phase 그룹 소계 인라인.
- [x] B5 375px 원본표 과밀 (공정·% 열 hidden sm:table-cell, 375px visible:false 확인; 완전 카드화 H7): :2766-2774. 공정/% 열 `hidden sm:table-cell`로 재료명 폭 확보.
- [ ] B6 sticky 요약 pill(태블릿/모바일): **-> 이월(세션 D 판단)**. 요약만 sticky하려면 세로로 긴 대시보드 헤더(flex-shrink-0) 밖으로 pill을 빼내야 함(sticky는 부모 박스 내에서만 유지 -> 헤더 스크롤 시 함께 사라짐). = 헤더 분리 리팩터=회귀 리스크. 총량은 이미 각 표 `합계 Ng` 푸터에 노출되어 우선순위 낮음. :2237-2246.
- [x] B7 변환결과 하드코드 blue->토큰 (tailwind info를 스케일로 확장 DEFAULT 하위호환 + 변환표 blue-*->info-*): :2877-2928. info 토큰 50-700 확장 후 치환.
- [x] B8 재료 그리드 키보드 포커스 소실 (편집 td 4곳 focus-within:ring): :2807,:2831,:2839,:2854. td `focus-within:ring-2 ring-brand-400 ring-inset`(AutocompleteInput !ring-0 충돌 회피).

### 배치 C - P2 quick: 굽기 실행 흐름 [완료 2026-07-04 · 브랜치 fix/uiux-phase2-execmode · typecheck0/test164/build OK · 실렌더 검증]
> 부수: C3 배선으로 TimerManager 잠복 **무한루프 버그** 발견·수정(useNotifications가 렌더마다 새 함수 반환 -> `useEffect [isOpen, getActiveTimers]`가 setActiveTimers 재호출 무한루프. deps를 `[isOpen]`으로 축소). 고아라 여태 안 드러남.
- [x] C1 공정 완료 체크박스+진행 카운터 (ephemeral `completedProcesses:Set` - 레시피에 저장 안 함. 칩 좌측 별도 CheckSquare 버튼, 완료 시 opacity-60+취소선, 패널 헤더 "완료 N/M" 카운터. 실렌더 "완료 2/8" 확인).
- [x] C2 변환결과 계량 체크리스트(미장플라스) (ephemeral `checkedIngredients:Set`, 복합키 `phase-cat-id-idx`. 변환표 좌측 체크박스 열(thead th+소계 colSpan 4->5), 체크 시 행 opacity-50+취소선. `effectiveMultiplier` 변경 useEffect로 초기화. 실렌더 ×2에서 확인).
- [x] C3 TimerManager 배선(고아 살리기) (툴바 Timer 토글 버튼 + 모달 렌더(`seed` prop 추가, 공정칩 시간 Play 버튼->프리필 후 열기) + 위 무한루프 수정. CTA `bg-orange->bg-brand`, focus `orange->brand-400` 정합. orange/green 카테고리 점은 heat/발효 의미색이라 유지).
- [x] C4 인쇄/PDF (툴바 Printer 버튼 window.print() + index.css `@media print`: `header`/`.print-hide` 숨김 + `[class*=overflow-]`/`[style*=height]` 해제로 고정높이·스크롤 컨테이너 펼침 + shadow 제거. 툴바 액션·리사이즈핸들·체크버튼에 print-hide. 실렌더 print 에뮬레이트로 크롬 숨김·내용 펼침 확인. **기본 수준** - 배수칩/재료 삭제X는 아직 인쇄됨, 후속 폴리시 여지).
- [x] C5 공정 지시문 가독성 (본문 text-xs->text-sm, 칩 컨테이너 모바일 세로 1열(`flex-col lg:flex-row lg:flex-wrap`), 폭조절 핸들 `hidden lg:block`. C1과 함께).
- [x] C6 단계칩 오탭 삭제 undo (**A4에서 이미 완료** - removeProcess가 이미 showUndoToast로 order 복원 감쌈. :2038-2042).
- [ ] **(잔여) G7 key 경고**: C3 배선 검증 중 대시보드 수동 배수(×N) 흐름에서 재현됨("unique key" @ div @ AdvancedDashboard). 단 AdvancedDashboard의 모든 가시적 JSX `.map`은 전부 keyed임을 확인 -> keyless 소스가 파생/전이 렌더 경로로 추정, 정밀 핀포인트 실패. dev 전용·기능 무해라 재이월(내 C 코드가 추가한 것 아님).

### 배치 D - P2 quick: 전역 IA/내비/브랜드 [완료 2026-07-04 · typecheck0/test164/build OK · 사용자 결정: 앱명="제과제빵 레시피 변환기", 랜딩=recipes · D5는 H 이월]
- [x] D1 dashboard/workspace 중복 통합 (Header active에 workspace 별칭; 'workspace' 라우트는 하위호환 유지): App.tsx:73·158-159, main.jsx:43, Header.jsx:59. canonical 'dashboard'.
- [x] D2 랜딩 탭 단일화 (useAppStore 기본 이미 recipes + main.jsx 시드 workspace->recipes): useAppStore.ts:47, main.jsx:41-46, App.tsx:116-121. 기본 'home' 권장.
- [x] D3 앱 이름 정렬 -> "제과제빵 레시피 변환기" (app.name/footer.appName ko·en + BASE_TITLE; home.title는 이미 일치): ko.json:3·2098, App.tsx:91(BASE_TITLE), footer. 캐논 1개('계산기' 배제, DDT탭과 중복).
- [x] D4 푸터 미번역 키 노출 (Footer nav.dashboard -> nav.converter): Footer.tsx:44 -> t('nav.converter') 또는 nav.dashboard 키 추가 + i18n missing 핸들러.
- [x] D5 모바일 nav 라벨 없음 (세션 D: `BottomNav.jsx` 신규 - 모바일 전용 하단 고정 탭바(홈/변환기/레시피/DDT/설정, 아이콘+라벨, 활성 brand). App.tsx 렌더+main `pb-16 sm:pb-0` 클리어런스. Header 주요 nav는 `hidden sm:flex`로 데스크톱 전용화(설정/도움말만 모바일 상단 유지). 실렌더 375px 검증).

### 배치 E - P2 quick: 접근성·일관성 [완료 2026-07-04 · typecheck0/test164/build OK · E2 세션 B 완결]
- [x] E1 ink-disabled(2.6:1)->ink-subtle(4.76:1) 4곳 (:2851 A2 + HomePage:261 + IngredientSettingsTab:608·825): :2851, HomePage.tsx:261, IngredientSettingsTab.tsx:608·825. (A2/변환기 %열과 겹침-함께)
- [x] E2 포커스 링 단일화 (세션 B: index.css `.focus-ring` 유틸 정의 + SearchBar `bread-500`->`brand-400`(레거시 앰버 잔재 2곳) + RecipeCard 아이콘버튼(편집/삭제 compact·basic 4개)에 `focus-ring`. Header/카드 메인버튼은 이미 brand 링 보유라 미변경).
- [x] E3 combobox ARIA (AutocompleteInput: useId, role=combobox/listbox/option + aria-expanded/controls/autocomplete/activedescendant/selected, recent 헤더 role=presentation).
- [x] E4 토스트 aria-live 이중 낭독 (ToastContainer 래퍼 aria-live 제거, role=region/label 유지, 낭독은 개별 Toast에 위임).

### 배치 F - P2 quick: 카드/편집/DDT [F1~F3 완료 2026-07-04 · typecheck0/test164/build OK · F4/F5/F6는 신중 패스 이월]
- [x] F1 카드 출처색 아이콘 국한 (compact+기본 카드: sourceInfo.color를 아이콘 className으로, 텍스트는 ink-subtle; 색 위계 반전 해소).
- [x] F2 카드 터치타깃 44px (compact 36->44, 기본 40->44, 삭제 hover red-500->danger 토큰).
- [x] F3 IngredientTable 삭제 아이콘화 (텍스트 danger Button -> lucide Trash2 ghost 버튼 aria-label/title; 375px '삭/제' 세로깨짐 해소). +bread-500->brand-500 포커스링 정합.
- [ ] F4 IngredientTable AutocompleteInput 전환: **-> 신중 패스 이월** (type<->category 매핑+Enter/Tab passthrough, 편집표 회귀 리스크). IngredientTable.jsx:84-114.
- [ ] F5 일괄입력 phase 파싱: **-> 신중 패스 이월** (ParsedIngredient phase+모달 드롭다운). BulkIngredientInput.tsx:51-128.
- [ ] F6 DDT 연결/컨텍스트/환경값: **-> 신중 패스 이월** (대시보드 로컬 재료 state를 Recipe로 변환해 setCurrentRecipe 필요 = 구조작업). DDTCalculator.tsx:160-173, App.tsx:173-174.

### 배치 G - P3 polish [G1/G2/G3/G4/G5 완료 · G6/G7 이월 · typecheck0/test164/build OK]
- [x] G1 gray-* -> line/ink/surface 토큰 (세션 B 완결: 잔여 48개소/22파일 전부, 서브에이전트 20파일 46치환 + AdvancedDashboard:2272(bg-gray-500->bg-ink-subtle)·RecipeCard:60(text-gray-600/bg-gray-50->ink-muted/surface-muted). Footer 다크섹션은 gray->slate 유지. grep 0 확인).
- [x] G2 타입스케일 토큰 적용 (세션 B: index.css 헤딩 h1/h2/h3 -> @apply text-h1/h2/h3 text-ink. h2/h3 색 slate-800/700->ink 통일, h3 굵기 500->600. 실렌더로 과대 대비 없음 확인).
- [x] G3 변환 값 flash (세션 B: tailwind keyframes.valueFlash(info-100 #DBEAFE->transparent 0.6s) + animation, 변환표 g셀 값 `<span key={convertedAmount} className="animate-valueFlash">`. 값 바뀔 때 리마운트로 재생).
- [x] G4 compact 카드 이름 위계 (이름 text-sm/medium -> text-base/semibold, 메타 ink-muted -> ink-subtle).
- [x] G5 홈 히어로 배니티 지표 교체 (세션 B: '평균 재료 수'(avgIngredients, TrendingUp) -> '페이스트리·쿠키'(Cookie 아이콘, cookie+pastry+confectionery+savory 카테고리 합). i18n home.pastryRecipes ko/en 추가. 죽은 avgIngredients 계산 제거. 1번 카드가 이미 전체수라 중복 회피).
- [ ] G6 단일제법 '공정' 열 접기(moderate): :2771,:2835-2850,:956. hasMultiplePhases=false면 열 접고 '사전반죽 추가' 어포던스. **-> 이월(moderate·'사전반죽'은 제빵 도메인 전용이라 게이팅 설계 필요, 실행모드/redesign과 함께)**.
- [ ] G7 (별건) React unique key 경고: **-> 이월(런타임 핀포인트 필요)**. 세션 B에서 home/list/view/settings/변환버튼 흐름 콘솔에 key 경고 미발생(WebGL 폴백 경고만) -> 대시보드 변환표 배수변경 등 특정 상호작용에서 repro 후 정확한 map에 key 부여.

### 배치 H - Larger redesign (별도 서브프로젝트, 신중히 / 기존 Phase 2 백로그와 통합)
- [x] H1 전용 '베이킹 모드' (세션 F 완료): 신규 `src/components/pwa/BakingMode.tsx` - navigator.wakeLock(try/catch, 미지원/거부 무시)+전체화면 큰글씨 단계뷰(진행바·완료체크·시간/온도 배지·이전/다음·Esc/좌우키). 공정 패널 헤더 진입버튼(공정 있을때만), completedProcesses/toggleProcessDone 연동. bakingMode i18n(ko/en). 실렌더 확인.
- [x] H2 카테고리 헤더밴드 (세션 E · 사용자 결정=아이콘 밴드만, Recipe.image 미도입): `src/constants/recipeMeta.ts` SSOT(RECIPE_CATEGORY_META: lucide 아이콘/하이브리드 미세 tint gradient/iconTint) + `CategoryHeaderBand` 컴포넌트. RecipeCard(compact/기본) 상단 + RecipeView 대형 밴드. RecipeCard/HomePage 이모지 CATEGORY_ICONS 중복·불일치 제거, `category.*` i18n 신설, RecipeView raw enum→i18n 교정.
- [x] H3 홈·목록 카드 SSOT 통합 (세션 E): HomePage 인라인카드 → `RecipeCard compact` 단일소스. RecipeCard `hideActions` prop 신설(onDelete optional화) → 홈은 읽기전용(편집/삭제 숨김). 난이도배지/ArrowRight 소실 수용(상세뷰서 확인). RecipeList는 현행 유지.
- [x] H4 공정-phase 타임라인 (세션 E · 대시보드 한정): `ProcessStep.phase`(PhaseType) 타입 + 로컬 타입. 공정 패널 `processesByPhase` 그룹핑(재료 phaseOrder 재사용) = 다단계만 PHASE_META 구분선/단일=기존 flat. 로드/저장 phase 왕복 + 편집모드 phase select. 탕종식빵 시드 steps 태깅. **PhaseIngredientsView는 고아라 미터치, RecipeView steps 신설은 후속 이월**. 번호는 전역 저장순서(findIndex).
- [x] H5 저장 덮어쓰기 (세션 E): 범용 `src/components/common/ConfirmModal.tsx` 신설(actions 배열/Escape/백드롭/접근성). `saveRecipeData(overwriteId, {asCopy})` 확장 - asCopy는 currentRecipe 폴백 차단(원본보존)+접미사(사본/copy). window.confirm→3버튼 모달[덮어쓰기(danger)/사본으로(primary)/취소(ghost)]. i18n duplicateRecipeTitle/Body/saveAsCopy/copySuffix.
- [x] H6 설정 9탭 그룹화 (세션 E · 도메인 정확판): 일반{언어} / 계산설정{팬·제품·환경·제법·수율·재료 6} / 시스템{저장·고급 2}. TABS에 group 필드+재정렬, SETTINGS_GROUPS SSOT, Fragment 그룹 렌더 + 그룹소제목(데스크톱) + 모바일 가로탭 edge-fade(`mask-image` linear-gradient, lg 해제). settingsGroups i18n.
- [x] H7 태블릿/모바일 변환기 결과우선 레이아웃 (세션 D · 저위험판: 변환 시(`isConverted`) 변환표 래퍼에 `order-first lg:order-none` -> 모바일/태블릿(grid-cols-1)에선 변환(결과)표가 원본보다 위, 데스크톱(lg 2열)은 좌우 배치 그대로. 실렌더로 모바일 변환표 Y<원본 Y·데스크톱 좌우 유지 검증. 완전 결과우선 재설계(탭/바텀시트)는 redesign 백로그).
- (기존 백로그 통합: AdvancedDashboard 3063줄 컴포넌트 분해, 변환기 간단/전문가 2모드, 좌우표 완전 단일화 - H와 함께 계획)

---

## [작업 규칙 / 검증 방법]

- git: main이 기본. 작업은 별도 브랜치 -> PR -> merge. 무관 파일(.claude/settings.local.json, DEPLOYMENT_GUIDE.md, diag-*.py)은 커밋 제외.
- 검증 3종: `npm run typecheck`(0) / `npm run test:run`(현재 164 통과) / `npm run build`(tsc 게이트+PWA 포함). 커버리지 `npm run test:coverage`(green).
- 커밋 말미: `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`. PR 말미: Claude Code 생성 표기.
- 외부 모델: 사용자가 "코덱스랑"이라 하면 Codex(mcp__codex__codex, model gpt-5.5) 협업. UI/UX는 전문가 페르소나 적용.
- UI 변경은 실제 앱을 dev(5173)/preview로 띄우고 playwright 스크린샷으로 눈으로 확인(임시 스크립트/스크린샷은 작업 후 삭제).
- 상세 코드리뷰 체크리스트는 `CODE_REVIEW_2026-07-02.md`(참고용, 102건). 이 WORKLOG가 마스터 진행 로그.

---

## [완료 이력] (최신 -> 과거)

### UI/UX 집중 리뷰 + 개선 (2026-07-03~04)
- **UI/UX 집중 리뷰**: 실제 앱 preview+playwright 스크린샷 직접 관찰 + 7렌즈 코드분석(59건). 근본원인 3: 올드=주황 단색 광역(brand=bread 동일 amber, 뉴트럴 팔레트 부재)/복잡=AdvancedDashboard 3063줄 동시편집/어려움=온보딩·용어 부재. (워크플로우 wf_3f7a3e5b-277)
- **Phase 0 완료 (PR#3 병합, main 2838d5e)**: Header 화이트 sticky 반전(활성탭만 amber), 전역 h1~h3 슬레이트화(히어로 h1만 text-white), 변환기 오븐/제법 섹션 접기, 지표 title 툴팁, 버튼위계(저장만 primary/복사 아웃라인/JSON ghost), 공정카드 hover버튼 모바일 상시노출.
- **Phase 1a (브랜치 fix/uiux-phase1, 커밋 8c0d810, 로컬 미push)**: 뉴트럴 팔레트 토큰 추가 + 홈 히어로 화이트화. 스크린샷으로 "화이트 앱 + 주황 포인트" 인상 반전 확인.

### 전면 코드리뷰 리메디에이션 (2026-07-02~03) - 발견 102건 중 96건(94%) 반영
- **PR#1 (main 4397b43)**: P0~P3 핵심. P0=RecipeEditor 크래시/DDT predictDoughTemp 섭씨정합(C-5 완결)/import sanitize. P1=타입오류 111->0 + build tsc게이트 승격/i18n 치환파괴/설정 오버라이드 삭제액션/데드코드 12파일/stores 크래시/App @ts-nocheck 해제. P2=접근성·PWA색·path traversal. P3=테스트 102->164·커버리지 게이트.
- **PR#1 후속 (78693d0)**: 잔여 low/info 40건(stores/계산/컴포넌트/설정).
- **PR#2 (main 421bc94, 947e929)**: PWA 이중화 통합(VitePWA 단일화, 앱 실행 검증) + File System API 타입보강 + e2e 정비(header 2개 strict violation 해소).
- 방법: 12축 병렬감사(63 에이전트) -> 적대적 검증. 상세 체크리스트 CODE_REVIEW_2026-07-02.md.

---

## [보류 항목] (코드리뷰 잔여 6건 + UI/UX Phase 2)

### 코드리뷰 보류 6건 (사유 있음, 별도 판단 필요)
- alias 중복(vitest/tsconfig): 번들러 vs TS컴파일러 별개 시스템이라 완전 통합 불가.
- 루트 스크립트(run.py/analyze_excel*.py/create-cafe-post.js): **사용자 자산 - 삭제 여부 사용자 결정 필요**.
- i18n 언어소스 이중화(LanguageDetector vs useLocaleStore): 언어전환 회귀 위험, 구조 리팩터 필요.
- declarations.d.ts any + noUncheckedIndexedAccess: 켜면 앱 전반 대량 타입오류(사실상 전체 JS->TS 마이그레이션 필요).
- 대시보드 as any 7건: 표준 Recipe와 근본적으로 다른 저장/로드 구조라 회귀 방지 위해 유지.

### UI/UX Phase 2 (주 단위, 나중에)
- AdvancedDashboard 3063줄 컴포넌트 분해(섹션별 + useDashboardStore 이관).
- 변환기 간단/전문가 2모드.
- 모바일 결과우선 탭/바텀시트 레이아웃.
- 좌우표 완전 단일화(원본g|변환g 인라인 컬럼).
