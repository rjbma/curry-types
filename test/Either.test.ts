import { Either } from '../src/Either'
const { fromNullable, fromFailable } = Either

describe('Either', () => {
  it('`of` shoud always produce a `Right`', () => {
    expect(Either.of(null).isRight()).toBe(true)
    expect(Either.of(1).isRight()).toBe(true)
  })

  describe('`fromNullable`', () => {
    const nullable = fromNullable('NOK')
    it('correctly produces a Right', () =>
      expect(nullable(1).toString()).toBe('Right(1)'))
    it('correctly produces a Left from `null`', () =>
      expect(nullable(null).toString()).toBe('Left(NOK)'))
    it('correctly produces a Left from `undefined`', () =>
      expect(nullable(undefined).toString()).toBe('Left(NOK)'))
  })

  describe('`fromFailable`', () => {
    const failable = fromFailable('NOK')
    it('correctly produces a `Right`', () =>
      expect(failable(() => 1).toString()).toBe('Right(1)'))

    it('correctly produces a `Left` from a function that throws', () =>
      expect(
        failable(() => {
          throw new Error()
        }).toString(),
      ).toBe('Left(NOK)'))

    it('correctly produces a `Left` from a function that return `null`', () =>
      expect(failable(() => undefined).toString()).toBe('Left(NOK)'))
  })

  describe('`map`', () => {
    it('works correctly on `Right` value', () =>
      expect(Either.Right(1).map(add(2)).toString()).toBe('Right(3)'))

    it('works correctly on `Left` value', () =>
      expect(Either.Left<number, any>(1).map(add(2)).toString()).toBe(
        'Left(1)',
      ))
  })

  describe('`chain`', () => {
    it('works correctly on `Right` value', () =>
      expect(Either.Right('2').chain(parseNumber).toString()).toBe('Right(2)'))

    it('works correctly on `Left` value', () =>
      expect(Either.Left<string, any>('2').chain(parseNumber).toString()).toBe(
        'Left(2)',
      ))
  })
})

const add = (a: number) => (b: number) => a + b

const parseNumber = (s: string) =>
  isNaN(parseFloat(s)) ? Either.Left('invalid') : Either.Right(parseFloat(s))
