import * as Task from '../src/Task'

describe('`Task`', () => {
  describe('constructors', () => {
    it('`of` always produces a successful task', () =>
      Task.of(10)
        .toPromise()
        .then(v => expect(v).toBe(10)))

    it('`fail` always produces a failed task', () =>
      Task.fail('Err')
        .toPromise()
        .catch(e => expect(e).toBe('Err')))

    it('`timeout` delays resolving the task', () => {
      const start = new Date().getTime()
      return Task.timeout(300)(() => 10)
        .toPromise()
        .then(v => {
          expect(v).toBe(10)
          expect(new Date().getTime() - start).toBeGreaterThanOrEqual(300)
        })
    })
  })

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
    it('works for resolved promises', () =>
      Task.fromPromise(() => Promise.resolve(1))
        .toPromise()
        .then(v => expect(v).toBe(1)))

    it('works for rejected promises', () =>
      Task.fromPromise(() => Promise.reject('Err'))
        .toPromise()
        .catch(e => expect(e).toBe('Err')))

    it('works when the lazy task fails synchronously', () =>
      Task.fromPromise(() => {
        throw 'synch error'
      })
        .toPromise()
        .catch(e => expect(e).toBe('synch error')))
  })

  describe('`mapError`', () => {
    it('works with a resolved task', () =>
      Task.of(2)
        .mapError(n => 'this error never happens')
        .toPromise()
        .then(v => expect(v).toBe(2)))

    it('works with a rejected task', () =>
      Task.fail('ERR')
        .mapError(() => -1)
        .toPromise()
        .catch(e => expect(e).toBe(-1)))
  })

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

  describe('`sequenceObject`', () => {
    it('works with an object of resolved tasks', () => {
      const ts = {
        a: Task.of(1),
        b: Task.of(2),
      }

      return Task.sequenceObject(ts)
        .toPromise()
        .then(v => expect(v).toEqual({ a: 1, b: 2 }))
    })

    it('works with an empty object', () => {
      return Task.sequenceObject({})
        .toPromise()
        .then(v => expect(v).toEqual({}))
    })

    it('works with an object that contains a rejected task', () => {
      const ts = {
        a: Task.of(1),
        b: Task.fail('b has failed'),
      }

      return Task.sequenceObject(ts)
        .toPromise()
        .catch(e => expect(e).toBe('b has failed'))
    })
  })

  describe('`sequenceArray`', () => {
    it('works with an array of resolved tasks', () => {
      const ts = [1, 2, 3].map(Task.of)

      return Task.sequenceArray(ts)
        .toPromise()
        .then(v => expect(v).toEqual([1, 2, 3]))
    })

    it('works with an empty array', () => {
      return Task.sequenceArray([])
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

  describe('`parallelArray`', () => {
    let trail: string[] = []
    const ts = [1, 2, 3].map(n =>
      Task.of(n)
        .map(n => (trail.push(`s${n}`), n))
        .delay(n * 10)
        .map(n => (trail.push(`e${n}`), n)),
    )
    beforeEach(() => {
      // trail is just an ugly way to let us check if
      // the array is actually being traversed in parallel
      trail = []
    })

    it('works with an array of resolved tasks, all in parallel', () => {
      return Task.parallelArray(5)(ts)
        .toPromise()
        .then(v => {
          expect(v).toEqual([1, 2, 3])
          expect(trail).toEqual(['s1', 's2', 's3', 'e1', 'e2', 'e3'])
        })
    })

    it('works with an array of resolved tasks, 2 in parallel', () => {
      return Task.parallelArray(2)(ts)
        .toPromise()
        .then(v => {
          expect(v).toEqual([1, 2, 3])
          expect(trail).toEqual(['s1', 's2', 'e1', 's3', 'e2', 'e3'])
        })
    })

    it('works with an array of resolved tasks, 2 in parallel', () => {
      return Task.parallelArray(2)(ts)
        .toPromise()
        .then(v => {
          expect(v).toEqual([1, 2, 3])
          expect(trail).toEqual(['s1', 's2', 'e1', 's3', 'e2', 'e3'])
        })
    })

    it('works with an array of resolved tasks, in sequence', () => {
      return Task.parallelArray(1)(ts)
        .toPromise()
        .then(v => {
          expect(v).toEqual([1, 2, 3])
          expect(trail).toEqual(['s1', 'e1', 's2', 'e2', 's3', 'e3'])
        })
    })

    it('works with an array that contains a rejected task', () => {
      const msg = '2 has failed'
      const ts = [Task.of(1), Task.fail(msg), Task.of(3)]

      return Task.parallelArray(5)(ts)
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

  describe('applicative', () => {
    const add = (a: number) => (b: number) => (c: number) => a + b + c
    const add2 = add(2)
    const add5 = add2(3)

    it('lifts unary functions', () =>
      Task.liftA1(add5)
        .ap(Task.of(1))
        .toPromise()
        .then(r => expect(r).toBe(6)))

    it('lifts binary functions', () =>
      Task.liftA2(add2)
        .ap(Task.of(1))
        .ap(Task.of(1))
        .toPromise()
        .then(r => expect(r).toBe(4)))

    it('lifts ternary functions', () =>
      Task.liftA3(add)
        .ap(Task.of(1))
        .ap(Task.of(1))
        .ap(Task.of(1))
        .toPromise()
        .then(r => expect(r).toBe(3)))
  })
})
