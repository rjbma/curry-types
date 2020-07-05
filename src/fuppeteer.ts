import puppeteer, { Page, ElementHandle, Browser } from 'puppeteer'
import * as Task from './Task'
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

const launchBrowser = (options?: puppeteer.LaunchOptions | undefined) =>
  Task.fromPromise(() => puppeteer.launch(options))

const openPage = (url: string) => (browser: Browser) =>
  Task.fromPromise(() =>
    browser.newPage().then(page => page.goto(url).then(() => page)),
  )

// selectAll :: Selector -> DOM -> DOM[]
const selectAll = (sel: Selector) => (dom: DOM) =>
  Task.fromPromise(() => dom.$$(sel) as Promise<Element[]>)

// selectFirst :: Error -> Selector -> DOM -> DOM
const selectFirst = (sel: Selector) => (dom: DOM) =>
  Task.fromPromise(() => dom.$(sel)).chain(el =>
    el == null
      ? Task.fail(new Error(`No element found with selector '${sel}'`))
      : Task.of(el),
  )

// elementText :: Dom -> Future Err String
const elementInnerText = (dom: Element) =>
  Task.fromPromise(() =>
    dom
      .getProperty('innerText')
      .then(txt => txt.jsonValue())
      .then(v => String(v).trim() as string),
  )

// elementText :: Dom -> Future Err String
const elementInnerHtml = (dom: Element) =>
  Task.fromPromise(() =>
    dom
      .getProperty('innerHtml')
      .then(txt => txt.jsonValue())
      .then(v => String(v).trim() as string),
  )

// immediateText :: Dom -> Future Err String
const elementImmediateText = (dom: Element) =>
  Task.fromPromise(() =>
    dom.evaluate(
      el =>
        document.evaluate('text()', el, null, XPathResult.STRING_TYPE)
          .stringValue,
      dom,
    ),
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
  elementInnerText,
  elementInnerHtml,
  elementImmediateText,
  elementAttr,
  elementProp,
  evaluate,
  // types
  Page,
  Element,
}
