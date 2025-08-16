import { Task, TaskType } from './Task'

type Mapper<T, U> = (value: T) => U

interface Either<L, R> {
  map: <R2>(fn: Mapper<R, R2>) => Either<L, R2>
  mapError: <L2>(fn: Mapper<L, L2>) => Either<L2, R>
  chain: <R2>(fn: Mapper<R, Either<L, R2>>) => Either<L, R2>
  isRight: () => boolean
  toTask: () => TaskType<L, R>
  toString(): string
}

type BinaryFun<A, B, C> = (a: A) => (b: B) => C
// liftA2: (a -> b -> c) -> Either l a -> Either l b -> Either lc
// const liftA2 = <A, B, C, L>(fn: BinaryFun<A, B, C>) => (a: Either<L, A>) => (
//   b: Either<L, B>
// ) => a.map(fn).chain(f => b.map(ib => f(ib)));
const liftA2 =
  <A, B, C, L>(fn: BinaryFun<A, B, C>) =>
  (a: Either<L, A>) =>
  (
    b: Either<L, B>,
    // ) => a.map(fn).ap(b)
  ) =>
    ap(a.map(fn))(b)

const ap =
  <A, B, L>(ffn: Either<L, Mapper<A, B>>) =>
  (fa: Either<L, A>) =>
    ffn.chain(fn => fa.map(a => fn(a)))

const Right = <L, R>(r: R): Either<L, R> => ({
  map: fn => Right(fn(r)),
  mapError: fn => Right(r),
  chain: fn => fn(r),
  isRight: () => true,
  toTask: () => Task.of(r),
  toString: () => `Right(${r})`,
})

const Left = <L, R>(l: L): Either<L, R> => ({
  map: () => Left(l),
  mapError: fn => Left(fn(l)),
  chain: () => Left(l),
  isRight: () => false,
  toTask: () => Task.fail(l),
  toString: () => `Left(${l})`,
})

const fromNullable =
  <L>(l: L) =>
  <R>(r: R): Either<L, NonNullable<R>> =>
    r == null ? Left<L, NonNullable<R>>(l) : Right<L, NonNullable<R>>(r)

const fromFailable =
  <L>(l: L) =>
  <R>(r: () => R) => {
    try {
      return fromNullable(l)(r())
    } catch (err) {
      return Left<L, R>(l)
    }
  }

const sequenceArray = <E, A>(arr: Either<E, A>[]): Either<E, A[]> =>
  arr.reduce((acc, bs) => {
    return acc.chain(as => bs.map(b => [...as, b]))
  }, Right([] as A[]))

const toTask = <E, A>(either: Either<E, A>): TaskType<E, A> => either.toTask()

const EitherModule = {
  Right,
  Left,
  of: <R>(v: R) => Right(v),
  fromNullable,
  fromFailable,
  map:
    <L, R, R2>(fn: Mapper<R, R2>) =>
    (m: Either<L, R>) =>
      m.isRight() ? m.map(fn) : m,
  sequenceArray,
  toTask,
}

export { EitherModule as Either, Either as EitherType }
