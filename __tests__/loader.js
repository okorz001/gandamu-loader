const loader = require('../loader')

test('createDoc', () => {
    const valueRange = {
        range: 'foo!A1:B2',
        values: [
            ['SOME', 'HEADER'],
            ['a', '1'],
            ['b', '2'],
        ],
    }
    const expected = {
        series: 'foo',
        appearances: [
            {name: 'a', total: 1},
            {name: 'b', total: 2},
        ],
    }
    expect(loader.createDoc(valueRange)).toEqual(expected)
})

test('createDoc with quoted title', () => {
    const valueRange = {
        range: "'Sheet 1'!A1:B2",
        values: [
            ['MORE', 'HEADERS'],
            ['c', '3'],
            ['d', '4'],
        ],
    }
    const expected = {
        series: 'Sheet 1',
        appearances: [
            {name: 'c', total: 3},
            {name: 'd', total: 4},
        ],
    }
    expect(loader.createDoc(valueRange)).toEqual(expected)
})
