import * as Task from './Task'
import * as fup from '../src/fuppeteer'
import { exit } from 'process'

const add = (x: number) => (y: number) => x + y
// const task4 = Task.of(4)
// const task2 = Task.of(2)
// const taskAdd = Task.of(add)

// task4.chain(three => task2.map(add(three)))

// const x = Task.ap(taskAdd)(task4)
// const y = Task.ap(x)(task2)
// y.fork(console.log, console.log)

// Task.ap(task4.map(add))(task2).fork(console.log, console.log)

// // task4.map(add).ap(task2)
// Task.ap(Task.ap(taskAdd)(task4))(task2).fork(console.log, console.log)

// Task.liftA1(add(2)).ap(Task.of(33)).fork(console.log, console.log)

const delayN = (n: number) => Task.of(n).delay(n * 1000)

// const start = new Date().getTime()
// Task.liftA2(add)
//   .ap(delayN(1))
//   .ap(delayN(2))
//   // .ap(Task.of(3))
//   .map(n => n + 2)
//   .fork(console.log, res => console.log(res, new Date().getTime() - start))

const ts = [1, 2, 3, 4, 5, 8].map(n => Task.of(n).delay(n * 10))

const start = new Date().getTime()
// Task.sequenceArray(ts).fork(
Task.parallelArray(5)(ts).fork(
  e => console.error('err', e),
  r => {
    console.log('res', r, new Date().getTime() - start)
  },
)

// const t1 = Task.of(2).delay(2000)
// const t2 = Task.of(3).delay(3000)
// const start = new Date().getTime()
// t1.chain(() => t2).fork(console.log, res =>
//   console.log(res, new Date().getTime() - start),
// )

// const t1 = Task.of(2).delay(200)
// const t2 = Task.of(3).delay(100)
// const start = new Date().getTime()
// const t = Task.ap(Task.ap(Task.of(add))(t1))(t2)
// t.fork(
//   () => console.log('ERR'),
//   res => {
//     console.log(res, new Date().getTime() - start)
//   },
// )

// const t1 = Task.of(2).delay(1000)
// const t2 = Task.of(3).delay(500)
// const start = new Date().getTime()
// Task.of(add)
//   .ap(t1)
//   .ap(t2)
//   .fork(console.log, (res: any) =>
//     console.log(res, new Date().getTime() - start),
//   )

// TODO
// recover from error with default values. e.g., Task.fail('ERR').withDefault(2)
// rename recover to `withDefault`
// specify error. e.g., Task.fail("err").mapError("Scale is not available!")
// is it possible to make `ap` dot-chainable???

// country names
// fup.launchBrowser
//   .chain(fup.openPage('http://example.webscraping.com/'))
//   .chain(fup.selectAll('#results table td'))
//   .chain(el => Task.sequenceArray(R.map(fup.elementText)(el)))
//   .fork(console.error, console.log)

// country flags
// fup.launchBrowser
//   .chain(fup.openPage('http://example.webscraping.com/'))
//   .chain(fup.selectAll('#results table td img'))
//   .chain(R.compose(Task.sequenceArray, R.map(fup.elementAttr('src'))))
//   //   .chain(el => Task.sequenceArray(R.map(fup.elementText)(el)))
//   .fork(console.error, console.log)

interface Country {
  name: string
  flagUrl: string
}

// scrapeCountry :: DOM -> Task Error Country
const scrapeCountry = (dom: fup.Element) =>
  Task.sequenceObject<Error, Country>({
    name: fup.elementInnerText(dom),
    flagUrl: fup
      .selectFirst('img')(dom)
      .mapError(() => new Error('flag not found'))
      .chain(fup.elementAttr('src')),
  })

const scrapeCountries = () =>
  fup
    .launchBrowser()
    .chain(fup.openPage('http://example.webscraping.com/'))
    .chain(fup.selectAll('#results table td'))
    .chain(Task.traverseArray(scrapeCountry))
    // OR .chain(els => Task.sequenceArray(els.map(scrapeCountry)))
    .fork(console.error, console.log)

interface Character {
  name: string
  age: string
  pets: string
}

const scrapeCharacter = (dom: fup.Element) => {
  return Task.sequenceObject<Error, Character>({
    name: Task.of(dom)
      .chain(fup.selectFirst("[data-source='fullname'] .pi-data-value"))
      .mapError(() => new Error('Name element not found!'))
      .chain(fup.elementImmediateText),
    age: Task.of(dom)
      .chain(fup.selectFirst("[data-source='birthday'] .pi-data-value"))
      .mapError(() => new Error('Age element not found!'))
      .chain(fup.elementImmediateText),
    pets: Task.of(dom)
      .chain(fup.selectFirst("[data-source='pets'] .pi-data-value"))
      .chain(fup.elementInnerText)
      .recover(() => 'none'),
  })
}

const scrapeCharacters = (url: string) =>
  fup
    .launchBrowser()
    .chain(fup.openPage(url))
    .chain(page =>
      fup
        .selectFirst('.portable-infobox')(page)
        .mapError(() => new Error('Info for character not found on this page')),
    )
    .chain(scrapeCharacter)
    // OR .chain(els => Task.sequenceArray(els.map(scrapeCountry)))
    .fork(console.error, console.log)

// const scrapeCharacterWithPromises = (dom: ElementHandle) =>
//   dom.$("[data-source='fullname'] .pi-data-value")
//     .catch(err => { throw new Error("name not found")})
//     .then(el => el.getProperty('innerText'))
// const scrapeWithPromises = (url: string) =>
//   puppeteer
//     .launch()
//     .then(browser =>
//       browser.newPage().then(page => page.goto(url).then(() => page)),
//     )
//     .then(page =>
//       page.$('.portable-infobox').catch(err => {
//         throw new Error('invalid page. Details: ' + err.message)
//       }),
//     )
//     .then(r => console.log('result', r))
// scrapeWithPromises('https://gravityfalls.fandom.com/wiki/Mabel_Pines')

// scrapeCharacters('https://gravityfalls.fandom.com/wiki/Mabel_Pines')
// scrapeCharacters('https://gravityfalls.fandomd.com/wiki/Gideon_Gleeful')
// scrapeCharacters('https://www.google.es')
// scrapeCharacters('https://gravityfalls.fandom.com/wiki/Wendy_Corduroy')

interface Recipe {
  name: string
  prepTime: string
  totalTime: string
  servings: number
  ingredients: string[]
  steps: string[]
}

const scrapeRecipeMeta = (i: number) => (dom: fup.Page) =>
  fup
    .selectAll('.recipe-meta-item')(dom)
    .map(els => els[i])
    .chain(fup.selectFirst('.recipe-meta-item-body'))
    .chain(fup.elementInnerText)

const scrapeRecipe = (dom: fup.Page) =>
  fup
    .selectAll('.recipe-meta-item')(dom)
    .chain(Task.traverseArray(fup.elementInnerText))
// Task.sequenceObject<Error, Recipe>({
//   name: fup
//     .selectFirst('.recipe-content .headline')(dom)
//     .chain(fup.elementText),
//   prepTime: scrapeRecipeMeta(0)(dom),
//   totalTime: scrapeRecipeMeta(2)(dom),
//   servings: scrapeRecipeMeta(3)(dom).map(s => +s),
//   ingredients: fup
//     .selectAll('.ingredients-item .ingredients-item-name')(dom)
//     .map(is => is.map(fup.elementText))
//     .chain(Task.sequenceArray),
//   steps: fup
//     .selectAll('.instructions-section-item .section-body')(dom)
//     .chain(Task.traverseArray(fup.elementText)),
// })

const allr = () =>
  fup
    .launchBrowser()
    .chain(
      fup.openPage('https://www.allrecipes.com/recipe/13199/wonton-soup'),
      // fup.openPage(
      //   'https://www.allrecipes.com/recipe/228052/chinese-pork-dumplings',
      // ),
    )
    .chain(scrapeRecipe)

// allr().fork(console.error, console.log)

interface EChar {
  name: string
  tagline: string
  power: number
  hatIcon?: string
  imageUrl: string
}

const scrapeEChar = (dom: fup.Element) =>
  Task.sequenceObject<Error, EChar>({
    name: Task.of(dom)
      .chain(fup.selectFirst('.listView-column--name'))
      .chain(fup.elementInnerText),
    tagline: Task.of(dom)
      .chain(fup.selectFirst('.listView-column--tagline'))
      .chain(fup.elementInnerText),
    power: Task.of(dom)
      .chain(fup.selectFirst('.listView-column--power'))
      .chain(fup.elementInnerText),
    hatIcon: Task.of(dom)
      .chain(fup.selectFirst('.listView-column--hat img'))
      .chain(fup.elementAttr('src'))
      .recover(() => undefined),
    imageUrl: Task.of(dom)
      .chain(fup.selectFirst('.listView-column--img img'))
      .chain(fup.elementAttr('src'))
      .map(s => `https://rjbma.github.io/elm-listview/${s}`),
  })

const elmlistview = () =>
  fup
    .launchBrowser({ headless: true })
    .chain(fup.openPage('https://rjbma.github.io/elm-listview/'))
    .chain(elmLvPage([]))

const elmLvPage = (acc: EChar[]) => (
  page: fup.Page,
): Task.Type<Error, EChar[]> =>
  Task.of(page)
    .chain(fup.selectAll('.example1 .listView-row'))
    .chain(Task.traverseArray(scrapeEChar))
    .chain(data =>
      elmLvIsLastPage(page).chain(isLastPage =>
        isLastPage
          ? Task.of(acc.concat(data))
          : Task.of(page)
              .chain(fup.selectFirst('.listView-paginatorNextButton'))
              // TODO: `clickElement` probably should be in the standard fuppeteer API
              .chain(el => Task.fromPromise(() => el.click()))
              // must wait a reasonable amount of time so that the new page is rendered with JS...
              // TODO: ugly, a much better solution would be to wait until some selector is visible maybe?
              .delay(100)
              // recursively scrape the next page, accumulating already scraped results
              .chain(() => elmLvPage(acc.concat(data))(page)),
      ),
    )

// check if we're already in the last page by comparing the page indexes (current & last)
const elmLvIsLastPage = (page: fup.Page) =>
  // TODO: this should be done in parallel
  Task.of(page)
    .chain(fup.selectFirst('.listView-paginatorEndIndex'))
    .chain(fup.elementInnerText)
    .chain(endIndex =>
      Task.of(page)
        .chain(fup.selectFirst('.listView-paginatorRowCount'))
        .chain(fup.elementInnerText)
        .map(rowCount => +endIndex == +rowCount),
    )

// elmlistview().fork(console.error, console.log)
