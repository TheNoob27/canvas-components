import Constants from "../util/constants"
import convert from "color-convert"
import { Canvas, CanvasRenderingContext2D } from "canvas"

export enum ElementTypes {
  div,
}
export type Styles = typeof Constants["cssProperties"][number]
type SubProperty = "top" | "bottom" | "left" | "right"
type AttributeStyleValue =
  | string
  | number
  | ((helperFunctions: HelperFunctions) => string | number)
export type AttributeStyles = {
  [x in Styles]?: AttributeStyleValue | { [x in SubProperty]?: AttributeStyleValue }
}

export interface Attributes {
  class?: string
  className?: string
  style?: AttributeStyles
}

export interface HelperFunctions {
  rgb(r: number, g: number, b: number): string
  hsl(h: number, s: number, l: number): string
  percent(n: number, of?: Styles): number
  rem(n: number): number
  em(n: number): number
  cm(n: number): number
  mm(n: number): number
  inch(n: number): number
  pt(n: number): number
  pc(n: number): number
}

function parseColor(color: string) { // #fff, rgb(255, 255, 255), hsl(360, 100, 100)
  let res: number
  try {
    if (convert.keyword.hex(color as any)) res = parseInt(convert.keyword.hex(color as any), 16)
    // this throws if keyword is invalid
  } catch {}
  if (res! === undefined) {
    if (/^(?:#[a-f0-9]{3}|#[a-f0-9]{6})$/.test(color)) {
      let [, hex] = color.match(/#([a-f0-9]{3}|[a-f0-9]{6})/)!
      if (hex.length === 3) hex = hex.replace(/(\w)/g, "$1$1")
      res = parseInt(hex, 16)
    } else return null
  }
  return `#${res.toString(16).padStart(6, "0")}`
}

type ElementStyles = { [x in Styles]?: string | number }
export default class CanvasElement {
  private root: CanvasElement = this
  parent?: CanvasElement
  attributes: Attributes
  style?: ElementStyles
  children: (string | CanvasElement)[]

  _canvas?: Canvas
  _ctx?: CanvasRenderingContext2D

  x: number = 0
  y: number = 0

  constructor(public type: ElementTypes, attributes?: Attributes, children?: string | CanvasElement | (string | CanvasElement)[]) {
    this.attributes = {}
    if (typeof attributes?.style === "string") throw new TypeError("An element's style must be an object.")
    if (attributes && typeof attributes === "object") this.attributes = attributes
    if (attributes?.style) this.attributes.style = Object.assign({}, this.attributes.style)
    this.children = CanvasElement.children(children)
      .filter(c => !(c == null || (c as any) === false || (typeof c === "object" && !(c instanceof CanvasElement))))
      .map(c => (c instanceof CanvasElement ? c : String(c)))
  }

  prepare(parent?: CanvasElement, x: number = 0, y: number = 0) {
    this.parent = parent
    this.x = x
    this.y = y
    let root = this as CanvasElement
    while (root.parent) root = root.parent
    this.root = root
    this.parseStyles()
    this.children.forEach(c => {
      let shouldAdd: number
      if (typeof c === "string") {
        x += this.ctx.measureText(c).width
        const txt = this.ctx.measureText(c)
        shouldAdd = txt.actualBoundingBoxAscent + txt.actualBoundingBoxDescent
      } else {
        c.prepare(this, x, y)
        x += c.width
        shouldAdd = c.height
      }
      if (x >= this.canvas.width) {
        x = this.x
        y = shouldAdd
      }
    })
  }

  get canvas() {
    return this.root._canvas!
  }

  get ctx() {
    return this.root._ctx!
  }

  getStyle(style: Styles): string | number
  getStyle(style: Styles, value: string | number | (string | number | null)[]): boolean
  getStyle(style: Styles, value?: string | number | (string | number | null)[]): string | number | boolean | null {
    const s = this.style?.[<Styles>style]
    if (s == null) return (Array.isArray(value) ? value.includes(null) : value === null) ? true : null
    if (value !== undefined) return Array.isArray(value) ? value.includes(s) : s === value
    return s
  }

  hasStyle(style: Styles) {
    return this.style?.[<Styles>style] != null
  }

  get fontSize(): number {
    return (this._style.fontSize as number) || this.parent?.fontSize || 16
  }

  get _style() {
    return this.attributes?.style || {}
  }

  get width(): number {
    if (this.getStyle("display", ["block", null]) && !this.getStyle("width"))
      return (this.parent || this.canvas).width
    const fixedWidth = !this.getStyle("display", ["block", "inline-block"]) && this.getStyle("width")
    if (typeof fixedWidth === "number") return fixedWidth
    return this.children.reduce(
      (prev, child) => prev + (typeof child === "string" ? this.ctx.measureText(child).width : child.width),
      0
    )
  }

  get height(): number {
    const fixedHeight = !this.getStyle("display", ["block", "inline-block"]) && this.getStyle("width")
    if (typeof fixedHeight === "number") return fixedHeight
    return this.children.map(child => {
      if (typeof child === "string") {
        const txt = this.ctx.measureText(child)
        return txt.actualBoundingBoxAscent + txt.actualBoundingBoxDescent
      } else return child.height
    }).sort((a, b) => b - a)[0] || 0
  }

  private parseStyles() {
    if (this.style) return
    this.style = {}
    const helperFunctions: HelperFunctions = {
      rgb: (r: number, g: number, b: number) => `#${convert.rgb.hex(r, g, b)}`,
      hsl: (h: number, s: number, l: number) => `#${convert.hsl.hex([h, s, l])}`,
      percent: (n: number, of: "height" | "width") => (this.parent?.[of] as number || this.parent?.width || this.canvas.width) * (n / 100),
      rem: (n: number) => this.root.fontSize * n,
      em: (n: number) => this.fontSize * n,
      cm: (n: number) => n * (96 / 2.54),
      mm: (n: number) => n * (96 / 25.4),
      inch: (n: number) => n * 96,
      pt: (n: number) => n / 0.75,
      pc: (n: number) => n * 16,
    }

    for (const i in this._style) {
      const style = this._style[<Styles>i]
      if (!Array.isArray(style) && typeof style === "object") {
        for (const s in style) this._style[<Styles>`${i}${s[0].toUpperCase()}${s.slice(1)}`]
        // padding: { top: 1 } -> paddingTop: 1
        delete this._style[<Styles>i]
      }
    }
    if ("fontSize" in this._style) {
      const fontSize = this._style.fontSize!
      delete this._style.fontSize
      this.attributes.style = { fontSize, ...this._style }
    }

    for (const i in this._style) {
      if (!Constants.supportedProperties.includes(i))
        throw new TypeError(
          `${i} is not a ${Constants.cssProperties.includes(<Styles>i) ? "supported" : "valid"} CanvasElement style.`
        )
      let value = this._style[<Styles>i]!
      if (typeof value === "function") value = value(helperFunctions)
      const supportedValues = Constants.supportedValues[i as keyof typeof Constants["supportedValues"]]
      if (supportedValues && !supportedValues.includes(String(value)))
        throw new Error(`Unsupported value for ${i}: ${value}`)
      if (typeof value === "string") {
        const urLazy = value.match(/(\d+(?:.\d+)?)(rem|em|cm|mm|inch|pt|pc|%|px)/)
        if (urLazy) {
          switch (urLazy[2]) {
            case "%":
              value = helperFunctions.percent(+urLazy[1])
              break
            case "px":
              value = +urLazy[1]
              break
            default:
              value = helperFunctions[<"rem" | "em" | "cm" | "mm" | "inch" | "pt" | "pc">urLazy[2]](+urLazy[1])
          }
        }
      }
      if (/color/i.test(i)) {
        const color = parseColor(String(value))
        if (color) value = color
        else value = "#000000"
      } else value = typeof value === "number" ? value : String(value)
      this.style[<Styles>i] = value
    }
  }

  static children(children: string | CanvasElement | (string | CanvasElement)[] | undefined) {
    if (!children) return []
    return Array.isArray(children) ? children : [children]
  }

  // class props should be before static ones but i want render at the bottom
  render() {
    // no need to render anything if
    if (this.x >= this.canvas.width || this.x + this.width < 0 || this.y >= this.canvas.height || this.y + this.height < 0) return
    const ctx = this.ctx
    switch (this.type) {
      case ElementTypes.div: {
        if (this.hasStyle("backgroundColor")) {
          ctx.fillStyle = this.getStyle("backgroundColor") as string
          ctx.fillRect(this.x, this.y, this.width, this.height)
        }
        this.children.forEach((child, i) => {
          if (child instanceof CanvasElement) return child.render()
          ctx.font = `${this.fontSize}px _`
          ctx.textAlign = "left"
          child = child
            .split(/\b/)
            .reduce(
              (chunk, split) =>
                ctx.measureText(chunk.split("\n").slice(-1)[0] + split).width > this.width
                  ? chunk + "\n" + split
                  : chunk + split,
              ""
            )
          const [x, y] = this.children.slice(0, i).reduce(([pX, pY], child) => {
            let addX: number, addY: number
            if (typeof child !== "string") [addX, addY] = [child.x, child.y]
            else {
              const txt = this.ctx.measureText(child)
              ;[addX, addY] = [txt.width, txt.actualBoundingBoxAscent + txt.actualBoundingBoxDescent]
            }
            if (addX > this.width) return [this.x, pY + addY]
            return [pX + addX, pY]
          }, [0, 0])
          ctx.fillText(child, x, y)
        })
      }
    }
  }
}

/* 

- block is when the box uses `width` width



*/