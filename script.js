const toggle = document.getElementById('theme-toggle');

function updateIcon() {
  toggle.textContent = document.body.classList.contains('dark') ? '☀️' : '🌙';
}

toggle.addEventListener('click', () => {
  document.body.classList.toggle('dark');

  if (document.body.classList.contains('dark')) {
    localStorage.setItem('theme', 'dark');
  } else {
    localStorage.setItem('theme', 'light');
  }

  updateIcon();
});

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark');
}

updateIcon();