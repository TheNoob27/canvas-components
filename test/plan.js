const html = canvas.html`
  <div>
    test
    <p>idk</p>
  </div>
`
// html.render() // ?
canvas.render(html)

const res = canvas.render(
  canvas.div({ class: "m-4 p-1 bg-yellow-400", style: { display: "flex" } }, [
    canvas.p([
      "this is a",
      canvas.span({ class: "text-yellow-50" }, "test"),
    ])
  ])
)
res.toBuffer() // ?