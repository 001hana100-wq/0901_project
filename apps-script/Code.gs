/**
 * 민준의 기록 - Google Apps Script 인증 API
 *
 * 1. setupAuth()를 Apps Script 편집기에서 한 번 직접 실행합니다.
 * 2. 웹 앱으로 배포합니다. (실행 사용자: 나, 액세스: 모든 사용자)
 * 3. 프런트엔드에서는 /exec URL로 text/plain POST 요청을 보냅니다.
 *
 * 주의: Google Sheets 기반 자체 인증은 소규모 프로토타입용입니다.
 * 공개 서비스는 Firebase Authentication 등 전문 인증 서비스 사용을 권장합니다.
 */

const CONFIG = Object.freeze({
  spreadsheetId: '1nm3hx26G3UhYdyFjsJAnvf3YhqgejMr98xaJ694EJp8',
  usersSheet: 'Users',
  sessionsSheet: 'Sessions',
  sessionHours: 24 * 7,
  hashRounds: 4000,
  maxLoginAttempts: 5,
  loginBlockSeconds: 600,
});

const USER_HEADERS = [
  'id', 'email', 'name', 'passwordHash', 'salt',
  'status', 'createdAt', 'lastLoginAt',
];

const SESSION_HEADERS = [
  'tokenHash', 'userId', 'expiresAt', 'createdAt', 'revoked',
];

/** 최초 한 번 Apps Script 편집기에서 직접 실행하세요. */
function setupAuth() {
  ensureAuthReady_();
  return '인증 시트와 서버 설정이 준비되었습니다.';
}

/** 초기 설정을 놓쳐도 첫 API 요청에서 자동으로 준비합니다. */
function ensureAuthReady_() {
  const spreadsheet = SpreadsheetApp.openById(CONFIG.spreadsheetId);
  ensureSheet_(spreadsheet, CONFIG.usersSheet, USER_HEADERS);
  ensureSheet_(spreadsheet, CONFIG.sessionsSheet, SESSION_HEADERS);

  const properties = PropertiesService.getScriptProperties();
  if (!properties.getProperty('AUTH_PEPPER')) {
    properties.setProperty('AUTH_PEPPER', randomToken_());
  }
}

/** 브라우저에서 API 상태 확인용 */
function doGet() {
  return json_({
    success: true,
    service: 'minjun-blog-auth',
    message: 'Auth API is running.',
  });
}

/** signup, login, me, logout 요청 처리 */
function doPost(e) {
  try {
    ensureAuthReady_();
    const body = parseBody_(e);
    const action = String(body.action || '').trim();

    if (action === 'signup') return signup_(body);
    if (action === 'login') return login_(body);
    if (action === 'me') return me_(body);
    if (action === 'logout') return logout_(body);

    return json_({ success: false, message: '지원하지 않는 요청입니다.' });
  } catch (error) {
    console.error(error);
    return json_({
      success: false,
      code: 'SERVER_ERROR',
      message: '서버 설정을 확인해주세요.',
    });
  }
}

function signup_(body) {
  const name = String(body.name || '').trim();
  const email = normalizeEmail_(body.email);
  const password = String(body.password || '');

  if (name.length < 2 || name.length > 30) {
    return json_({ success: false, message: '이름은 2~30자로 입력해주세요.' });
  }
  if (!isValidEmail_(email)) {
    return json_({ success: false, message: '올바른 이메일을 입력해주세요.' });
  }
  if (!isValidPassword_(password)) {
    return json_({
      success: false,
      message: '비밀번호는 영문과 숫자를 포함한 8자 이상이어야 합니다.',
    });
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const usersSheet = getSheet_(CONFIG.usersSheet);
    if (findUserByEmail_(usersSheet, email)) {
      return json_({ success: false, message: '이미 가입된 이메일입니다.' });
    }

    const salt = randomToken_();
    const userId = Utilities.getUuid();
    const passwordHash = hashPassword_(password, salt);
    const now = new Date();

    usersSheet.appendRow([
      userId,
      email,
      name,
      passwordHash,
      salt,
      'active',
      now,
      '',
    ]);

    const session = createSession_(userId);
    return json_({
      success: true,
      message: '회원가입이 완료되었습니다.',
      token: session.token,
      expiresAt: session.expiresAt,
      user: { id: userId, email: email, name: name },
    });
  } finally {
    lock.releaseLock();
  }
}

function login_(body) {
  const email = normalizeEmail_(body.email);
  const password = String(body.password || '');

  if (!isValidEmail_(email) || !password) {
    return invalidLogin_();
  }

  const cache = CacheService.getScriptCache();
  const attemptKey = 'login:' + shortHash_(email);
  const attempts = Number(cache.get(attemptKey) || 0);

  if (attempts >= CONFIG.maxLoginAttempts) {
    return json_({
      success: false,
      message: '로그인 시도가 너무 많습니다. 10분 뒤 다시 시도해주세요.',
    });
  }

  const usersSheet = getSheet_(CONFIG.usersSheet);
  const user = findUserByEmail_(usersSheet, email);
  const valid = user &&
    user.status === 'active' &&
    safeEqual_(hashPassword_(password, user.salt), user.passwordHash);

  if (!valid) {
    cache.put(
      attemptKey,
      String(attempts + 1),
      CONFIG.loginBlockSeconds
    );
    return invalidLogin_();
  }

  cache.remove(attemptKey);
  usersSheet.getRange(user.rowNumber, 8).setValue(new Date());

  const session = createSession_(user.id);
  return json_({
    success: true,
    message: '로그인되었습니다.',
    token: session.token,
    expiresAt: session.expiresAt,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

function me_(body) {
  const session = findValidSession_(body.token);
  if (!session) {
    return json_({ success: false, message: '로그인이 필요합니다.' });
  }

  const user = findUserById_(getSheet_(CONFIG.usersSheet), session.userId);
  if (!user || user.status !== 'active') {
    return json_({ success: false, message: '사용자를 찾을 수 없습니다.' });
  }

  return json_({
    success: true,
    user: { id: user.id, email: user.email, name: user.name },
  });
}

function logout_(body) {
  const token = String(body.token || '');
  if (!token) return json_({ success: true, message: '로그아웃되었습니다.' });

  const tokenHash = hashToken_(token);
  const sheet = getSheet_(CONFIG.sessionsSheet);
  const rows = getDataRows_(sheet);

  for (let index = 0; index < rows.length; index += 1) {
    if (safeEqual_(String(rows[index][0]), tokenHash)) {
      sheet.getRange(index + 2, 5).setValue(true);
      break;
    }
  }

  return json_({ success: true, message: '로그아웃되었습니다.' });
}

function createSession_(userId) {
  const token = randomToken_();
  const now = new Date();
  const expiresAt = new Date(
    now.getTime() + CONFIG.sessionHours * 60 * 60 * 1000
  );

  getSheet_(CONFIG.sessionsSheet).appendRow([
    hashToken_(token),
    userId,
    expiresAt,
    now,
    false,
  ]);

  return { token: token, expiresAt: expiresAt.toISOString() };
}

function findValidSession_(rawToken) {
  const token = String(rawToken || '');
  if (!token) return null;

  const tokenHash = hashToken_(token);
  const rows = getDataRows_(getSheet_(CONFIG.sessionsSheet));
  const now = Date.now();

  for (let index = rows.length - 1; index >= 0; index -= 1) {
    const row = rows[index];
    const revoked = row[4] === true || String(row[4]).toLowerCase() === 'true';
    const expiresAt = new Date(row[2]).getTime();

    if (!revoked && expiresAt > now && safeEqual_(String(row[0]), tokenHash)) {
      return { userId: String(row[1]), expiresAt: new Date(row[2]) };
    }
  }
  return null;
}

function findUserByEmail_(sheet, email) {
  return findUser_(sheet, function (row) {
    return normalizeEmail_(row[1]) === email;
  });
}

function findUserById_(sheet, id) {
  return findUser_(sheet, function (row) {
    return String(row[0]) === String(id);
  });
}

function findUser_(sheet, predicate) {
  const rows = getDataRows_(sheet);
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (predicate(row)) {
      return {
        id: String(row[0]),
        email: String(row[1]),
        name: String(row[2]),
        passwordHash: String(row[3]),
        salt: String(row[4]),
        status: String(row[5]),
        rowNumber: index + 2,
      };
    }
  }
  return null;
}

function hashPassword_(password, salt) {
  const pepper = getPepper_();
  let value = String(password) + ':' + String(salt) + ':' + pepper;

  for (let round = 0; round < CONFIG.hashRounds; round += 1) {
    const bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      value,
      Utilities.Charset.UTF_8
    );
    value = Utilities.base64EncodeWebSafe(bytes);
  }
  return value;
}

function hashToken_(token) {
  const bytes = Utilities.computeHmacSha256Signature(
    String(token),
    getPepper_()
  );
  return Utilities.base64EncodeWebSafe(bytes);
}

function shortHash_(value) {
  return hashToken_(value).slice(0, 24);
}

function getPepper_() {
  const pepper = PropertiesService
    .getScriptProperties()
    .getProperty('AUTH_PEPPER');

  if (!pepper) {
    throw new Error('setupAuth()를 먼저 실행해주세요.');
  }
  return pepper;
}

function randomToken_() {
  return Utilities.getUuid() + Utilities.getUuid();
}

function safeEqual_(left, right) {
  const a = String(left || '');
  const b = String(right || '');
  if (a.length !== b.length) return false;

  let difference = 0;
  for (let index = 0; index < a.length; index += 1) {
    difference |= a.charCodeAt(index) ^ b.charCodeAt(index);
  }
  return difference === 0;
}

function normalizeEmail_(value) {
  return String(value || '').trim().toLowerCase();
}

function isValidEmail_(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPassword_(password) {
  return password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

function invalidLogin_() {
  return json_({
    success: false,
    message: '이메일 또는 비밀번호를 확인해주세요.',
  });
}

function parseBody_(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function getSheet_(name) {
  const sheet = SpreadsheetApp
    .openById(CONFIG.spreadsheetId)
    .getSheetByName(name);
  if (!sheet) throw new Error(name + ' 시트를 찾을 수 없습니다.');
  return sheet;
}

function getDataRows_(sheet) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  return sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
}

function ensureSheet_(spreadsheet, name, headers) {
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) sheet = spreadsheet.insertSheet(name);

  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return sheet;
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
