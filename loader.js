'use strict'

const {MongoClient} = require('mongodb')
const fetch = require('node-fetch')

const image = require('./image')
const {SheetsV4Client} = require('./sheets')
const util = require('./util')

const IMAGE_SIZE = {width: 40, height: 40}

// SpreadSheet IDs
const SSIDS = {
    appearances: '1zmRKaSRbooYtKDV5IjD1FJr-LXlOcjZkpjzMnQp4VH0',
    mecha: '1aj-CNGfNTcCQVs1opkcxWYWrZvvQslkkSWIlgvSP7Ho',
}

const CREDS_PATH = 'secrets/credentials.json'
const TOKEN_PATH = 'secrets/token.json'
const DB_CREDS_PATH = 'secrets/db.json'

async function main() {
    const sheets = new SheetsV4Client()
    await sheets.auth(CREDS_PATH, TOKEN_PATH)

    const data = await util.readFile(DB_CREDS_PATH)
    const {url, user, password} = JSON.parse(data)
    const mongo = new MongoClient(url, {
        useNewUrlParser: true,
        auth: {user, password},
    })
    await mongo.connect()

    try {
        const db = mongo.db('gundam')
        // These could be done in parallel, but not worth the effort
        await updateAppearances(await sheets.getAllValues(SSIDS.appearances),
                                db.collection('appearances'))
        await updateMecha(await sheets.getAllValues(SSIDS.mecha),
                          db.collection('mecha'))
        await updateImages(await sheets.getAllValues(SSIDS.mecha),
                          db.collection('images'))
    }
    finally {
        mongo.close()
    }
}

async function replace(col, docs, filter) {
    const ops = docs.map(doc => ({
        replaceOne: {
            filter: filter(doc),
            replacement: doc,
            upsert: true,
        },
    }))
    const result = await col.bulkWrite(ops)
    console.log(`Collection ${col.collectionName}:`,
                `${result.upsertedCount} inserted,`,
                `${result.matchedCount} matched,`,
                `${result.modifiedCount} updated`)
}

function filterByField(field) {
    return doc => ({[field]: doc[field]})
}

async function updateAppearances({valueRanges}, col) {
    // One document per sheet
    const docs = valueRanges.map(parseAppearances)
    await replace(col, docs, filterByField('series'))
}

function parseAppearances({range, values}) {
    // Extract sheet title from range
    const series = range.match(/^'?([^']+)'?!/)[1]
    const headers = values[0]
    const appearances = values.slice(1)
        // Skip placeholder rows
        .filter(values => values[0])
        .map(values => ({
            name: values[0],
            total: values[1] | 0,
            episodes: episodeSet(headers.slice(2), values.slice(2)),
        }))

    // TODO: the total cell is redundant
    appearances.forEach(({name, total, episodes}) => {
        if (total != Object.keys(episodes).length) {
            console.log(`(${series},${name}) has inconsistent count`)
        }
    })

    return {series, appearances}
}

function episodeSet(keys, values) {
    const episodes = {}
    keys.forEach((key, i) => {
        if (values[i] | 0) {
            episodes[key] = true
        }
    })
    return episodes
}

async function updateMecha({valueRanges}, col) {
    if (valueRanges.length > 1) {
        console.log('Ignoring extra mecha sheets')
    }
    // Remove headers
    const docs = valueRanges[0].values.slice(1)
        // Skip placeholder rows
        .filter(values => values[0])
        // One document per row
        .map(values => ({
            name: values[0],
            variant: values[1] || null,
            hasImage: !!values[2] && !!values[3] && !!values[4] && !!values[5] && !!values[6],
        }))
    await replace(col, docs, filterByField('name'))
}

async function updateImages({valueRanges}, col) {
    if (valueRanges.length > 1) {
        console.log('Ignoring extra mecha sheets')
    }
    // Remove headers
    const rows = valueRanges[0].values.slice(1)
        // Skip placeholder rows
        .filter(values => values[0])
        // Skip rows without image and crop info
        .filter(values => values[2] && values[3] && values[4] && values[5] && values[6])
    // One document per row
    const docs = await util.pmap(rows, 8, createImageDoc)
    await replace(col, docs, filterByField('name'))
}

async function createImageDoc(values) {
    const image = await createImage(values[2], {
        left: values[3] | 0,
        top: values[4] | 0,
        width: values[5] | 0,
        height: values[6] | 0,
    })
    return {name: values[0], image}
}

async function createImage(url, source) {
    const res = await fetch(url)
    return image.cropAndResize(await res.buffer(), source, IMAGE_SIZE)
}

module.exports = {
    main,
    // for testing
    parseAppearances,
}
