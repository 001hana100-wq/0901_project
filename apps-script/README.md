# Google Apps Script 인증 API 설정

## 1. 코드 설치

Google 스프레드시트에서 **확장 프로그램 → Apps Script**를 열고 `Code.gs`의 내용을
붙여 넣습니다.

기존 Apps Script 파일에 `CONFIG`라는 전역 상수가 있어도 충돌하지 않도록 인증
설정에는 `BLOG_AUTH_CONFIG`라는 고유한 이름을 사용합니다. 동일한 인증 코드를
여러 파일에 중복해서 붙여 넣지는 마세요.

## 2. 초기 설정

함수 선택 목록에서 `setupAuth`를 선택해 한 번 실행하고 Google 권한을 승인합니다.
다음 시트가 자동 생성됩니다.

- `Users`: 사용자와 암호화된 비밀번호 정보
- `Sessions`: 로그인 세션 토큰의 해시와 만료 시각

`AUTH_PEPPER`는 Apps Script의 Script Properties에 자동 생성되며, 시트나 GitHub에
저장되지 않습니다.

`setupAuth` 실행을 놓친 경우에도 첫 API 요청이 시트와 설정을 자동 생성합니다.
다만 최초 권한 승인을 위해 편집기에서 직접 실행하는 방식을 권장합니다.

## 3. 웹 앱 배포

1. **배포 → 새 배포 → 웹 앱**을 선택합니다.
2. 실행 사용자는 **나**, 액세스 권한은 테스트 시 **모든 사용자**로 설정합니다.
3. 배포 후 `/exec`로 끝나는 URL을 복사합니다.

## 4. 프런트엔드 요청 형식

Apps Script의 불필요한 CORS 사전 요청을 피하기 위해 `Content-Type`을
`text/plain;charset=utf-8`로 사용합니다.

```js
const response = await fetch(APPS_SCRIPT_URL, {
  method: 'POST',
  redirect: 'follow',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    action: 'signup', // login, me, logout
    name: '김민준',
    email: 'hello@example.com',
    password: 'example1234',
  }),
});

const result = await response.json();
```

배포 전에는 프런트엔드에 URL을 넣을 수 없습니다. `/exec` URL이 준비되면
`login.html`, `signup.html`, `js/main.js`를 이 API에 연결합니다.

## 보안 범위

이 구현은 비밀번호 평문 저장을 피하고 salt, 서버 측 pepper, 반복 해시, 로그인
시도 제한, 만료·폐기 가능한 세션을 사용합니다. 그래도 Google Sheets는 전문 인증
데이터베이스가 아니므로 소규모 학습·프로토타입 용도로만 사용하세요. 공개 서비스는
Firebase Authentication 또는 Google Identity 사용을 권장합니다.
