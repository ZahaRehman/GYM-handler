import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import { renderTemplate } from './template'

describe('toCsv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 5]])).toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",5')
  })
  it('neutralises spreadsheet formulas', () => {
    expect(toCsv(['n'], [['=HYPERLINK("x")']])).toBe('n\r\n"\'=HYPERLINK(""x"")"')
  })
  it('leaves phone numbers alone', () => {
    expect(toCsv(['p'], [['+92 300 1234567']])).toBe('p\r\n+92 300 1234567')
    expect(toCsv(['p'], [['+1+2']])).toBe("p\r\n'+1+2")
  })
  it('keeps negative numbers as numbers', () => {
    expect(toCsv(['n'], [[-5]])).toBe('n\r\n-5')
  })
})

describe('renderTemplate', () => {
  it('fills known placeholders and keeps unknown ones', () => {
    expect(renderTemplate('Hi {name}, pay {amount} {oops}', { name: 'Ali', amount: 'Rs 3,000' })).toBe('Hi Ali, pay Rs 3,000 {oops}')
  })
})
