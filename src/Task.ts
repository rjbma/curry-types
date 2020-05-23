type Mapper<T, U> = (value: T) => U
type TaskConstructor<L, R> = (rej: (l: L) => void, res: (r: R) => void) => void

interface Task<L, R> {
  map: <R2>(fn: Mapper<R, R2>) => Task<L, R2>
  mapError: <L2>(fn: Mapper<L, L2>) => Task<L2, R>
  recover: (fn: (l: L) => R) => Task<never, R>
  chain: <R2>(fn: Mapper<R, Task<L, R2>>) => Task<L, R2>
  fork: <T>(rej: (l: L) => T, res: (r: R) => T) => void
  toString(): string
  toPromise(): Promise<R>
}

const Task = <L, R>(t: TaskConstructor<L, R>): Task<L, R> => ({
  map: fn => Task((l, r) => t(l, (x: R) => r(fn(x)))),
  mapError: fn => Task((l, r) => t((x: L) => l(fn(x)), r)),
  recover: fn => Task((l, r) => t((l: L) => r(fn(l)), r)),
  chain: fn => Task((l, r) => t(l, (x: R) => fn(x).fork(l, rx => r(rx)))),
  fork: (fl, fr) => t(fl, fr),
  toPromise: () => new Promise((pres, prej) => t(prej, pres)),
})

const fromPromise = <R>(r: () => Promise<R>) =>
  Task<Error, R>((rej, res) => {
    try {
      r()
        .then(res)
        .catch((e: Error) => rej(e))
    } catch (e) {
      rej(e as Error)
    }
  })

const timeout = (ms: number) => <R>(fn: () => R) =>
  Task<unknown, R>((rej, res) => {
    setTimeout(() => res(fn()), ms)
  })

const append = <X>(xs: X[]) => (x: X) => xs.concat([x])

// sequenceArray :: List (Task L R) -> Task L (List R)
const sequenceArray = <L, R>(ts: Task<L, R>[]) =>
  ts.reduce(
    (acc, task) => statics.ap(acc.map(append))(task),
    statics.of([] as R[]),
  )

// sequenceObject :: Object (Task L Rn) -> Task L (Object Rn)
const sequenceObject = <L, R>(tobj: { [key: string]: Task<L, any> }) => {
  const keys = Object.keys(tobj)
  const values = sequenceArray(Object.values(tobj))
  return values.map(vs =>
    keys.reduce((acc, key, index) => ({ ...acc, [key]: vs[index] }), {} as R),
  )
}

// traverseArray :: (a -> Task e b) -> List (Task e a) -> Task e (List b)
const traverseArray = <L, R1, R2>(f: Mapper<R1, Task<L, R2>>) => (ts: R1[]) =>
  statics.sequenceArray(ts.map(f))

const statics = {
  of: <L, R>(r: R) => Task<L, R>((rej, res) => res(r)),
  fail: <L, R>(l: L) => Task<L, R>((rej, res) => rej(l)),
  // ap :: Task err (a -> b) -> Task err a -> Task err b
  ap: <L, A, B>(tf: Task<L, Mapper<A, B>>) => (t: Task<L, A>) =>
    tf.chain(t.map),
  sequenceArray,
  sequenceObject,
  traverseArray,
  fromPromise,
  timeout,
}
export default {
  ...statics,
  succeed: statics.of,
  head: <L>(l: L) => <R>(t: Task<L, R[]>) =>
    t.chain(data =>
      data.length ? statics.of<L, R>(data[0]) : statics.fail<L, R>(l),
    ),
}
