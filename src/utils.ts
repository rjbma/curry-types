const log = (tag: string) => <X>(x: X) => (console.log(tag, x), x)

const letin = <S extends {}>(scope: S) => <R>(fn: (scope: S) => R) =>
  fn(scope) as R

export { log, letin }
