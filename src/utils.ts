import { Either, EitherType } from './Either'
import request from 'request'
import { Task } from './Task'

type Curry2<A, B, R> = {
  (a: A): (b: B) => R
  (a: A, b: B): R
}
function curry2<A, B, R>(fn: (a: A, b: B) => R): Curry2<A, B, R> {
  return ((a: A, b?: B) =>
    b === undefined ? (b2: B) => fn(a, b2) : fn(a, b)) as Curry2<A, B, R>
}

type Curry3<A, B, C, R> = {
  (a: A): (b: B) => (c: C) => R
  (a: A, b: B): (c: C) => R
  (a: A, b: B, c: C): R
}
function curry3<A, B, C, R>(fn: (a: A, b: B, c: C) => R): Curry3<A, B, C, R> {
  return ((a: A, b?: B, c?: C) => {
    if (b === undefined) {
      return (b2: B) => (c2: C) => fn(a, b2, c2)
    }
    if (c === undefined) {
      return (c2: C) => fn(a, b, c2)
    }
    return fn(a, b, c)
  }) as Curry3<A, B, C, R>
}

const head = <T>(arr: T[]) => Either.fromNullable('Array is empty')(arr[0])

const getHtml = (url: string) =>
  Task.fromPromise(
    () =>
      new Promise<string>((res, rej) => {
        const opts = { method: 'GET', uri: url }
        request(opts, (error, response, body) => {
          if (error) {
            rej(error)
          } else {
            res(body)
          }
        })
      }),
  )

const Utils = {
  head,
  // curry2,
  // curry3,
  getHtml,
}

export { Utils }
