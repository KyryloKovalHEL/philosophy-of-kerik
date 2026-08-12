const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const button = document.getElementById('menuButton');
const nav = document.getElementById('mainNav');
if (button && nav) {
  const closeMenu = () => {
    nav.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
  };
  button.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    button.setAttribute('aria-expanded', String(open));
  });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
}

const authorPhoto = document.getElementById('authorPhoto');
if (authorPhoto) {
  const chunks = [1, 2, 3, 4, 5].map(index =>
    fetch(`/assets/author-photo-${index}.txt`).then(response => {
      if (!response.ok) throw new Error('Author photo asset unavailable');
      return response.text();
    })
  );

  Promise.all(chunks).then(parts => {
    const image = new Image();
    image.alt = '';
    image.width = 320;
    image.height = 320;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.style.width = '100%';
    image.style.height = '100%';
    image.style.objectFit = 'cover';
    image.style.display = 'block';
    image.src = `data:image/jpeg;base64,${parts.join('').replace(/\s+/g, '')}`;
    authorPhoto.textContent = '';
    authorPhoto.style.overflow = 'hidden';
    authorPhoto.appendChild(image);
  }).catch(() => {});
}
