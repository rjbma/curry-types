type Mapper<T, U> = (value: T) => U
type TaskConstructor<L, R> = (rej: (l: L) => void, res: (r: R) => void) => void

interface Task<L, R> {
  map: <R2>(fn: Mapper<R, R2>) => Task<L, R2>
  mapError: <L2>(fn: Mapper<L, L2>) => Task<L2, R>
  chain: <R2>(fn: Mapper<R, Task<L, R2>>) => Task<L, R2>
  fork: <T>(rej: (l: L) => T, res: (r: R) => T) => void
  toString(): string
  toPromise(): Promise<R>
}

const Task = <L, R>(t: TaskConstructor<L, R>): Task<L, R> => ({
  map: fn => Task((l, r) => t(l, (x: R) => r(fn(x)))),
  mapError: fn => Task((l, r) => t((x: L) => l(fn(x)), r)),
  chain: fn => Task((l, r) => t(l, (x: R) => fn(x).fork(l, rx => r(rx)))),
  fork: (fl, fr) => t(fl, fr),
  toPromise: () => new Promise((pres, prej) => Task(t).fork(prej, pres)),
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

// const fromPromise = <L>(toError: (e: any) => L) => <R>(r: () => Promise<R>) => {
//   return Task<L, R>((rej, res) => {
//     try {
//       r()
//         .then(res)
//         .catch(e => rej(toError(e)))
//     } catch (e) {
//       rej(toError(e))
//     }
//   })
// }

const timeout = (ms: number) => <R>(fn: () => R) =>
  Task<unknown, R>((rej, res) => {
    setTimeout(() => res(fn()), ms)
  })

// sequenceArray :: List (Task L R) -> Task L (List R)
const sequenceArray = <L, R>(ts: Task<L, R>[]) =>
  ts.reduce((acc, t) => statics.of(3), statics.of(1))

const statics = {
  of: <L, R>(r: R) => Task<L, R>((rej, res) => res(r)),
  fail: <L, R>(l: L) => Task<L, R>((rej, res) => rej(l)),
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
