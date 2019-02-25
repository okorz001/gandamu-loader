const loader = require('../loader')

test.each([
    [1, 'A'],
    [2, 'B'],
    [26, 'Z'],
    [27, 'AA'],
    [52, 'AZ'],
    [53, 'BA'],
    [702, 'ZZ'],
    [703, 'AAA'],
])('column(%j) is %s', (input, expected) => {
    expect(loader.column(input)).toEqual(expected)
})

test.each([
    [0],
    [-1],
    [1.5],
    ['foo'],
])('column(%j) throws', input => {
    expect(() => loader.column(input)).toThrow()
})

function createProps(title, rowCount, columnCount) {
    return {title, gridProperties: {rowCount, columnCount}}
}

test.each([
    [createProps('foo', 3, 2), "'foo'!A1:B3"],
    [createProps('Sheet 1', 100, 27), "'Sheet 1'!A1:AA100"],
])('fullRange(%j) is %s', (props, expected) => {
    expect(loader.fullRange(props)).toEqual(expected)
})

test('createDocs', () => {
    const titles = ['foo', 'bar']
    const valueRanges = [
        {
            values: [
                ['a', '1'],
                ['b', '2'],
            ],
        },
        {
            values: [
                ['c', '3'],
                ['a', '4'],
            ],
        },
    ]
    const expected = [
        {
            series: 'foo',
            appearances: [
                {name: 'a', total: 1},
                {name: 'b', total: 2},
            ],
        },
        {
            series: 'bar',
            appearances: [
                {name: 'c', total: 3},
                {name: 'a', total: 4},
            ],
        },
    ]
    expect(loader.createDocs(titles, valueRanges)).toEqual(expected)
})
