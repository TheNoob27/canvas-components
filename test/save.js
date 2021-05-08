module.exports = function(buffer, name) {
  return require("fs").writeFileSync(
    require("path").join(__dirname, name + ".png"),
    buffer.toString("base64"),
    { encoding: "base64" }
  )
}