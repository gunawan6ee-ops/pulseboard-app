/**
 * HTML escaping guard for the string-built renderer.
 *
 * app.js composes markup with template literals and assigns it to innerHTML,
 * so every interpolated value is an injection sink. Incident titles, summaries
 * and service names are data, not markup — they must be escaped before they
 * reach the DOM.
 *
 * Escapes the five characters that can break out of text or an attribute:
 *   & < > " '
 * The ampersand is replaced first so already-escaped entities are not
 * double-encoded into `&amp;lt;`.
 */

const ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}

const PATTERN = /[&<>"']/g

/** Escape a value for safe interpolation into HTML text or a quoted attribute. */
export function escapeHtml(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(PATTERN, (char) => ENTITIES[char])
}

/**
 * Escape a value for use inside a double-quoted attribute.
 * Identical to escapeHtml but kept as a named intent for call sites that
 * build attributes (data-*, title=) rather than text nodes.
 */
export function escapeAttr(value) {
  return escapeHtml(value)
}
