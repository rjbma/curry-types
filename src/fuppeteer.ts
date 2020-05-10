import puppeteer, { Page, ElementHandle, Browser } from 'puppeteer'
import Task from './Task'
import Boom from 'boom'
import R from 'ramda'
import { log } from './utils'

type Url = string
type Err = {
  url: Url
  statusMsg: string
  statusCode?: number
}
type Element = ElementHandle
type DOM = Page | ElementHandle
type Selector = string

const launchBrowser = Task.fromPromise(() =>
  puppeteer.launch({ headless: true }),
)

const openPage = (url: string) => (browser: Browser) =>
  Task.fromPromise(() =>
    browser.newPage().then(page => page.goto(url).then(() => page)),
  )

// selectAll :: Selector -> DOM -> DOM[]
const selectAll = (sel: Selector) => (dom: DOM) =>
  Task.fromPromise(() => dom.$$(sel) as Promise<Element[]>)

// selectFirst :: Error -> Selector -> DOM -> DOM
const selectFirst = (sel: Selector) =>
  R.compose(
    Task.head(new Error(`No element found with selector '${sel}'`)),
    selectAll(sel),
  )

// elementText :: Dom -> Future Err String
const elementText = (dom: Element) =>
  Task.fromPromise(() =>
    dom
      .getProperty('innerText')
      .then(txt => txt.jsonValue())
      .then(v => String(v).trim() as string),
  )

// elementAttr :: String -> Dom -> Future Err (Maybe String)
const elementAttr = (attrName: string) => (dom: Element) =>
  Task.fromPromise(() =>
    dom
      .executionContext()
      .evaluate(
        (el, attrName) => el.getAttribute(attrName) as string,
        dom,
        attrName,
      ),
  )

// evaluate :: (Dom -> a) -> Dom -> Future Err a
const evaluate = <A>(fn: (dom: globalThis.Element) => A) => (
  dom: ElementHandle<globalThis.Element>,
) => Task.fromPromise(() => dom.evaluate(fn, dom))

// elementProp :: String -> Dom -> Future Err (Maybe String)
const elementProp = (propName: string) => (dom: Element) =>
  Task.fromPromise(() =>
    dom
      .evaluate(p => p.firstChild)
      .then(p => (p ? p.nodeName : 'nope'))
      .then(log('value'))
      // .evaluate(p => p.firstChild)
      // .then(x => x?.textContent)
      // .getProperty(propName)
      // .then(txt => txt.jsonValue())
      .then(v => String(v).trim() as string),
  )

export {
  launchBrowser,
  openPage,
  selectAll,
  selectFirst,
  elementText,
  elementAttr,
  elementProp,
  evaluate,
  // types
  Page,
  Element,
}

// const err = (e: any) => e.troString()
//
// const sequenceParallel = <E, T>(fs: TE.TaskEither<E, T>[]) =>
//   A.array.sequence(TE.taskEither)(fs)

// const sequenceSequential = <E, T>(fs: TE.TaskEither<E, T>[]) =>
//   A.array.sequence(TE.taskEitherSeq)(fs)

// const fork = <E, T>(errFn: (e: E) => unknown, fn: (t: T) => unknown) => (
//   f: TE.TaskEither<E, T>
// ) => {
//   return f()
//     .then(t => {
//       return E.fold(errFn, fn)(t)
//     })
//     .catch(err => errFn(err))
// }

/*
const open = (opts?: puppeteer.LaunchOptions) =>
  TE.tryCatch(() => puppeteer.launch(opts), err)

const openWithPage = (opts?: puppeteer.LaunchOptions) =>
  TE.tryCatch(
    () => puppeteer.launch(opts).then(browser => browser.newPage()),
    err,
  )

const close = (browse: puppeteer.Browser) =>
  TE.tryCatch(() => browse.close(), err)

const closeWithPage = (page: puppeteer.Page) =>
  TE.tryCatch(() => page.browser().close(), err)

type Action<E, A> = (browser: puppeteer.Browser) => TE.TaskEither<E, A>
type PageAction<E, A> = (page: puppeteer.Page) => TE.TaskEither<E, A>

const executeInBrowser = <E, A>(
  fn: Action<E, A>,
  opts?: puppeteer.LaunchOptions,
): TE.TaskEither<E, A> => TE.bracket(open(opts), fn, close)

const doInPage = <E, A>(
  fn: PageAction<E, A>,
  opts?: puppeteer.LaunchOptions,
): TE.TaskEither<E, A> => TE.bracket(openWithPage(opts), fn, closeWithPage)

// const doInPageOld = <E, A>(fn: PageAction<E, A>) => (url: Url) => (
//   browser: puppeteer.Browser
// ) =>
//   pipe(
//     // go to the specified page
//     gotoPage(url)(browser),
//     // TODO:remove this any!
//     // remove this any!
//     // remove this any!
//     // remove this any!
//     // adjust error type
//     TE.mapLeft((err: any) => err.toString()),
//     TE.chain(page =>
//       pipe(
//         // perform the desired action
//         fn(page),
//         res =>
//           pipe(
//             // always close the page
//             TE.map(TE.tryCatch(() => page.close(), err)),
//             // return the result of the executed action
//             () => res
//           )
//       )
//     )
//   )


// getHtml :: Url -> Future Err Html
// const getHtml = (url: Url): Future.Type<Err, Html> =>
//   pipe(
//     () =>
//       puppeteer.launch().then(browser =>
//         browser
//           .newPage()
//           .then(page => page.goto(url))
//           .then(response => {
//             if (response === null) {
//               throw {
//                 url,
//                 statusMsg: "Empty response",
//                 statusCode: 400,
//               } as Err
//             } else if (response.ok()) {
//               return response.text()
//             } else {
//               throw {
//                 url,
//                 statusMsg: response.statusText(),
//                 statusCode: response.status(),
//               } as Err
//             }
//           })
//           .finally(() => browser.close())
//       ),
//     Future.fromPromiseCurried(err => err)
//   )

// 1. loadDom :: Html -> DOM
// const loadDom = (html: string) => cheerio.load(html) //as (html: Html) => DOM

// 2. selectAll :: Selector -> DOM -> Future Err (List DOM)
// get all the elements that match the selector
// const selectAll = (sel: Selector) => (dom: DOM) => {
//   return fromPromise(() => dom.$$(sel))
// }

// 3. selectFirst :: Selector -> DOM -> Future Err (Maybe DOM)
// get the first element that matches the selector, wrapped in a Maybe
// const selectFirst = (sel: Selector) => (dom: DOM) =>
//   pipe(dom, selectAll(sel), TE.map(head))

type ErrorHandler = () => any
// 3. selectFirstWithError :: ErrorHandler -> Selector -> DOM -> Future Err DOM
// get the first element that matches the selectoe, or a specific error if no matches are found
const selectFirstWithError = (onError: ErrorHandler) => (sel: Selector) => (
  dom: DOM,
) => pipe(selectFirst(sel)(dom), TE.chain(TE.fromOption(onError)))

// 4. attr :: String -> Dom -> Future Err (Maybe String)
const attr = (attrName: string) => (dom: ElementHandle<Element>) =>
  pipe(dom, getProperty(attrName), TE.map(O.fromNullable))

// 4. attr :: String -> Dom -> Future Err String
const attrWithError = (onError: ErrorHandler) => (attrName: string) => (
  dom: ElementHandle<Element>,
) => pipe(attr(attrName)(dom), TE.chain(TE.fromOption(onError)))

// const evaluate = <T>(fn: (el: Element) => T) => (elh: ElementHandle<Element>) =>
//   fromPromise(() => elh.executionContext().evaluate(fn, elh))

const getProperty = (attrName: string) => (elh: ElementHandle<Element>) =>
  fromPromise(() =>
    elh
      .executionContext()
      .evaluate(
        (el, attrName) => el.getAttribute(attrName) as string,
        elh,
        attrName,
      ),
  )

export {
  executeInBrowser,
  doInPage,
  gotoPage,
  //   getHtml,
  selectAll,
  selectFirst,
  selectFirstWithError,
  attr,
  attrWithError,
  text,
  fork,
  fromPromise,
  sequenceParallel,
  sequenceSequential,
}

*/
