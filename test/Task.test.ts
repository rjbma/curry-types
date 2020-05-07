import Task from '../src/Task'

describe('`Task`', () => {
  it('`of` always produces a successful task', () =>
    Task.of(10)
      .toPromise()
      .then(v => expect(v).toBe(10)))

  it('`fail` always produces a failed task', () =>
    Task.fail('Err')
      .toPromise()
      .catch(e => expect(e).toBe('Err')))

  it('`fromPromise` works for resolved promises', () => {
    return Task.fromPromise(() => Promise.resolve(1))
      .toPromise()
      .then(v => expect(v).toBe(1))
  })

  it('`fromPromise` works for rejected promises', () => {
    return Task.fromPromise(() => Promise.reject('Err'))
      .toPromise()
      .catch(e => expect(e).toBe('Err'))
  })

  it('`timeout` works', () =>
    Task.timeout(300)(() => 10)
      .toPromise()
      .then(v => expect(v).toBe(10)))

  describe('`map`', () => {
    it('works with a resolved task', () =>
      Task.of(2)
        .map(n => n * 2)
        .toPromise()
        .then(v => expect(v).toBe(4)))

    it('works with a rejected task', () =>
      Task.fail<any, number>('ERR')
        .map((n: number) => n * 2)
        .toPromise()
        .catch(e => expect(e).toBe('ERR')))
  })

  it('`chain` works with a resolved task', () =>
    Task.of(2)
      .chain(n => {
        return Task.of(n * 2)
      })
      .map(n => {
        return n * 2
      })
      .chain(n => {
        return Task.of(n * 3)
      })
      .toPromise()
      .then(v => expect(v).toBe(24)))

  it('`chain` works with a rejected task', () =>
    Task.fail<string, number>('Err')
      .chain(n => Task.of(n * 2))
      .toPromise()
      .catch(e => expect(e).toBe('Err')))
})
