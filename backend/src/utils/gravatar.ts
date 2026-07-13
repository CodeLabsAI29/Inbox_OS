import crypto from 'crypto';

/**
 * Generates a Gravatar URL for a given email address.
 * It trims whitespace, converts the email to lowercase,
 * computes its MD5 hash, and returns the standard Gravatar format.
 *
 * @param email - The user's email address
 * @returns The Gravatar URL string
 */
export function getGravatarUrl(email: string): string {
  if (!email) {
    return 'https://www.gravatar.com/avatar/00000000000000000000000000000000?d=identicon';
  }
  const cleanEmail = email.trim().toLowerCase();
  const hash = crypto.createHash('md5').update(cleanEmail).digest('hex');
  return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}
