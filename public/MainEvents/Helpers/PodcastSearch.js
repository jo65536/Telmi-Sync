import {requestJson} from './Request.js'
import {isSpotifyShowUrl, resolveSpotifyShowToRss} from './SpotifyPodcast.js'

const
  dedupeByFeed = (results) => {
    const seen = new Set()
    return results.filter((r) => {
      if (typeof r.feedUrl !== 'string' || r.feedUrl === '' || seen.has(r.feedUrl)) {
        return false
      }
      seen.add(r.feedUrl)
      return true
    })
  },

  searchItunes = async (query) => {
    try {
      const data = await requestJson('https://itunes.apple.com/search?media=podcast&limit=25&term=' + encodeURIComponent(query))
      if (!Array.isArray(data.results)) {
        return []
      }
      return data.results.map((r) => ({
        title: r.collectionName || r.trackName || '',
        author: r.artistName || '',
        feedUrl: r.feedUrl || '',
        image: r.artworkUrl100 || r.artworkUrl60 || ''
      }))
    } catch (ignored) {
      return []
    }
  },

  searchFyyd = async (query) => {
    try {
      const data = await requestJson('https://api.fyyd.de/0.2/search/podcast?count=25&title=' + encodeURIComponent(query))
      if (!Array.isArray(data.data)) {
        return []
      }
      return data.data.map((r) => ({
        title: r.title || '',
        author: r.author || '',
        feedUrl: r.xmlURL || '',
        image: r.smallImageURL || r.imgURL || ''
      }))
    } catch (ignored) {
      return []
    }
  },

  // Text search across public podcast directories, or a single resolved
  // result when the query is a Spotify show URL. iTunes results come first
  // (better artwork/metadata), fyyd fills coverage gaps (small/amateur shows
  // Apple hides), deduped by feed URL.
  searchPodcasts = async (query) => {
    const trimmed = String(query).trim()
    if (trimmed.length < 2) {
      return []
    }

    if (isSpotifyShowUrl(trimmed)) {
      const resolved = await resolveSpotifyShowToRss(trimmed)
      return resolved === null ? [] : [{title: resolved.title, author: '', feedUrl: resolved.feedUrl, image: ''}]
    }

    const [itunes, fyyd] = await Promise.all([searchItunes(trimmed), searchFyyd(trimmed)])
    return dedupeByFeed([...itunes, ...fyyd])
  }

export {searchPodcasts}
