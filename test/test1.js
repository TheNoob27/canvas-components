const { Canvas } = require("../lib"), _ = Canvas
const save = require("./save")

const canvas = Canvas(
  _.div(null, [
    _.div({ style: { backgroundColor: "#ecd" } }, "abcdefg"),
    _.div({ style: { backgroundColor: "#ecd" } }, "hijklmnop")
  ])
)
console.dir(canvas, { depth: null })

const buffer = Canvas.render(canvas).toBuffer("image/png")
save(buffer, "test1")