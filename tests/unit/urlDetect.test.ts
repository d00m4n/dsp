import { describe, expect, it } from 'vitest';
import { detectUrl } from '../../src/lib/search/urlDetect';

describe('detectUrl', () => {
  it.each([
    ['github.com/d00m4n', 'https://github.com/d00m4n'],
    ['https://reus.cat', new URL('https://reus.cat').href],
    ['localhost:5173', 'http://localhost:5173'],
    ['192.168.1.1:8006', 'http://192.168.1.1:8006'],
    ['com', null],
    ['.com', null],
    ['a.b', null],
    ['hola món .com', null],
    ['node.js', null],
    ['3.14', null],
    ['v1.2.3', null],
    ['fitxer.txt', null],
    ['README.md', null],
  ])('detects %j -> %j', (input, expected) => {
    expect(detectUrl(input)).toBe(expected);
  });

  it('rejects dangerous schemes', () => {
    expect(detectUrl('javascript:alert(1)')).toBeNull();
    expect(detectUrl('data:text/html,<script>1</script>')).toBeNull();
  });

  it('rejects anything with internal spaces', () => {
    expect(detectUrl('example .com')).toBeNull();
  });
});
