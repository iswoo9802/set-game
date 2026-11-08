# 셋 탐정단 — 교사 없이 자동 진행하는 실시간 버전 (v3)

## 변경된 점
교사는 방을 만들고 참여코드를 안내하면 됩니다. 학생은 입장하면 바로 플레이합니다.
교사 브라우저가 닫혀 있어도 정답 판정, 점수 반영, 다음 판 이동이 가능합니다.

- 방 생성 시 쉬움/기본과 10·20·30판을 선택합니다.
- 각 판에는 적어도 하나의 셋이 있습니다. 한 명이 정답을 확정하면 모두 다음 판으로 이동합니다.
- 오답은 기기에서 즉시 이유를 안내합니다. 정답은 Firebase에서 승인되는 즉시 점수가 반영됩니다.
- 매 판은 새로 섞은 카드판입니다. 종전의 81장을 끝까지 소진하는 방식과 다릅니다.
- 모든 판을 마치면 자동 종료하고 최종 점수를 보여 줍니다.
- 같은 판의 정답은 Firebase 트랜잭션으로 한 명만 인정합니다. 네트워크 지연에 따라 확정 순서는 실제 터치 순서와 다를 수 있습니다.
- 점수는 승인된 판별 승리 기록을 합산합니다. 학생이 점수를 직접 수정하는 경로는 없습니다.
- 정답 조합은 방 생성 시 준비합니다. 데이터베이스 규칙이 허용된 정답인지, 참가자인지, 이전 판이 끝났는지, 이미 승자가 있는지 검사합니다.
- 무료 Spark에서 사용할 수 있는 구조이며 Cloud Functions나 결제 계정 연결을 요구하지 않습니다.
- 학생별로 다른 기기를 사용하세요. 같은 브라우저의 여러 탭은 동일한 익명 사용자입니다.
- 별명과 점수는 방 코드로 입장한 사람에게 보입니다. 실제 이름 대신 번호나 별명을 써도 됩니다.
- 웹 코드를 살펴 정답을 찾는 부정행위를 막는 시험용 시스템은 아닙니다. 수업 활동용 게임입니다.

## 업데이트할 때 꼭 할 일
1. GitHub의 index.html, app.mjs, core.mjs, firebase-config.js, solo.html을 최신 파일로 교체합니다. 이미 입력한 본인의 Firebase 설정값은 유지하세요.
2. Firebase Realtime Database의 Rules에 이번 database.rules.json 전체 내용을 게시합니다. 이전 규칙은 자동 판정을 허용하지 않습니다.
3. 기존 방 대신 새 게임방을 만듭니다. v2 방과 호환되지 않습니다.
4. 다른 앱과 같은 Firebase 프로젝트라면 규칙 전체를 덮어쓰지 말고 전용 프로젝트를 사용하거나 규칙을 통합해야 합니다.

## 현재 연결 상태
firebase-config.js는 아직 비어 있습니다. 본인의 Firebase 프로젝트 설정이 필요합니다.
실제 Firebase와 태블릿의 통신 검증은 연결 후 진행해야 합니다.

## 처음 한 번: Firebase 연결하기

### 1. 프로젝트 만들기
1. https://console.firebase.google.com 에서 Google 계정으로 로그인합니다.
2. 프로젝트 추가/만들기를 선택합니다.
3. 이름 예: set-classroom. 안내에 따라 프로젝트를 만듭니다.
4. Google Analytics는 이 게임에 필요하지 않습니다. 선택할 수 있으면 끄고 진행해도 됩니다.
5. 무료 Spark 요금제로 유지합니다. 이 버전은 Cloud Functions나 결제 계정 연결이 필요하지 않습니다.

### 2. 웹 앱 등록
1. 프로젝트 개요에서 웹 아이콘 </> 또는 앱 추가 → 웹을 선택합니다.
2. 앱 닉네임 예: set-game. 앱 등록을 누릅니다.
3. Firebase Hosting은 선택하지 않아도 됩니다. 화면은 GitHub Pages로 배포합니다.
4. firebaseConfig 객체를 확인합니다. 프로젝트 설정 → 일반 → 내 앱에서도 다시 볼 수 있습니다.

### 3. Realtime Database 만들기
1. Build(빌드) → Realtime Database를 선택합니다. Firestore Database와 다른 메뉴입니다.
2. 데이터베이스 만들기를 누릅니다.
3. 원하는 위치를 선택합니다. 한국 수업용이면 선택 가능한 아시아 위치를 고려하세요.
4. 잠금 모드로 생성합니다.
5. 데이터 화면 위쪽의 데이터베이스 URL을 복사합니다. https://...firebasedatabase.app 또는 https://...firebaseio.com 형식입니다.

### 4. 익명 로그인 켜기
1. Build → Authentication → 시작하기로 들어갑니다.
2. Sign-in method(로그인 방법)에서 Anonymous(익명)를 선택합니다.
3. 사용 설정 → 저장을 누릅니다.
학생에게 Google 계정을 받는 기능이 아니라 각 브라우저를 구분하는 자동 인증입니다.

### 5. 데이터베이스 규칙 게시
1. Realtime Database → Rules(규칙)를 엽니다.
2. database.rules.json을 메모장으로 열고 전체 내용을 복사합니다.
3. 콘솔의 기존 규칙 전체를 해당 내용으로 바꾸고 Publish(게시)를 누릅니다.
이미 다른 앱이 쓰는 프로젝트라면 규칙 전체를 바꾸지 마세요. 이 게임 전용 새 프로젝트를 쓰거나 기존 규칙과 통합해야 합니다.

### 6. 설정값 붙여 넣기
firebase-config.js를 메모장으로 열어 빈 문자열을 본인 웹 앱의 값으로 채웁니다.

```javascript
window.FIREBASE_CONFIG = {
  apiKey: "Firebase 웹 앱의 apiKey",
  authDomain: "Firebase 웹 앱의 authDomain",
  databaseURL: "Realtime Database 화면에서 복사한 URL",
  projectId: "Firebase 웹 앱의 projectId",
  appId: "Firebase 웹 앱의 appId"
};
```

위 내용은 형식 예시이며 실제 값으로 바꿔야 합니다. 따옴표·쉼표·중괄호를 유지하세요.
콘솔의 firebaseConfig에 databaseURL이 없으면 데이터베이스 화면에서 복사해 추가합니다.
웹 앱의 설정 객체만 사용하세요. 서비스 계정 JSON이나 private_key는 사용하지 않습니다.

## GitHub에 새 버전 올리기
1. 압축을 풉니다.
2. 기존 set-game 저장소의 Code → Add file → Upload files로 들어갑니다.
3. index.html, app.mjs, core.mjs, firebase-config.js, solo.html을 함께 올립니다.
4. 파일들은 저장소 최상위에 나란히 있어야 합니다. 바깥 폴더나 ZIP 자체를 올리지 않습니다.
5. Commit changes를 누릅니다.
6. 이미 Pages를 켰다면 같은 주소에 새 버전이 반영됩니다.
7. 처음이면 Settings → Pages → Source: Deploy from a branch → main → /(root) → Save로 설정합니다.
8. 배포가 끝나면 Visit site로 접속합니다. 반영에는 최대 10분이 걸릴 수 있습니다.
실시간 버전은 index.html을 더블클릭하는 방식이 아니라 GitHub Pages의 HTTPS 주소로 여세요.

## 수업 전 확인
1. 교사 PC에서 방을 만들고 참여코드를 기록합니다.
2. 학생 기기 두 대에서 코드와 별명으로 입장합니다.
3. 교사 PC의 게임 창을 닫습니다.
4. 학생 기기에서 오답을 제출하면 바로 이유가 표시되는지 확인합니다.
5. 정답을 제출하면 점수가 올라가고 두 기기가 같은 다음 판으로 이동하는지 확인합니다.
6. 두 학생이 같은 판에 제출해도 한 명만 점수를 얻는지 확인합니다.
7. 마지막 판 이후 자동으로 최종 결과가 나오는지 확인합니다.

## 문제 해결
- 접근 거부: 새 규칙을 올바른 Realtime Database에 게시했는지 확인합니다.
- 예전 방 안내: 새 게임방을 만듭니다.
- 익명 로그인 오류: Authentication → Anonymous를 켭니다.
- 연결 대기: 인터넷 연결을 확인합니다. 정답은 서버 승인 전에는 점수로 확정하지 않습니다.
- 예전 화면 표시: GitHub 배포 완료 후 새로고침합니다.

## 파일
index.html(화면), app.mjs(실시간 연결), core.mjs(카드 논리), firebase-config.js(연결 설정), solo.html(기존 연습), database.rules.json(규칙), README.md(안내).

## 검증 범위
교사 퇴장 후 23명 입장·동시 제출 시 1점만 부여·10판 자동 완주, 정답 카드판 2,000개 생성, 규칙 표현식의 오답·비참여자·미래 판·중복 제출 거부를 로컬 모의 환경에서 확인했습니다. Firebase 실제 서비스·공식 규칙 에뮬레이터·실제 태블릿 화면 검증은 아직 수행하지 않았습니다.

## 공식 참고
- https://firebase.google.com/docs/database/web/read-and-write
- https://firebase.google.com/docs/database/security/rules-conditions
- https://firebase.google.com/docs/auth/web/anonymous-auth

독립 제작 교육용 게임이며 공식 SET 제품과 관계없습니다.
