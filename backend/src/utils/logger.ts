import winston from 'winston';

// Sensitive keys that must be redacted in plaintext logs
const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'body',
  'body_text',
  'emailbody',
  'content',
  'token',
  'jwt',
  'client_secret',
  'clientsecret',
  'secret',
];

/**
 * Custom Winston format that recursively sanitizes any metadata objects
 * and string messages to ensure no sensitive user data is logged in plaintext.
 */
const redactFormat = winston.format((info) => {
  const redact = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(redact);
    if (obj instanceof Error) {
      return {
        message: obj.message,
        stack: obj.stack,
        ...redact({ ...obj }),
      };
    }

    const newObj = { ...obj };
    for (const key of Object.keys(newObj)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        newObj[key] = '[REDACTED]';
      } else if (typeof newObj[key] === 'object') {
        newObj[key] = redact(newObj[key]);
      }
    }
    return newObj;
  };

  // Perform redaction on the Winston info object (which holds message and metadata)
  const redactedInfo = redact(info);

  // Redact inline string queries if any sensitive attributes are logged in format "key=value"
  if (typeof redactedInfo.message === 'string') {
    redactedInfo.message = redactedInfo.message.replace(
      /(password|passwordhash|body|emailbody|token|jwt|secret)=[^\s&]+/gi,
      '$1=[REDACTED]'
    );
  }

  return redactedInfo;
});

// Configure Winston to output JSON to standard output (stdout)
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    redactFormat(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

export default logger;
