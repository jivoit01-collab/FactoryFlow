import { describe, expect, it } from 'vitest';

import { failureReason } from '../../utils/failureReason';

// The envelope below is copied verbatim from a real FAILED service GRPO in
// production — the shape this function exists to handle.
const SAP_ENVELOPE = `{
   "error" : {
      "code" : "-5002",
      "details" : [ { "code" : "", "message" : "" } ],
      "message" : "10001467 - There is already a record with duplicated customer/vendor reference number."
   }
}`;

describe('failureReason', () => {
  it('digs the sentence out of a real SAP Service Layer envelope', () => {
    expect(failureReason(SAP_ENVELOPE)).toBe(
      '10001467 - There is already a record with duplicated customer/vendor reference number. (-5002)',
    );
  });

  it('handles the {value} form of error.message too', () => {
    expect(failureReason('{"error":{"code":-1,"message":{"value":"Nested form"}}}')).toBe(
      'Nested form (-1)',
    );
  });

  it('passes a plain sentence through untouched', () => {
    const plain = 'SAP system unavailable: SAP Service Layer connection timeout';
    expect(failureReason(plain)).toBe(plain);
  });

  it('returns unparseable text rather than swallowing the only clue', () => {
    expect(failureReason('{not json')).toBe('{not json');
  });

  it('returns an envelope unchanged when it carries no message', () => {
    const noMessage = '{"error":{"code":"-9"}}';
    expect(failureReason(noMessage)).toBe(noMessage);
  });

  it('treats null, undefined and blank as nothing to show', () => {
    expect(failureReason(null)).toBe('');
    expect(failureReason(undefined)).toBe('');
    expect(failureReason('   ')).toBe('');
  });
});
