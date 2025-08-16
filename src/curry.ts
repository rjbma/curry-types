// simple case
// const curry2 = <T1, T2, T3>(
//   fn: (a: T1, b: T2) => T3,
// ): ((a: T1) => (b: T2) => T3) => {
//   return (a: T1) => {
//     return (b: T2) => {
//       return fn(a, b)
//     }
//   }
// }

// --- Helper type: drop first N elements from tuple ---
type Drop<
  N extends number,
  T extends any[],
  A extends any[] = [],
> = A['length'] extends N
  ? T
  : T extends [infer F, ...infer R]
  ? Drop<N, R, [...A, F]>
  : []

// --- Curry type: supports passing multiple args at once ---
type Curried<T> = T extends (...args: infer P) => infer R
  ? <U extends any[]>(
      ...args: U
    ) => U['length'] extends 0
      ? never // must provide at least one arg
      : U['length'] extends P['length']
      ? R
      : Curried<(...args: Drop<U['length'], P>) => R>
  : never

// --- Runtime implementation ---
function curry<T extends (...args: any[]) => any>(fn: T): Curried<T> {
  return function curried(...args: any[]): any {
    return args.length >= fn.length
      ? fn(...args)
      : (...next: any[]) => curried(...args, ...next)
  } as Curried<T>
}

export { curry }
