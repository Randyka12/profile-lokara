// ===== Header: bayangan saat di-scroll
const header = document.querySelector('.ud-header');
const updateHeaderShadow = () => {
  if (!header) return;
  header.classList.toggle('shadow-2', window.scrollY > 10);
};
window.addEventListener('scroll', updateHeaderShadow, { passive: true });
updateHeaderShadow();

// ===== Header: menu mobile
const navbarToggler = document.querySelector('#navbarToggler');
const navbarCollapse = document.querySelector('#navbarCollapse');

if (navbarToggler && navbarCollapse) {
  const setMenuOpen = (isOpen) => {
    navbarCollapse.classList.toggle('hidden', !isOpen);
    navbarToggler.setAttribute('aria-expanded', String(isOpen));
    navbarToggler.classList.toggle('navbarTogglerActive', isOpen);
  };

  navbarToggler.addEventListener('click', () => {
    setMenuOpen(navbarCollapse.classList.contains('hidden'));
  });

  navbarCollapse.querySelectorAll('a').forEach((link) =>
    link.addEventListener('click', () => setMenuOpen(false))
  );
}
