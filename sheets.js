'use strict'

const {google} = require('googleapis')

const util = require('./util')

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly']

class SheetsV4Client {
    constructor() {
        this.sheets = google.sheets({version: 'v4'})
        this.token = null
    }

    async auth(credsPath, tokenPath) {
        this.token = await auth(credsPath, tokenPath)
    }

    async getSpreadsheet(spreadsheetId) {
        const result = await this.sheets.spreadsheets.get({
            auth: this.token,
            spreadsheetId,
        })
        return result.data
    }

    async getValues(spreadsheetId, ranges) {
        const result = await this.sheets.spreadsheets.values.batchGet({
            auth: this.token,
            spreadsheetId,
            ranges,
        })
        return result.data
    }

    async getAllValues(spreadsheetId) {
        const spreadsheet = await this.getSpreadsheet(spreadsheetId)
        // A1 notation: "Sheet1" refers to all the cells in Sheet1.
        // https://developers.google.com/sheets/api/guides/concepts#a1_notation
        const ranges = spreadsheet.sheets
            .map(sheet => `'${sheet.properties.title}'`)
        return this.getValues(spreadsheetId, ranges)
    }
}

async function auth(credsPath, tokenPath) {
    const creds = await readJsonFile(credsPath)
    const {client_id, client_secret, redirect_uris} = creds.installed
    const oauth2 = new google.auth.OAuth2(client_id,
                                          client_secret,
                                          redirect_uris[0])
    return await loadToken(oauth2, tokenPath)
}

async function readJsonFile(file) {
    const data = await util.readFile(file)
    return JSON.parse(data)
}

async function loadToken(oauth2, tokenPath) {
    let token
    try {
        // Use saved token if available
        token = await readJsonFile(tokenPath)
        console.log(`Loaded token from ${tokenPath}`)
    }
    catch (err) {
        console.log(`Error loading token from ${tokenPath}: ${err.message}`)
        token = await getToken(oauth2)
        // Save the token for future use
        await util.writeFile(tokenPath, JSON.stringify(token))
        console.log(`Saved token to ${tokenPath}`)
    }
    oauth2.setCredentials(token)
    return oauth2
}

async function getToken(oauth2) {
    const url = oauth2.generateAuthUrl({access_type: 'offline', scope: SCOPES})
    console.log(`Grant access by visiting this URL in a browser: ${url}`)
    const code = await util.readLine('Enter the code: ')
    const result = await oauth2.getToken(code)
    return result.tokens
}

module.exports = {
    SheetsV4Client,
    auth,
}
