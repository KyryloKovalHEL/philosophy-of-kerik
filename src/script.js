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


// Google Analytics 4: load only after the visitor explicitly accepts analytics.
(() => {
  'use strict';
  const measurementId = 'G-ZSN6NWV8KD';
  const storageKey = 'kerik-analytics-consent-v1';
  const language = document.documentElement.lang;
  const copy = {
    uk: {
      title: 'Аналітичні cookies',
      body: 'Ми використовуємо Google Analytics лише за вашої згоди, щоб розуміти відвідуваність та використання сайту. Google може отримувати дані переглядів і встановлювати аналітичні cookies строком до 2 років.',
      privacy: 'Політика конфіденційності',
      accept: 'Прийняти',
      reject: 'Відхилити',
      settings: 'Налаштування cookies'
    },
    en: {
      title: 'Analytics cookies',
      body: 'With your permission, we use Google Analytics to understand visits and website usage. Google may receive page-view data and set analytics cookies lasting up to 2 years.',
      privacy: 'Privacy policy',
      accept: 'Accept',
      reject: 'Reject',
      settings: 'Cookie settings'
    },
    fi: {
      title: 'Analytiikkaevästeet',
      body: 'Käytämme Google Analyticsia vain suostumuksellasi sivuston kävijämäärien ja käytön mittaamiseen. Google voi vastaanottaa sivukatselutietoja ja asettaa analytiikkaevästeitä, joiden voimassaoloaika on enintään 2 vuotta.',
      privacy: 'Tietosuojakäytäntö',
      accept: 'Hyväksy',
      reject: 'Hylkää',
      settings: 'Evästeasetukset'
    },
    sv: {
      title: 'Analyskakor',
      body: 'Med ditt samtycke använder vi Google Analytics för att förstå besök och hur webbplatsen används. Google kan få uppgifter om sidvisningar och lagra analyskakor i upp till 2 år.',
      privacy: 'Integritetspolicy',
      accept: 'Godkänn',
      reject: 'Avvisa',
      settings: 'Cookieinställningar'
    }
  }[language] || {
    title: 'Analytics cookies',
    body: 'With your permission, we use Google Analytics to understand visits and website usage. Google may receive page-view data and set analytics cookies lasting up to 2 years.',
    privacy: 'Privacy policy',
    accept: 'Accept',
    reject: 'Reject',
    settings: 'Cookie settings'
  };

  let choice = null;
  try { choice = localStorage.getItem(storageKey); } catch (_) { /* Storage may be unavailable. */ }

  function enableAnalytics() {
    if (window.__kerikAnalyticsEnabled) return;
    window.__kerikAnalyticsEnabled = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    // No advertising consent is requested or granted by this website.
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('config', measurementId);
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(measurementId);
    document.head.appendChild(tag);
  }

  function eraseAnalyticsCookies() {
    document.cookie.split(';').forEach(entry => {
      const name = entry.split('=')[0].trim();
      if (name !== '_ga' && !name.startsWith('_ga_')) return;
      for (const domain of ['', '; domain=philosophyofkerik.com', '; domain=.philosophyofkerik.com']) {
        document.cookie = name + '=; path=/; max-age=0; SameSite=Lax' + domain;
      }
    });
  }

  if (choice === 'accepted') enableAnalytics();

  const panel = document.createElement('section');
  panel.className = 'kerik-consent-banner';
  panel.setAttribute('role', 'region');
  panel.setAttribute('aria-label', copy.title);
  panel.hidden = true;
  const heading = document.createElement('strong');
  heading.textContent = copy.title;
  const description = document.createElement('p');
  description.textContent = copy.body + ' ';
  const privacy = document.createElement('a');
  privacy.href = (language === 'uk' ? '/' : '/' + (['en', 'fi', 'sv'].includes(language) ? language : 'en') + '/') + 'privacy/';
  privacy.textContent = copy.privacy;
  description.appendChild(privacy);
  const buttons = document.createElement('div');
  buttons.className = 'kerik-consent-buttons';

  function setChoice(next) {
    const wasAccepted = choice === 'accepted';
    choice = next;
    try { localStorage.setItem(storageKey, next); } catch (_) { /* Treat as session-only. */ }
    panel.hidden = true;
    if (next === 'accepted') {
      enableAnalytics();
    } else if (wasAccepted) {
      if (typeof window.gtag === 'function') {
        window.gtag('consent', 'update', { analytics_storage: 'denied' });
      }
      eraseAnalyticsCookies();
      window.location.reload();
    }
  }

  const reject = document.createElement('button');
  reject.type = 'button';
  reject.textContent = copy.reject;
  reject.addEventListener('click', () => setChoice('rejected'));
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.textContent = copy.accept;
  accept.addEventListener('click', () => setChoice('accepted'));
  buttons.append(reject, accept);
  panel.append(heading, description, buttons);
  document.body.appendChild(panel);

  const settings = document.createElement('button');
  settings.type = 'button';
  settings.className = 'kerik-cookie-settings';
  settings.textContent = copy.settings;
  settings.addEventListener('click', () => {
    panel.hidden = false;
    reject.focus();
  });
  const footer = document.querySelector('footer .footer-links') || document.querySelector('footer');
  if (footer) footer.appendChild(settings);
  if (choice !== 'accepted' && choice !== 'rejected') panel.hidden = false;
})();
