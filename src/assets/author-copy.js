(() => {
  if (!document.body.classList.contains('author-page-detail')) return;

  const copy = {
    uk: {
      lead: 'Я — український автор «Філософії Кєріка». Мій професійний досвід охоплює правоохоронну сферу, міжнародний бізнес, кібербезпеку та роботу з організаційними системами.',
      paragraphs: [
        'Досвід у різних інституційних і комерційних середовищах сформував мій інтерес до того, як правила, стимули, технології, групова динаміка й доступ до ресурсів змінюють поведінку окремої людини.',
        'Нині я навчаюся за напрямом International Business у Фінляндії, поєднуючи практичний досвід із вивченням стратегії, маркетингу, технологій та міжнародних ринків.',
        '«Філософію Кєріка» я написав як спробу з’єднати в одну послідовну картину теми, які зазвичай розглядаються окремо: фізичний масштаб, еволюцію, гроші, технології, колективні системи, особистість і вибір.',
        'Моя мета — не дати читачеві готову ідеологію, а запропонувати інструмент спостереження: бачити механізми точніше й відрізняти власне рішення від автоматичної реакції.'
      ]
    },
    en: {
      lead: 'I am the Ukrainian author of Philosophy of Kerik. My professional background spans law enforcement, international business, cybersecurity and work with organizational systems.',
      paragraphs: [
        'Experience across different institutional and commercial environments shaped my interest in how rules, incentives, technology, group dynamics and access to resources change individual behaviour.',
        'I am currently studying International Business in Finland, combining practical experience with the study of strategy, marketing, technology and international markets.',
        'I wrote Philosophy of Kerik as an attempt to connect subjects usually treated separately — physical scale, evolution, money, technology, collective systems, the self and choice — into one sequential picture.',
        'My aim is not to give the reader a ready-made ideology, but to offer an instrument of observation: to see mechanisms more precisely and distinguish personal decisions from automatic reactions.'
      ]
    },
    fi: {
      lead: 'Olen ukrainalainen Kerikin filosofian kirjoittaja. Ammatillinen taustani ulottuu lainvalvontaan, kansainväliseen liiketoimintaan, kyberturvallisuuteen ja organisaatiojärjestelmiin.',
      paragraphs: [
        'Kokemus erilaisissa institutionaalisissa ja kaupallisissa ympäristöissä synnytti kiinnostukseni siihen, miten säännöt, kannustimet, teknologia, ryhmädynamiikka ja resurssien saatavuus muuttavat yksilön käyttäytymistä.',
        'Opiskelen tällä hetkellä International Business -alaa Suomessa ja yhdistän käytännön kokemusta strategian, markkinoinnin, teknologian ja kansainvälisten markkinoiden opiskeluun.',
        'Kirjoitin Kerikin filosofian yrityksenä yhdistää samaan jatkumoon aiheita, joita käsitellään usein erikseen: fyysinen mittakaava, evoluutio, raha, teknologia, kollektiiviset järjestelmät, yksilö ja valinta.',
        'Tavoitteeni ei ole tarjota valmista ideologiaa vaan havaintoväline: nähdä mekanismit tarkemmin ja erottaa oma päätös automaattisesta reaktiosta.'
      ]
    },
    sv: {
      lead: 'Jag är den ukrainska författaren bakom Keriks filosofi. Min yrkesbakgrund omfattar brottsbekämpning, internationell affärsverksamhet, cybersäkerhet och arbete med organisatoriska system.',
      paragraphs: [
        'Erfarenhet från olika institutionella och kommersiella miljöer väckte mitt intresse för hur regler, incitament, teknik, gruppdynamik och tillgång till resurser förändrar individuellt beteende.',
        'Jag studerar för närvarande International Business i Finland och kombinerar praktisk erfarenhet med studier i strategi, marknadsföring, teknik och internationella marknader.',
        'Jag skrev Keriks filosofi som ett försök att förena ämnen som ofta behandlas separat — fysisk skala, evolution, pengar, teknik, kollektiva system, jaget och val — till en sammanhängande kedja.',
        'Mitt mål är inte att ge läsaren en färdig ideologi utan ett observationsverktyg: att se mekanismer tydligare och skilja egna beslut från automatiska reaktioner.'
      ]
    }
  };

  const lang = document.documentElement.lang;
  const localized = copy[lang];
  if (!localized) return;

  const lead = document.querySelector('.page-lead');
  if (lead) lead.textContent = localized.lead;

  const paragraphs = [...document.querySelectorAll('.author-page-grid > div > p')];
  localized.paragraphs.forEach((text, index) => {
    if (paragraphs[index]) paragraphs[index].textContent = text;
  });
})();
