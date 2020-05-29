// some helper types to make type signatures easier to read
type Mapper<T, U> = (value: T) => U
type Chainer<E, A, B> = Mapper<A, Task<E, B>>
type TaskConstructor<E, A> = (
  reject: (e: E) => void,
  resolve: (a: A) => void,
) => void

// of :: a -> Task never a
const of = <A>(r: A) => Task<never, A>((_, resolve) => resolve(r))

// fail :: e -> Task e never
const fail = <E>(err: E) => Task<E, never>((reject, _) => reject(err))

// map :: (a -> b) -> Task e a -> Task e b
const map = <A, B>(fn: Mapper<A, B>) => <E>(task: Task<E, A>) =>
  Task<E, B>((reject, resolve) => task.fork(reject, a => resolve(fn(a))))

// chain :: (a -> Task f b) -> Task e a -> Task (e | f) b
const chain = <F, A, B>(fn: Chainer<F, A, B>) => <E>(task: Task<E, A>) =>
  Task<E | F, B>((reject, resolve) =>
    task.fork(
      e => reject(e),
      a => fork(reject, resolve)(fn(a)),
    ),
  )

// recovers from a failed task, transforming a possible error into a success
// successful tasks are not affected by this function
// recover :: (e -> b) -> Task e a -> Task never (a | b)
const recover = <E, B>(fn: Mapper<E, B>) => <A>(task: Task<E, A>) =>
  Task<never, A | B>((_, resolve) =>
    task.fork(
      e => resolve(fn(e)),
      a => resolve(a),
    ),
  )

// mapError :: (e -> f) -> Task e a -> Task f a
const mapError = <E, F>(fn: Mapper<E, F>) => <A>(task: Task<E, A>) =>
  Task<F, A>((reject, resolve) => task.fork(e => reject(fn(e)), resolve))

// fork :: (e -> void, a -> void) -> Task e a -> void
const fork = <E, A>(onReject: (e: E) => void, onResolve: (a: A) => void) => (
  task: Task<E, A>,
) => task.fork(onReject, onResolve)

// toPromise :: Task e a -> Promise a
const toPromise = <E, A>(task: Task<E, A>) =>
  new Promise<A>((resolve, reject) => fork(reject, resolve)(task))

// fromPromise :: (() -> Promise a) -> Task e a
const fromPromise = <A>(r: () => Promise<A>) =>
  Task<Error, A>((reject, resolve) => {
    try {
      r()
        .then(resolve)
        .catch((e: Error) => reject(e))
    } catch (e) {
      reject(e as Error)
    }
  })

// timeout :: number -> (() -> a) -> Task never a
const timeout = (ms: number) => <A>(fn: () => A) =>
  Task<never, A>((rej, res) => {
    setTimeout(() => res(fn()), ms)
  })

// ap :: Task e (a -> b) -> Task e a -> Task e b
const ap = <E, A, B>(taskMapper: Task<E, Mapper<A, B>>) => (task: Task<E, A>) =>
  taskMapper.chain(task.map)

// sequenceArray :: List (Task e a) -> Task e (List a)
const sequenceArray = <E, A>(tasks: Task<E, A>[]) => {
  const append = <X>(xs: X[]) => (x: X) => xs.concat([x])
  return tasks.reduce(
    (acc, task) => ap(acc.map(append))(task),
    of([]) as Task<E, A[]>,
  )
}

// sequenceObject :: Object (Task e Rn) -> Task L (Object Rn)
// TODO: is there anyway to make this type-safe(r)?
// const sequenceObject = <E, R>(tobj: Record<string, Task<E,any>> ) => {
const sequenceObject = <E, R>(tobj: { [key: string]: Task<E, any> }) => {
  const keys = Object.keys(tobj)
  const values = sequenceArray(Object.values(tobj))
  return values.map(vs =>
    keys.reduce((acc, key, index) => ({ ...acc, [key]: vs[index] }), {} as R),
  )
}

// traverseArray :: (a -> Task e b) -> List (Task e a) -> Task e (List b)
const traverseArray = <E, A, B>(f: Mapper<A, Task<E, B>>) => (tasks: A[]) =>
  sequenceArray(tasks.map(f))

// task constructor with some methods to allow dot-chaining
interface Task<E, A> {
  map: <B>(fn: Mapper<A, B>) => Task<E, B>
  mapError: <F>(fn: Mapper<E, F>) => Task<F, A>
  recover: <B>(fn: (l: E) => B) => Task<never, A | B>
  chain: <F, B>(fn: Mapper<A, Task<F, B>>) => Task<E | F, B>
  fork: TaskConstructor<E, A>
  toPromise(): Promise<A>
}
const Task = <E, A>(t: TaskConstructor<E, A>): Task<E, A> => ({
  map: fn => map(fn)(Task(t)),
  mapError: fn => mapError(fn)(Task(t)),
  chain: fn => chain(fn)(Task(t)),
  recover: fn => recover(fn)(Task(t)),
  fork: t,
  toPromise: () => toPromise(Task(t)),
})

export default Object.assign(Task, {
  of,
  fail,
  timeout,
  map,
  chain,
  recover,
  mapError,
  toPromise,
  fromPromise,
  ap,
  sequenceArray,
  sequenceObject,
  traverseArray,
})

type TaskType<E, A> = Task<E, A>
export { TaskType }
