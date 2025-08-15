// some helper types to make type signatures easier to read
type Mapper<T, U> = (value: T) => U
type Mapper2<A, B, C> = (a: A) => (b: B) => C
type Mapper3<A, B, C, D> = (a: A) => (b: B) => (c: C) => D
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
const map =
  <A, B>(fn: Mapper<A, B>) =>
  <E>(task: Task<E, A>) =>
    Task<E, B>((reject, resolve) => task.fork(reject, a => resolve(fn(a))))

// chain :: (a -> Task f b) -> Task e a -> Task (e | f) b
const chain =
  <F, A, B>(fn: Chainer<F, A, B>) =>
  <E>(task: Task<E, A>) =>
    Task<E | F, B>((reject, resolve) =>
      task.fork(
        e => reject(e),
        a => fork(reject, resolve)(fn(a)),
      ),
    )

// recovers from a failed task, transforming a possible error into a success
// successful tasks are not affected by this function
// recover :: (e -> b) -> Task e a -> Task never (a | b)
const recover =
  <E, B>(fn: Mapper<E, B>) =>
  <A>(task: Task<E, A>) =>
    Task<never, A | B>((_, resolve) =>
      task.fork(
        e => resolve(fn(e)),
        a => resolve(a),
      ),
    )

// mapError :: (e -> f) -> Task e a -> Task f a
const mapError =
  <E, F>(fn: Mapper<E, F>) =>
  <A>(task: Task<E, A>) =>
    Task<F, A>((reject, resolve) => task.fork(e => reject(fn(e)), resolve))

// fork :: (e -> void, a -> void) -> Task e a -> void
const fork =
  <E, A>(onReject: (e: E) => void, onResolve: (a: A) => void) =>
  (task: Task<E, A>) =>
    task.fork(onReject, onResolve)

// toPromise :: Task e a -> Promise a
const toPromise = <E, A>(task: Task<E, A>) =>
  new Promise<A>((resolve, reject) => fork(reject, resolve)(task))

// fromPromise :: (() -> Promise a) -> Task e a
const fromPromise = <A>(r: () => Promise<A>) =>
  Task<Error, A>((reject, resolve) => {
    try {
      r()
        .then(resolve)
        .catch((e: Error) => {
          reject(e)
        })
    } catch (e) {
      // sync error are also transformed into failed tasks
      reject(e as Error)
    }
  })

// fromNullable :: e -> a -> Task e a
const fromNullable =
  <E>(e: E) =>
  <A>(a: A) =>
    (a == null ? fail(e) : of(a)) as Task<E, A>

// timeout :: number -> (() -> a) -> Task never a
const timeout =
  (ms: number) =>
  <A>(fn: () => A) =>
    Task<never, A>((rej, res) => {
      setTimeout(() => res(fn()), ms)
    })

// ap :: Task e (a -> b) -> Task e a -> Task e b
const ap =
  <E, A, B>(taskMapper: Task<E, Mapper<A, B>>) =>
  (task: Task<E, A>) =>
    Task<E, B>(
      (reject, resolve) => {
        // `ap`'s implementation is a little more involved: we have two `Task`s to fork
        // However, unlike a monad, those tasks are independent from each other. Meaning they
        // can be forked in parallel and whichever is resolved last, will be responsible
        // for resolving the resulting task.
        // For that, we'll create a temp object that will hold either the resolved mapper or value:
        const resolved = {} as {
          mapper?: Mapper<A, B>
          a?: A
        }

        // Next, we can immediately fork both the task holding the mapper function and the
        // task holding the value. When one of them is resolved, it will check if the other
        // has been resolved:
        // - if yes, it can resolve the main task
        // - if not, store the result (either the mapper function or the value) for later
        taskMapper.fork(reject, resolvedMapper =>
          // here we use `('key' in obj)` syntax because it's possible that the value is undefined
          'a' in resolved
            ? resolve(resolvedMapper(resolved.a as A))
            : (resolved.mapper = resolvedMapper),
        )
        task.fork(reject, resolvedA =>
          resolved.mapper
            ? resolve(resolved.mapper(resolvedA))
            : (resolved.a = resolvedA),
        )
      },
      // Another possible (and much simpler) implementation for `ap` would be to simply
      // resolve both tasks sequentially using monadic chaining:
      // ```
      //      taskMapper.chain(f => task.map(f))
      // ```
      // However, that would be inneficient because it would introduce an unnecessary
      // dependency between the two tasks: it would always force us to resolve tasks
      // sequentially, instead of in parallel, even when those tasks are not dependent
      // on one another
    )

// parallelArray :: Int ->  List (Task e a) -> Task e (List a)
const parallelArray =
  (max: number) =>
  <E, A>(tasks: Task<E, A>[]): Task<E, A[]> =>
    Task((reject, resolve) => {
      const state = {
        // number of Tasks already started
        started: 0,
        // number of Tasks already resolved
        finished: 0,
        // result of the resolved Tasks
        result: [] as A[],
      }
      doOne()

      function doOne() {
        if (state.finished >= tasks.length) {
          resolve(state.result)
        } else if (state.started < tasks.length) {
          const inFlight = state.started - state.finished
          if (inFlight < max) {
            const index = state.started
            state.started++
            tasks[index].fork(reject, result => {
              state.result[index] = result
              state.finished++
              doOne()
            })
            doOne()
          }
        }
      }
    })

// sequenceArray :: List (Task e a) -> Task e (List a)
const sequenceArray = <E, A>(tasks: Task<E, A>[]): Task<E, A[]> =>
  parallelArray(1)(tasks) as Task<E, A[]>

// sequenceObject :: Object (Task e any) -> Task e (Object any)
// Transforms an object whose fields are Tasks into a Task with a "regular" objects with the same fields
// Note this doesn't type-check on the fields values (is it even possible in typescript?)
const sequenceObject = <E, A>(tobj: TaskObject<E, A>): Task<E, A> => {
  const keys = Object.keys(tobj)
  const values = sequenceArray<E, unknown>(Object.values(tobj))
  return values.map(vs =>
    keys.reduce((acc, key, index) => ({ ...acc, [key]: vs[index] }), {} as A),
  )
}
type TaskObject<E, T> = Record<keyof T, Task<E, any>>

// traverseArray :: (a -> Task e b) -> List (Task e a) -> Task e (List b)
const traverseArray =
  <E, A, B>(f: Mapper<A, Task<E, B>>) =>
  (tasks: A[]) =>
    sequenceArray(tasks.map(f))

// task constructor with some methods to allow dot-chaining
interface Task<E, A> {
  map: <B>(fn: Mapper<A, B>) => Task<E, B>
  mapError: <F>(fn: Mapper<E, F>) => Task<F, A>
  chain: <F, B>(fn: Mapper<A, Task<F, B>>) => Task<E | F, B>
  recover: <B>(fn: (l: E) => B) => Task<never, A | B>
  delay: (delay: number) => Task<E, A>
  fork: TaskConstructor<E, A>
  toPromise(): Promise<A>
  // ap: any
}
const Task = <E, A>(t: TaskConstructor<E, A>): Task<E, A> => ({
  map: fn => map(fn)(Task(t)),
  mapError: fn => mapError(fn)(Task(t)),
  chain: fn => chain(fn)(Task(t)),
  recover: fn => recover(fn)(Task(t)),
  delay: (delay: number) => Task(t).chain((a: A) => timeout(delay)(() => a)),
  fork: t,
  toPromise: () => toPromise(Task(t)),
  // @ts-ignore
  ap: <A1, A2>(a: Task<E, A1>) =>
    ap(Task(t) as unknown as Task<E, Mapper<A1, A2>>)(a),
})
interface TaskA1<E, A, B> extends Task<E, Mapper<A, B>> {
  ap: (a: Task<E, A>) => Task<E, B>
}
// lift :: (a -> b) -> Task never (a -> b)
const liftA1 = <A, B>(r: Mapper<A, B>): TaskA1<never, A, B> => addAp(of(r))

// type-unsafe way to add an `ap` function to a `Task`
const addAp = (t: any) => Object.assign(t, { ap: (a: any) => ap(t)(a) })

interface TaskA2<A, B, C> extends Task<never, Mapper2<A, B, C>> {
  ap: (a: Task<never, A>) => TaskA1<never, B, C>
}
// lift :: (a -> b -> c) -> Task never (a -> b -> c)
const liftA2 = <A, B, C>(f: Mapper2<A, B, C>) => addAp(of(f)) as TaskA2<A, B, C>

interface TaskA3<A, B, C, D> extends Task<never, Mapper3<A, B, C, D>> {
  ap: (a: Task<never, A>) => TaskA2<B, C, D>
}
// lift :: (a -> b -> c) -> Task never (a -> b -> c)
const liftA3 = <A, B, C, D>(f: Mapper3<A, B, C, D>) =>
  addAp(of(f)) as TaskA3<A, B, C, D>

const TaskModule = {
  of,
  liftA1,
  liftA2,
  liftA3,
  fail,
  timeout,
  map,
  chain,
  recover,
  mapError,
  toPromise,
  fromPromise,
  fromNullable,
  ap,
  sequenceArray,
  sequenceObject,
  parallelArray,
  traverseArray,
}

export { TaskModule as Task, Task as TaskType }
