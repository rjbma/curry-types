import R from 'ramda'
import TaskInstance, { TaskType } from './Task'
import * as fup from '../src/fuppeteer'
import puppeteer, { Page, ElementHandle, Browser } from 'puppeteer'

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
  TaskInstance.sequenceObject<Error, Country>({
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
    .chain(TaskInstance.traverseArray(scrapeCountry))
    // OR .chain(els => Task.sequenceArray(els.map(scrapeCountry)))
    .fork(console.error, console.log)

// TODO
// typings for sequenceObject
// recover from error with default values. e.g., Task.fail('ERR').withDefault(2)
// specify error. e.g., Task.fail("err").mapError("Scale is not available!")

interface Character {
  name: string
  age: string
  pets: string
}

const scrapeCharacter = (dom: fup.Element) => {
  return TaskInstance.sequenceObject<Error, Character>({
    name: TaskInstance.of(dom)
      .chain(fup.selectFirst("[data-source='fullname'] .pi-data-value"))
      .mapError(() => new Error('Name element not found!'))
      .chain(fup.elementImmediateText),
    age: TaskInstance.of(dom)
      .chain(fup.selectFirst("[data-source='birthday'] .pi-data-value"))
      .mapError(() => new Error('Age element not found!'))
      .chain(fup.elementImmediateText),
    pets: TaskInstance.of(dom)
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
    .chain(TaskInstance.traverseArray(fup.elementInnerText))
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
  TaskInstance.sequenceObject<Error, EChar>({
    name: TaskInstance.of(dom)
      .chain(fup.selectFirst('.listView-column--name'))
      .chain(fup.elementInnerText),
    tagline: TaskInstance.of(dom)
      .chain(fup.selectFirst('.listView-column--tagline'))
      .chain(fup.elementInnerText),
    power: TaskInstance.of(dom)
      .chain(fup.selectFirst('.listView-column--power'))
      .chain(fup.elementInnerText),
    hatIcon: TaskInstance.of(dom)
      .chain(fup.selectFirst('.listView-column--hat'))
      .chain(fup.elementInnerText),
  })

const elmlistview = () =>
  fup
    .launchBrowser({ headless: false })
    .chain(fup.openPage('https://rjbma.github.io/elm-listview/'))
    .chain(elmLvPage)

const elmLvPage = (page: fup.Page): TaskType<Error, EChar[]> =>
  TaskInstance.of(page)
    .chain(fup.selectAll('.example1 .listView-row'))
    .chain(TaskInstance.traverseArray(scrapeEChar))
    .chain(data =>
      elmLvIsLastPage(page).chain(isLastPage =>
        isLastPage
          ? TaskInstance.of(data)
          : TaskInstance.of(page)
              .chain(fup.selectFirst('.listView-paginatorNextButton'))
              .chain(el => TaskInstance.fromPromise(() => el.click()))
              .chain(() => elmLvPage(page)),
      ),
    )

const elmLvIsLastPage = (page: fup.Page) =>
  TaskInstance.of(page)
    .chain(fup.selectFirst('.listView-paginatorEndIndex'))
    .chain(fup.elementInnerText)
    .chain(endIndex =>
      TaskInstance.of(page)
        .chain(fup.selectFirst('.listView-paginatorRowCount'))
        .chain(fup.elementInnerText)
        .map(rowCount => +endIndex == +rowCount),
    )

elmlistview().fork(console.error, console.log)
