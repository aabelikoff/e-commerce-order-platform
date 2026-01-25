export const ProblemTypes = {
  // common
  BAD_REQUEST: 'urn:problem:bad-request',
  VALIDATION_ERROR: 'urn:problem:validation-error',
  UNAUTHORIZED: 'urn:problem:unauthorized',
  FORBIDDEN: 'urn:problem:forbidden',
  NOT_FOUND: 'urn:problem:not-found',

  // user
  USER_EMAIL_EXISTS: 'urn:problem:user:email-already-used',
  USER_NOT_FOUND: 'urn:problem:user:not-found',
} as const;