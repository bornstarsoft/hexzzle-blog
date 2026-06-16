const nav = document.querySelector('.site-nav');

if (nav) {
  const currentPath = window.location.pathname;
  nav.querySelectorAll('a').forEach((link) => {
    if (link.pathname === currentPath) {
      link.setAttribute('aria-current', 'page');
    }
  });
}
