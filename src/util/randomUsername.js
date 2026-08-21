import { uniqueNamesGenerator, adjectives, colors, animals, starWars } from 'unique-names-generator'

/**
 * Generates a unique, high-energy arcade/synthwave username
 * Clamped between 3 and 16 characters (alphanumeric + underscore)
 */
export function generateRandomUsername() {
  const dictionarySets = [
    [adjectives, animals],
    [colors, animals],
    [adjectives, starWars],
  ]

  for (let attempt = 0; attempt < 10; attempt++) {
    const dicts = dictionarySets[attempt % dictionarySets.length]
    try {
      const raw = uniqueNamesGenerator({
        dictionaries: dicts,
        length: 2,
        separator: '_',
        style: 'upperCase',
      })
      const clean = raw.replace(/[^A-Z0-9_]/g, '')
      if (clean.length >= 3 && clean.length <= 16) {
        return clean
      }
    } catch (e) {
      console.warn('[UsernameGenerator] Error generating name:', e)
    }
  }
}

/**
 * Retrieves the stored username or generates and stores a new random username
 */
export function getOrGenerateUsername() {
  try {
    let saved = localStorage.getItem('rocket_rush_custom_username')
    if (!saved || saved.trim().length === 0 || saved.toUpperCase() === 'ANONYMOUS') {
      saved = generateRandomUsername()
      localStorage.setItem('rocket_rush_custom_username', saved)
    }
    return saved
  } catch (e) {
    return generateRandomUsername()
  }
}
