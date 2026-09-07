const root = document.documentElement;
const header = document.querySelector("[data-header]");
const menuButton = document.querySelector(".menu-toggle");
const navList = document.querySelector("[data-nav-list]");
const navLinks = [...document.querySelectorAll(".nav-link")];
const themeButton = document.querySelector(".theme-toggle");
const copyButton = document.querySelector("[data-copy-email]");
const copyStatus = document.querySelector(".copy-status");
const yearElement = document.querySelector("[data-current-year]");

const readSavedTheme = () => {
  try {
    return localStorage.getItem("profile-theme");
  } catch {
    return null;
  }
};

const setTheme = (theme) => {
  root.dataset.theme = theme;
  if (themeButton) {
    themeButton.setAttribute("aria-label", theme === "dark" ? "라이트 테마로 전환" : "다크 테마로 전환");
  }
};

const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
setTheme(readSavedTheme() || systemTheme);

themeButton?.addEventListener("click", () => {
  const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
  setTheme(nextTheme);
  try {
    localStorage.setItem("profile-theme", nextTheme);
  } catch {
    // 저장소가 제한된 환경에서도 테마 전환 자체는 유지합니다.
  }
});

const closeMenu = () => {
  if (!menuButton || !navList) return;
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.querySelector(".sr-only").textContent = "메뉴 열기";
  navList.classList.remove("is-open");
};

menuButton?.addEventListener("click", () => {
  const willOpen = menuButton.getAttribute("aria-expanded") !== "true";
  menuButton.setAttribute("aria-expanded", String(willOpen));
  menuButton.querySelector(".sr-only").textContent = willOpen ? "메뉴 닫기" : "메뉴 열기";
  navList?.classList.toggle("is-open", willOpen);
});

navLinks.forEach((link) => link.addEventListener("click", closeMenu));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});

document.addEventListener("click", (event) => {
  if (!navList?.classList.contains("is-open")) return;
  if (!navList.contains(event.target) && !menuButton?.contains(event.target)) closeMenu();
});

const updateHeader = () => header?.classList.toggle("is-scrolled", window.scrollY > 16);
updateHeader();
window.addEventListener("scroll", updateHeader, { passive: true });

const localNavLinks = navLinks.filter((link) => link.getAttribute("href")?.startsWith("#"));
const sections = [...document.querySelectorAll("main section[id]")];
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    localNavLinks.forEach((link) => {
      link.classList.toggle("is-active", link.getAttribute("href") === `#${entry.target.id}`);
    });
  });
}, { rootMargin: "-35% 0px -55%", threshold: 0 });
if (localNavLinks.length) sections.forEach((section) => sectionObserver.observe(section));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("is-visible");
    observer.unobserve(entry.target);
  });
}, { threshold: 0.12 });

document.querySelectorAll("[data-reveal]").forEach((element) => revealObserver.observe(element));

copyButton?.addEventListener("click", async () => {
  const email = copyButton.dataset.copyEmail;
  try {
    await navigator.clipboard.writeText(email);
    copyStatus.textContent = "이메일 주소를 복사했습니다.";
  } catch {
    copyStatus.textContent = `이메일: ${email}`;
  }
  window.setTimeout(() => { copyStatus.textContent = ""; }, 3000);
});

if (yearElement) yearElement.textContent = new Date().getFullYear();
