const loader = require('../loader')

test('createDoc series', () => {
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
    }
    expect(loader.createDoc(valueRange)).toMatchObject(expected)
})

test('createDoc series from quoted title', () => {
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
    }
    expect(loader.createDoc(valueRange)).toMatchObject(expected)
})

test('createDoc name, total', () => {
    const valueRange = {
        range: 'unused!A1:B2',
        values: [
            ['MORE', 'HEADERS'],
            ['c', '3'],
            ['d', '4'],
        ],
    }
    const expected = {
        appearances: [
            {name: 'c', total: 3},
            {name: 'd', total: 4},
        ],
    }
    expect(loader.createDoc(valueRange)).toMatchObject(expected)
})

test('createDoc episodes', () => {
    const valueRange = {
        range: 'unused!A1:B2',
        values: [
            ['NOT', 'USED', 'foo', 'bar'],
            ['a', '1', '1', '0'],
            ['b', '2', '1', '1'],
            ['c', '1', '0', '1'],
        ],
    }
    const expected = {
        appearances: [
            {episodes: {foo: true}},
            {episodes: {foo: true, bar: true}},
            {episodes: {bar: true}},
        ],
    }
    expect(loader.createDoc(valueRange)).toMatchObject(expected)
})

test('createDoc episodes with ?', () => {
    const valueRange = {
        range: 'unused!A1:B2',
        values: [
            ['NOT', 'USED', 'foo', 'bar'],
            ['a', '1', '?', '1'],
            ['b', '0', '0', '?'],
        ],
    }
    const expected = {
        appearances: [
            {episodes: {bar: true}},
            {episodes: {}},
        ],
    }
    expect(loader.createDoc(valueRange)).toMatchObject(expected)
})
