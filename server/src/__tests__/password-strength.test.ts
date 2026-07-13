import { checkPasswordStrength } from '../utils/password-strength';

describe('checkPasswordStrength', () => {
  it('should return 0 for empty or undefined password', () => {
    expect(checkPasswordStrength('')).toBe(0);
  });

  it('should score 1 point for meeting length > 8 only', () => {
    // Length is 9, but all lowercase. Oh wait, "all lowercase" also satisfies "at least one lowercase letter" (1 point).
    // So 9 lowercase letters would be length (>8) + lowercase = 2 points.
    // Let's check: can we have only length > 8? No, because any characters we choose will likely fall into uppercase, lowercase, number, or special.
    // Wait, what if we have characters not matching those regexes? E.g., non-latin characters or spaces/etc.?
    // If it's 9 spaces, length > 8 is true, others might be false.
    expect(checkPasswordStrength('         ')).toBe(1); // 9 spaces: length > 8 (1)
  });

  it('should score 1 point for single character types without length > 8', () => {
    expect(checkPasswordStrength('a')).toBe(1); // lowercase
    expect(checkPasswordStrength('A')).toBe(1); // uppercase
    expect(checkPasswordStrength('1')).toBe(1); // number
    expect(checkPasswordStrength('!')).toBe(1); // special
  });

  it('should score 2 points for combined criteria under length limit', () => {
    expect(checkPasswordStrength('a1')).toBe(2); // lowercase + number
    expect(checkPasswordStrength('aA')).toBe(2); // lowercase + uppercase
    expect(checkPasswordStrength('a!')).toBe(2); // lowercase + special
  });

  it('should score 3 points', () => {
    expect(checkPasswordStrength('aA1')).toBe(3); // lowercase + uppercase + number (length 3)
    expect(checkPasswordStrength('abcdefghi')).toBe(2); // lowercase + length > 8 (length 9)
  });

  it('should score 4 points', () => {
    expect(checkPasswordStrength('aA1!')).toBe(4); // lowercase + uppercase + number + special (length 4)
    expect(checkPasswordStrength('abcdefgh1')).toBe(3); // lowercase + number + length > 8 (length 9)
    expect(checkPasswordStrength('aA1ffffff')).toBe(4); // lowercase + uppercase + number + length > 8 (length 9)
  });

  it('should score 5 points for fully strong password', () => {
    expect(checkPasswordStrength('aA1!fffff')).toBe(5); // lowercase + uppercase + number + special + length > 8 (length 9)
    expect(checkPasswordStrength('P@ssw0rd2026')).toBe(5); // uppercase + lowercase + special + number + length > 8 (length 12)
  });

  it('should score boundary length conditions correctly', () => {
    // Length exactly 8
    expect(checkPasswordStrength('aA1!ffff')).toBe(4); // uppercase + lowercase + number + special, length is 8 (no point for length > 8)

    // Length 9
    expect(checkPasswordStrength('aA1!fffff')).toBe(5); // all criteria met
  });
});
