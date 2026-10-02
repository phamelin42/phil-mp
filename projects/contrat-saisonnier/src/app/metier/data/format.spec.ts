import { dateLongue, euros, heure, pluriel } from './format';

describe('format', () => {
  it('écrit les montants, dates et heures à la française', () => {
    expect(euros(123_456)).toBe('1\u202f234,56\u00a0€');
    expect(dateLongue('2027-07-01')).toBe('1er\u00a0juillet 2027');
    expect(dateLongue('2027-13-01')).toBe('');
    expect(heure('16:00')).toBe('16\u00a0h');
    expect(heure('09:30')).toBe('9\u00a0h\u00a030');
    expect(heure('')).toBe('');
    expect(pluriel(1, 'nuit')).toBe('1\u00a0nuit');
    expect(pluriel(7, 'nuit')).toBe('7\u00a0nuits');
  });
});
