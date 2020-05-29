import Task from '../src/Task'

const x = Task((rej, res) => res(1))

describe('`Task`', () => {
  it('`of` always produces a successful task', () =>
    Task.of(10)
      .toPromise()
      .then(v => expect(v).toBe(10)))

  it('`fail` always produces a failed task', () =>
    Task.fail('Err')
      .toPromise()
      .catch(e => expect(e).toBe('Err')))

  describe('`recover`', () => {
    it('works with a failed task', () =>
      Task.fail('error')
        .recover(() => 100)
        .toPromise()
        .then(v => expect(v).toBe(100)))

    it('ignores a successful task', () =>
      Task.of(100)
        .recover(() => 10)
        .toPromise()
        .then(v => expect(v).toBe(100)))
  })

  describe('`fromPromise`', () => {
    it('works for resolved promises', () => {
      return Task.fromPromise(() => Promise.resolve(1))
        .toPromise()
        .then(v => expect(v).toBe(1))
    })

    it('works for rejected promises', () => {
      return Task.fromPromise(() => Promise.reject('Err'))
        .toPromise()
        .catch(e => expect(e).toBe('Err'))
    })
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
      Task.fail('ERR')
        .map((n: number) => n * 2)
        .toPromise()
        .catch(e => expect(e).toBe('ERR')))
  })

  describe('`chain`', () => {
    it('works with a resolved task', () =>
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

    it('works with a rejected task', () =>
      Task.fail('Err')
        .chain(n => Task.of(n * 2))
        .toPromise()
        .catch(e => expect(e).toBe('Err')))
  })

  describe('`sequenceArray`', () => {
    it('works with an array of resolved tasks', () => {
      const ts = [1, 2, 3].map(Task.of)

      Task.sequenceArray(ts)
        .toPromise()
        .then(v => expect(v).toEqual([1, 2, 3]))
    })

    it('works with an empty array', () => {
      Task.sequenceArray([])
        .toPromise()
        .then(v => expect(v).toEqual([]))
    })

    it('works with an array that contains a rejected task', () => {
      const msg = '2 has failed'
      const ts = [Task.of(1), Task.fail(msg), Task.of(3)]

      return Task.sequenceArray(ts)
        .toPromise()
        .catch(e => expect(e).toBe(msg))
    })
  })

  describe('`traverseArray`', () => {
    it('works with an array', () =>
      Task.traverseArray((n: number) => Task.of(n + 1))([1])
        .toPromise()
        .then(r => expect(r).toEqual([2])))

    it('works with failing tasks', () =>
      Task.traverseArray(() => Task.fail('error'))([1])
        .toPromise()
        .catch(e => expect(e).toBe('error')))
  })
})
