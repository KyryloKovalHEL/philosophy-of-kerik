const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();

const menuButton = document.getElementById('menuButton');
const mainNav = document.getElementById('mainNav');
if (menuButton && mainNav) {
  const closeMenu = () => {
    mainNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
  };
  menuButton.addEventListener('click', () => {
    const open = mainNav.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  mainNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
}

const articleFilter = document.getElementById('articleFilter');
if (articleFilter) {
  const cards = [...document.querySelectorAll('.archive-card')];
  const applyFilter = () => {
    const query = articleFilter.value.trim().toLocaleLowerCase();
    for (const card of cards) {
      const haystack = `${card.dataset.title || ''} ${card.dataset.tags || ''}`;
      card.classList.toggle('is-hidden', Boolean(query) && !haystack.includes(query));
    }
  };
  articleFilter.addEventListener('input', applyFilter);
}

const searchForm = document.getElementById('siteSearchForm');
const searchInput = document.getElementById('siteSearch');
const searchStatus = document.getElementById('searchStatus');
const searchResults = document.getElementById('searchResults');
if (searchForm && searchInput && searchStatus && searchResults) {
  let searchIndexPromise;
  const getIndex = () => {
    if (!searchIndexPromise) {
      const source = searchInput.dataset.index;
      searchIndexPromise = fetch(source, { credentials: 'same-origin' }).then(response => {
        if (!response.ok) throw new Error(`Search index unavailable: ${response.status}`);
        return response.json();
      });
    }
    return searchIndexPromise;
  };

  const normalize = value => String(value || '').toLocaleLowerCase().normalize('NFKD');
  const clearResults = () => searchResults.replaceChildren();

  const renderResults = async query => {
    const trimmed = query.trim();
    const params = new URLSearchParams(location.search);
    if (trimmed) params.set('q', trimmed); else params.delete('q');
    const nextUrl = `${location.pathname}${params.toString() ? `?${params}` : ''}${location.hash}`;
    history.replaceState(null, '', nextUrl);
    clearResults();
    if (!trimmed) {
      searchStatus.textContent = searchStatus.dataset.empty || '';
      return;
    }

    try {
      const records = await getIndex();
      const words = normalize(trimmed).split(/\s+/).filter(Boolean);
      const ranked = records.map(record => {
        const title = normalize(record.title);
        const excerpt = normalize(record.excerpt);
        const tags = normalize((record.tags || []).join(' '));
        const type = normalize(record.type);
        let score = 0;
        for (const word of words) {
          if (title === word) score += 12;
          if (title.includes(word)) score += 7;
          if (tags.includes(word)) score += 4;
          if (excerpt.includes(word)) score += 2;
          if (type.includes(word)) score += 1;
        }
        return { record, score };
      }).filter(item => item.score > 0).sort((a, b) => b.score - a.score || a.record.title.localeCompare(b.record.title)).slice(0, 30);

      if (!ranked.length) {
        searchStatus.textContent = searchStatus.dataset.none || '';
        return;
      }
      searchStatus.textContent = `${ranked.length}`;
      const fragment = document.createDocumentFragment();
      for (const { record } of ranked) {
        const article = document.createElement('article');
        article.className = 'search-result';
        const link = document.createElement('a');
        link.href = record.url;
        const type = document.createElement('small');
        type.textContent = record.type;
        const title = document.createElement('h2');
        title.textContent = record.title;
        const excerpt = document.createElement('p');
        excerpt.textContent = record.excerpt;
        link.append(type, title, excerpt);
        if (Array.isArray(record.tags) && record.tags.length) {
          const tagList = document.createElement('div');
          tagList.className = 'tag-list';
          for (const tag of record.tags) {
            const span = document.createElement('span');
            span.textContent = tag;
            tagList.append(span);
          }
          link.append(tagList);
        }
        article.append(link);
        fragment.append(article);
      }
      searchResults.append(fragment);
    } catch (error) {
      console.error(error);
      searchStatus.textContent = searchStatus.dataset.none || 'Search unavailable.';
    }
  };

  searchForm.addEventListener('submit', event => {
    event.preventDefault();
    void renderResults(searchInput.value);
  });
  let debounce;
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce);
    debounce = setTimeout(() => void renderResults(searchInput.value), 180);
  });
  const initialQuery = new URLSearchParams(location.search).get('q') || '';
  if (initialQuery) {
    searchInput.value = initialQuery;
    void renderResults(initialQuery);
  }
}

const progressBar = document.getElementById('readingProgressBar');
const chapterSections = [...document.querySelectorAll('.reader-page[data-chapter]')];
const previousChapter = document.getElementById('readerPrev');
const nextChapter = document.getElementById('readerNext');
if (progressBar || chapterSections.length) {
  let ticking = false;
  const updateReaderState = () => {
    ticking = false;
    if (progressBar) {
      const root = document.documentElement;
      const scrollable = Math.max(1, root.scrollHeight - root.clientHeight);
      const progress = Math.min(1, Math.max(0, root.scrollTop / scrollable));
      progressBar.style.width = `${(progress * 100).toFixed(2)}%`;
    }
    if (chapterSections.length && previousChapter && nextChapter) {
      const marker = window.scrollY + Math.min(220, window.innerHeight * 0.28);
      let currentIndex = 0;
      for (let i = 0; i < chapterSections.length; i += 1) {
        if (chapterSections[i].offsetTop <= marker) currentIndex = i;
        else break;
      }
      const previous = chapterSections[currentIndex - 1];
      const next = chapterSections[currentIndex + 1];
      if (previous) {
        previousChapter.href = `#${previous.id}`;
        previousChapter.hidden = false;
      } else {
        previousChapter.hidden = true;
      }
      if (next) {
        nextChapter.href = `#${next.id}`;
        nextChapter.hidden = false;
      } else {
        nextChapter.hidden = true;
      }
    }
  };
  const requestUpdate = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(updateReaderState);
    }
  };
  addEventListener('scroll', requestUpdate, { passive: true });
  addEventListener('resize', requestUpdate);
  updateReaderState();
}
