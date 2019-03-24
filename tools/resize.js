'use strict'

const fs = require('fs')
const fetch = require('node-fetch')
const {promisify} = require('util')

const image = require('../image')
const {SheetsV4Client} = require('../sheets')

const writeFile = promisify(fs.writeFile)
const mkdir = promisify(fs.mkdir)

const CREDS_PATH = 'secrets/credentials.json'
const TOKEN_PATH = 'secrets/token.json'
const SSID = '1aj-CNGfNTcCQVs1opkcxWYWrZvvQslkkSWIlgvSP7Ho'
const IMAGE_SIZE = {width: 40, height: 40}
const OUT_DIR = './out'

async function main() {
    const names = process.argv.slice(2)
    if (!names.length) {
        console.error('error: No mecha specified')
        process.exit(1)
    }

    const sheets = new SheetsV4Client()
    await sheets.auth(CREDS_PATH, TOKEN_PATH)
    const {valueRanges} = await sheets.getAllValues(SSID)

    if (valueRanges.length > 1) {
        console.log('Ignoring extra sheets')
    }
    // Remove headers
    const rows = valueRanges[0].values.slice(1)
        // Find rows by name
        .filter(values => names.includes(values[0]))
        // Skip rows without image and crop info
        .filter(values => values[2] && values[3] && values[4] && values[5] && values[6])

    try {
        await mkdir(OUT_DIR)
        console.log(`Created directory ${OUT_DIR}`)
    } catch (err) {
        if (err.code != 'EEXIST') {
            throw err
        }
    }

    for (const values of rows) {
        try {
            const res = await fetch(values[2])
            const source = {
                left: values[3] | 0,
                top: values[4] | 0,
                width: values[5] | 0,
                height: values[6] | 0,
            }
            const data = await image.cropAndResize(await res.buffer(), source, IMAGE_SIZE)

            const file = `${OUT_DIR}/${values[0]}.jpg`
            await writeFile(file, data)
            console.log(`Wrote ${file}`)
        } catch (err) {
            console.error(err)
        }
    }
}

main().catch(console.error)
