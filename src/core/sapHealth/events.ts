/**
 * Fired on `window` by the API client when a request comes back SAP_UNAVAILABLE,
 * so the SAP banner refreshes at once instead of on its next poll. Its own
 * import-free file: the client cannot import the banner module, which imports
 * the client.
 */
export const SAP_UNAVAILABLE_EVENT = 'sap:unavailable';
