const
  versionStringToObject = (str) => {
    // Tolerates a leading "v" and a prerelease build suffix such as
    // "-home.3": the build number lets successive fork builds compare, and a
    // stable release (no prerelease) outranks any prerelease of the same core.
    const
      clean = String(str).trim().replace(/^v/i, ''),
      [core, ...pre] = clean.split('-'),
      parts = core.split('.').map((v) => parseInt(v, 10))

    if (parts.length !== 3 || parts.some((v) => isNaN(v))) {
      return null
    }

    const buildMatch = pre.join('-').match(/([0-9]+)/)
    return {
      major: parts[0],
      minor: parts[1],
      fix: parts[2],
      build: pre.length === 0 ? Infinity : (buildMatch === null ? 0 : parseInt(buildMatch[1], 10))
    }
  },

  isNewerVersion = (a, b) => {
    const
      va = typeof a === 'string' ? versionStringToObject(a) : a,
      vb = typeof b === 'string' ? versionStringToObject(b) : b

    if (va === null || vb === null) {
      return false
    }

    return (
      va.major < vb.major ||
      (va.major === vb.major && va.minor < vb.minor) ||
      (va.major === vb.major && va.minor === vb.minor && va.fix < vb.fix) ||
      (va.major === vb.major && va.minor === vb.minor && va.fix === vb.fix && va.build < vb.build)
    )
  }

export { versionStringToObject, isNewerVersion }
