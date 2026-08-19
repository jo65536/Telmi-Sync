import {requestData, requestJson} from './Request.js'

const
  SPOTIFY_SHOW_REGEXP = /^https?:\/\/open\.spotify\.com\/(?:[a-z0-9-]+\/)?show\/[A-Za-z0-9]+/,

  isSpotifyShowUrl = (url) => SPOTIFY_SHOW_REGEXP.test(String(url)),

  decodeHtmlEntities = (str) => str
    .replace(/&#x([0-9a-f]+);/gi, (m, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (m, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, '\'')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&'),

  normalizeTitle = (str) => String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim(),

  titlesMatch = (wanted, found) => {
    const w = normalizeTitle(wanted), f = normalizeTitle(found)
    return w === f || (w.length >= 12 && (f.startsWith(w) || w.startsWith(f)))
  },

  // The oEmbed endpoint returns the latest episode title for shows, so the
  // show name and publisher are read from the page's og: meta tags instead.
  getSpotifyShowInfos = async (spotifyUrl) => {
    const
      html = (await requestData(spotifyUrl, {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36',
        'Accept': 'text/html'
      })).toString('utf8'),
      title = html.match(/<meta property="og:title" content="([^"]+)"/),
      description = html.match(/<meta property="og:description" content="([^"]+)"/),
      author = description === null ? null : decodeHtmlEntities(description[1]).match(/^Podcast · ([^·]+?) ·/)

    if (title === null) {
      return null
    }
    return {
      title: decodeHtmlEntities(title[1]),
      author: author === null ? '' : author[1].trim()
    }
  },

  searchITunes = async (term, wantedTitle) => {
    const search = await requestJson('https://itunes.apple.com/search?media=podcast&limit=20&term=' + encodeURIComponent(term))
    if (!Array.isArray(search.results)) {
      return null
    }
    const match = search.results.find((r) => typeof r.feedUrl === 'string' && r.feedUrl !== '' && titlesMatch(wantedTitle, r.collectionName))
    return match === undefined ? null : {feedUrl: match.feedUrl, title: match.collectionName}
  },

  searchFyyd = async (wantedTitle) => {
    const search = await requestJson('https://api.fyyd.de/0.2/search/podcast?count=20&title=' + encodeURIComponent(wantedTitle))
    if (!Array.isArray(search.data)) {
      return null
    }
    const match = search.data.find((r) => typeof r.xmlURL === 'string' && r.xmlURL !== '' && titlesMatch(wantedTitle, r.title))
    return match === undefined ? null : {feedUrl: match.xmlURL, title: match.title}
  },

  // Resolves a Spotify show page to the podcast's canonical RSS feed through
  // public directories (iTunes, then fyyd). Returns {feedUrl, title}, or null
  // when the podcast is not syndicated outside Spotify (Spotify-hosted or
  // exclusive shows have no public feed).
  resolveSpotifyShowToRss = async (spotifyUrl) => {
    const infos = await getSpotifyShowInfos(spotifyUrl)
    if (infos === null || infos.title === '') {
      return null
    }

    const attempts = [
      () => infos.author !== '' ? searchITunes(infos.title + ' ' + infos.author, infos.title) : null,
      () => searchITunes(infos.title, infos.title),
      () => searchFyyd(infos.title)
    ]

    for (const attempt of attempts) {
      try {
        const resolved = await attempt()
        if (resolved !== null) {
          return resolved
        }
      } catch (ignored) {
        // a directory being unreachable must not abort the chain
      }
    }
    return null
  }

export {isSpotifyShowUrl, resolveSpotifyShowToRss}
