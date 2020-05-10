type Mapper<T, U> = (value: T) => U

interface Either<L, R> {
  map: <R2>(fn: Mapper<R, R2>) => Either<L, R2>
  chain: <R2>(fn: Mapper<R, Either<R, R2>>) => Either<L, R2>
  isRight: () => boolean
  toString(): string
}

type BinaryFun<A, B, C> = (a: A) => (b: B) => C
// liftA2: (a -> b -> c) -> Either l a -> Either l b -> Either lc
// const liftA2 = <A, B, C, L>(fn: BinaryFun<A, B, C>) => (a: Either<L, A>) => (
//   b: Either<L, B>
// ) => a.map(fn).chain(f => b.map(ib => f(ib)));
const liftA2 = <A, B, C, L>(fn: BinaryFun<A, B, C>) => (a: Either<L, A>) => (
  b: Either<L, B>,
  // ) => a.map(fn).ap(b)
) => ap(a.map(fn))(b)

const ap = <A, B, L>(ffn: Either<L, Mapper<A, B>>) => (fa: Either<L, A>) =>
  ffn.chain(fn => fa.map(a => fn(a)))

const Right = <L, R>(r: R): Either<L, R> => ({
  map: fn => Right(fn(r)),
  chain: fn => fn(r),
  isRight: () => true,
  toString: () => `Right(${r})`,
})

const Left = <L, R>(l: L): Either<L, R> => ({
  map: () => Left(l),
  chain: () => Left(l),
  isRight: () => false,
  toString: () => `Left(${l})`,
})

const fromNullable = <L>(l: L) => <R>(r: R) =>
  r == null ? Left<L, R>(l) : Right<L, R>(r)

const fromFailable = <L>(l: L) => <R>(r: () => R) => {
  try {
    return fromNullable(l)(r())
  } catch (err) {
    return Left<L, R>(l)
  }
}

export default {
  Right,
  Left,
  of: <R>(v: R) => Right(v),
  fromNullable,
  fromFailable,
  map: <L, R, R2>(fn: Mapper<R, R2>) => (m: Either<L, R>) =>
    m.isRight() ? m.map(fn) : m,
}
