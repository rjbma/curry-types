const log = (tag: string) => <X>(x: X) => (console.log(tag, x), x)

export { log }
