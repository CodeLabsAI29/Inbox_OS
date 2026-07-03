/**
 * Synchronously checks the strength of a password and returns a score from 0 to 5.
 * 
 * Criteria (1 point each):
 * 1. Length > 8 characters
 * 2. Contains at least one uppercase letter
 * 3. Contains at least one lowercase letter
 * 4. Contains at least one number
 * 5. Contains at least one special character (e.g. !@#$%^&*(),.?":{}|<>)
 */
export function checkPasswordStrength(password: string): number {
  let score = 0;
  if (!password) return score;

  // 1. Length > 8 characters
  if (password.length > 8) {
    score += 1;
  }

  // 2. Contains at least one uppercase letter
  if (/[A-Z]/.test(password)) {
    score += 1;
  }

  // 3. Contains at least one lowercase letter
  if (/[a-z]/.test(password)) {
    score += 1;
  }

  // 4. Contains at least one number
  if (/[0-9]/.test(password)) {
    score += 1;
  }

  // 5. Contains at least one special character
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score += 1;
  }

  return score;
}
