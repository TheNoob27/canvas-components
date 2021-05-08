export function normaliseTemplateStrings<F = unknown>(func: (str: string) => F) {
  return (chunks: string[], ...inters: any[]) =>
    func(chunks.reduce((total, chunk, i) => total + chunk + (i === inters.length ? "" : inters[i]), "").trim())
}