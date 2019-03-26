'use strict'

const async = require('async')
const fs = require('fs')
const readline = require('readline')
const {promisify} = require('util')

const pmap = promisify(async.mapLimit)
const readFile = promisify(fs.readFile)
const writeFile = promisify(fs.writeFile)

function readLine(prompt) {
    // readline doesn't use promises or standard callbacks
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    })
    return new Promise(resolve => {
        rl.question(prompt, line => {
            rl.close()
            resolve(line)
        })
    })
}

module.exports = {
    pmap,
    readFile,
    writeFile,
    readLine,
}
