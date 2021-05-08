import { Canvas as NodeCanvas, CanvasRenderingContext2D, createCanvas } from "canvas"
import { ElementType, Parser } from "htmlparser2"
import DomHandler, { DomHandlerOptions, Element, Node, NodeWithChildren, Text } from "domhandler"
import CanvasElement, { ElementTypes, Attributes, AttributeStyles } from "./elements/Element"
import { normaliseTemplateStrings } from "./util"

interface CanvasRenderable {
  element: CanvasElement
  ctx: CanvasRenderingContext2D
}

function Canvas(element: CanvasElement, width: number = 1600, height: number = width * (9/16)): CanvasRenderable {
  const canvas = createCanvas(width, height),
    ctx = canvas.getContext("2d")
  if (!element) return element
  element._canvas = canvas
  element._ctx = ctx
  element.prepare()
  return { ctx, element }
}

/**
 * Shortcut for canvas elements.
 * @example
 * import Canvas, { _ } from "canvas-components"
 * Canvas(
 *   _.div({ class: "mr-2" }, [
 *     "hello",
 *     _.p({ class: "font-bold font-500" }, "world")
 *   ])
 * )
 */
Canvas._ = Canvas

Canvas.render = function render(toRender: CanvasRenderable) {
  const { element, ctx } = toRender
  element.render()
  return ctx.canvas as unknown as NodeCanvas
}

Canvas.from = function from(html: string, options?: DomHandlerOptions) {
  let res!: (Element & { data?: string })[]
  const parser = new Parser(new DomHandler((error, nodes) => {
    if (error) throw error
    res = nodes as typeof res
  }), options)
  parser.write(html)
  // note: parser uses a LOT of IF statements when processing chunks (63 to be exact), PER LETTER
  // so maybe i should fork it and make it more efficient? idk
  parser.end()

  let width: number, height: number
  const style = (string: string): AttributeStyles | undefined => {
    // for now, styles from html code is very limited, for example: no hue/rgb functions
    try {
      return JSON.parse( // cursed code
        `{${string
          .replace(
            /(\w+(?:-\w+)*):\s*(.+?)(?:;|$)/g,
            (_, name: string, value: string) =>
              `"${name.replace(/-\w/g, w => w.slice(1).toUpperCase())}": ${
                +value.replace(/px$/, "") || `"${value.replace(/\"/g, "")}"`
              },`
          )
          .replace(/,$/, "")}}`
      )
    } catch (e) {
      return undefined // should i throw?
    }
  }
  const parse = (node: typeof res[number]): CanvasElement | string | undefined => {
    if (node.type === ElementType.Text) return node.data === "\n" ? undefined : node.data
    if (!(node.name in ElementTypes) && node.name !== "body") return
    const attributes = node.attribs as any
    if (attributes?.style) attributes.style = style(attributes.style)
    if (node.name === "body") {
      if (width || height) return
      if (!width && (attributes?.width || !isNaN(attributes?.style?.width)))
        width = attributes.width || +attributes.style?.width
      if (!height && (attributes?.height || !isNaN(attributes?.style?.height)))
        height = attributes.height || +attributes.style?.height
      node.name = "div"
    }
    return Canvas[node.name as keyof typeof ElementTypes](
      attributes,
      node.children.map((n: Node) => parse(n as Element)!)//.filter(n => (n as any) !== undefined)
    )
  }
  return Canvas( // too many !'s here uh
    res.length > 1
      ? Canvas.div(
          {
            style: {
              width: ({ percent }) => percent(100),
              height: ({ percent }) => percent(100),
            },
          },
          res.map(node => parse(node)!) //.filter(n => n as any !== undefined)
        )
      : res.length
        ? parse(res[0])!
        : undefined as any,
    width!,
    height!
  )
}

Canvas.html = normaliseTemplateStrings(Canvas.from)

const element =
  (type: ElementTypes) =>
    (attributes?: Attributes, children?: string | CanvasElement | (string | CanvasElement)[]) =>
      new CanvasElement(type, attributes, children)

Canvas.div = element(ElementTypes.div)

export default Canvas
export { Canvas as _ }