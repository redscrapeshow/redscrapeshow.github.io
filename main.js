const f = async (x, y) => new Promise(resolve => setTimeout(_ => resolve(x), y))
window.addEventListener('load', async function() {
  console.log(await f('World!', 2000))
  console.log(await f('Hello', 1000))
})