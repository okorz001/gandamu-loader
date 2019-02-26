'use strict'

const fs = require('fs')
const {google} = require('googleapis')
const {MongoClient} = require('mongodb')
const readline = require('readline')
const {promisify} = require('util')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']
const SHEET_ID = '1zmRKaSRbooYtKDV5IjD1FJr-LXlOcjZkpjzMnQp4VH0'

const CREDS_PATH = 'secrets/credentials.json'
const TOKEN_PATH = 'secrets/token.json'
const DB_CREDS_PATH = 'secrets/db.json'

const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

async function main() {
    const sheets = google.sheets({version: 'v4', auth: await auth()})
    const docs = await getDocs(sheets, SHEET_ID)

    const data = await readFile(DB_CREDS_PATH)
    const {url, user, password} = JSON.parse(data)
    const mongo = new MongoClient(url, {
        useNewUrlParser: true,
        auth: {user, password},
    })
    await mongo.connect()
    try {
        const db = await mongo.db('gundam')
        const col = await db.collection('appearances')
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
    const allProps = await getSheetProperties(sheets, spreadsheetId)
    const result = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: allProps.map(props => `'${props.title}'`),
    })
    // TODO: remove titles
    const titles = allProps.map(props => props.title)
    return createDocs(titles, result.data.valueRanges)
}

async function getSheetProperties(sheets, spreadsheetId) {
    const result = await sheets.spreadsheets.get({spreadsheetId})
    return result.data.sheets.map(sheet => sheet.properties)
}

function createDocs(titles, valueRanges) {
    return valueRanges.map((range, i) => {
        const series = titles[i]
        const appearances = range.values
            .filter(value => value[0])
            .map(([name, total]) => ({name, total: +total}))
        return {series, appearances}
    })
}

async function auth() {
    const data = await readFile(CREDS_PATH)
    const {client_secret, client_id, redirect_uris} = JSON.parse(data).installed
    const oauth2 = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0])
    return await loadToken(oauth2)
}

async function loadToken(oauth2) {
    let token
    try {
        const data = await readFile(TOKEN_PATH)
        token = JSON.parse(data)
        console.log(`Loaded token from ${TOKEN_PATH}`)
    }
    catch (err) {
        console.error(`Error loading token from ${TOKEN_PATH}: ${err.message}`)
        token = await getToken(oauth2)
        // Store the token to disk for later program executions
        await writeFile(TOKEN_PATH, JSON.stringify(token))
        console.log(`Saved token to ${TOKEN_PATH}`)
    }
    oauth2.setCredentials(token)
    return oauth2
}

function getToken(oauth2) {
    const url = oauth2.generateAuthUrl({access_type: 'offline', scope: SCOPES})
    console.log(`Authorize application at this URL: ${url}`)
    // readline doesn't use promises or standard callbacks
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({input: process.stdin, output: process.stdout})
        rl.question('Enter the code: ', code => {
            rl.close()
            oauth2.getToken(code, (err, token) => {
                if (err) return reject(err)
                resolve(token)
            })
        })
    })
}

module.exports = {
    main,
    // for testing
    createDocs,
}
