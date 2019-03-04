'use strict'

const {MongoClient} = require('mongodb')

const {SheetsV4Client} = require('./sheets')
const util = require('./util')

const SHEET_ID = '1zmRKaSRbooYtKDV5IjD1FJr-LXlOcjZkpjzMnQp4VH0'

const CREDS_PATH = 'secrets/credentials.json'
const TOKEN_PATH = 'secrets/token.json'
const DB_CREDS_PATH = 'secrets/db.json'

async function main() {
    const sheets = new SheetsV4Client()
    await sheets.auth(CREDS_PATH, TOKEN_PATH)
    const docs = await getDocs(sheets, SHEET_ID)

    const data = await util.readFile(DB_CREDS_PATH)
    const {url, user, password} = JSON.parse(data)
    const mongo = new MongoClient(url, {
        useNewUrlParser: true,
        auth: {user, password},
    })
    await mongo.connect()
    try {
        const db = mongo.db('gundam')
        const col = db.collection('appearances')
        const ops = docs.map(doc => ({
            replaceOne: {
                filter: {series: doc.series},
                replacement: doc,
                upsert: true,
            },
        }))
        const result = await col.bulkWrite(ops)
        console.log(`Upserted ${result.upsertedCount}`)
        console.log(`Matched ${result.matchedCount}`)
        console.log(`Modified ${result.modifiedCount}`)
    }
    finally {
        mongo.close()
    }
}

async function getDocs(sheets, spreadsheetId) {
    const allValues = await sheets.getAllValues(spreadsheetId)
    return allValues.valueRanges.map(createDoc)
}

function createDoc({range, values}) {
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

module.exports = {
    main,
    // for testing
    createDoc,
}
