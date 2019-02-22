const {createDocs} = require('../loader')

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
    expect(createDocs(titles, valueRanges)).toEqual(expected)
})
