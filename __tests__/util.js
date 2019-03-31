const util = require('../util')

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
}

test('pmap result', async () => {
    expect.assertions(1)
    const result = await util.pmap([1, 2, 3], 2, x => x * x)
    expect(result).toEqual([1, 4, 9])
})

test('pmap limit', async () => {
    const items = [1, 2, 3, 4, 5]
    expect.assertions(items.length + 1)
    const limit = 2

    var running = 0
    await util.pmap([1, 2, 3, 4, 5], limit, async x => {
        expect(++running).toBeLessThanOrEqual(limit)
        await wait(100)
        --running
    })
    expect(running).toBe(0)
})
