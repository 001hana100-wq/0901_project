const AUTH_API_URL = 'https://script.google.com/macros/s/AKfycbzSTzHv2Hb5OBR6nx7pTYArPVg14jeUdAHqE246afggBZ9QHwpD5RP52YjcyLdoGf4/exec';

const root = document.documentElement;
const themeButton = document.querySelector('.theme-toggle');
root.dataset.theme = localStorage.getItem('blog-theme') || 'light';
themeButton?.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('blog-theme', root.dataset.theme);
});

const menuButton = document.querySelector('.menu-toggle');
const mobileNav = document.querySelector('.mobile-nav');
menuButton?.addEventListener('click', () => {
  const open = mobileNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.textContent = open ? '×' : '☰';
});

document.querySelectorAll('[data-year]').forEach((element) => {
  element.textContent = new Date().getFullYear();
});

const search = document.querySelector('[data-search]');
search?.addEventListener('input', () => {
  const query = search.value.trim().toLowerCase();
  let visibleCount = 0;
  document.querySelectorAll('.post-item').forEach((item) => {
    const visible = item.dataset.searchText.toLowerCase().includes(query);
    item.hidden = !visible;
    if (visible) visibleCount += 1;
  });
  document.querySelector('.empty-message').hidden = visibleCount !== 0;
});

document.querySelector('[data-newsletter]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  event.currentTarget.nextElementSibling.textContent =
    '구독 신청이 완료되었습니다. 다음 편지에서 만나요!';
  event.currentTarget.reset();
});

async function authRequest(action, payload = {}) {
  const response = await fetch(AUTH_API_URL, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  if (!response.ok) throw new Error('인증 서버 응답 오류');
  return response.json();
}

function saveSession(result) {
  localStorage.setItem('blog-session', result.token);
  localStorage.setItem('blog-user', JSON.stringify(result.user));
}

function clearSession() {
  localStorage.removeItem('blog-session');
  localStorage.removeItem('blog-user');
}

document.querySelectorAll('[data-auth-form]').forEach((form) => {
  const passwordInput = form.querySelector('[name="password"]');
  if (passwordInput) {
    passwordInput.minLength = 8;
    if (form.dataset.authForm === 'signup') {
      passwordInput.placeholder = '영문·숫자 포함 8자 이상';
    }
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const action = form.dataset.authForm;
    const data = Object.fromEntries(new FormData(form));
    const message = form.querySelector('.auth-message');
    const submitButton = form.querySelector('[type="submit"]');

    message.hidden = false;
    message.textContent = '처리 중입니다...';
    submitButton.disabled = true;

    try {
      const result = await authRequest(action, data);
      if (!result.success) {
        message.textContent = result.message || '요청을 처리하지 못했습니다.';
        return;
      }
      saveSession(result);
      message.textContent = result.message;
      window.setTimeout(() => {
        location.href = action === 'signup' ? './profile.html' : './index.html';
      }, 650);
    } catch (error) {
      console.error(error);
      message.textContent =
        '인증 서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
    } finally {
      submitButton.disabled = false;
    }
  });
});

const authLink = document.querySelector('.auth-link');
const sessionToken = localStorage.getItem('blog-session');
if (authLink && sessionToken) {
  authLink.textContent = '로그아웃';
  authLink.href = '#logout';
  authLink.addEventListener('click', async (event) => {
    event.preventDefault();
    authLink.textContent = '로그아웃 중...';
    try {
      await authRequest('logout', { token: sessionToken });
    } catch (error) {
      console.error(error);
    } finally {
      clearSession();
      location.href = './index.html';
    }
  });

  authRequest('me', { token: sessionToken })
    .then((result) => {
      if (!result.success) {
        clearSession();
        authLink.textContent = '로그인';
        authLink.href = './login.html';
      }
    })
    .catch(() => {
      // 일시적인 네트워크 장애에는 로컬 세션을 삭제하지 않습니다.
    });
}

document.querySelector('[data-write-form]')?.addEventListener('submit', (event) => {
  event.preventDefault();
  const title = event.currentTarget.querySelector('[name="title"]').value.trim();
  const status = document.querySelector('[data-write-status]');
  if (!title) {
    status.textContent = '제목을 입력해주세요.';
    return;
  }
  localStorage.setItem(
    'blog-draft',
    JSON.stringify(Object.fromEntries(new FormData(event.currentTarget)))
  );
  status.textContent = '글이 발행되었습니다. 글 목록으로 이동합니다.';
  window.setTimeout(() => { location.href = './index.html'; }, 700);
});

document.querySelector('[data-save-draft]')?.addEventListener('click', () => {
  document.querySelector('[data-write-status]').textContent = '임시 저장했습니다.';
});
