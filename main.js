const f = async (x, y) => new Promise(resolve => setTimeout(_ => resolve(x), y))
window.addEventListener('load', async function() {
  console.log(await f('Hello World!', 2000))
})