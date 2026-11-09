/**
 * URL slug for a name: "HashiCorp Vault" → "hashicorp-vault", "Detection & response" → "detection-and-response".
 * @param {string} value
 * @returns {string}
 */
export function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
