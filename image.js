'use strict'

const sharp = require('sharp')

const WHITE = {r: 255, g: 255, b: 255}

async function cropAndResize(buffer, source, target) {
    const image = sharp(buffer)
    const meta = await image.metadata

    // compute scale factor for resizing
    const scale = {
        width: target.width / source.width,
        height: target.height / source.height,
    }

    // sharp parameters
    const extract = Object.assign({}, source)
    const resize = Object.assign({}, target)
    const extend = {top: 0, bottom: 0, left: 0, right: 0, background: WHITE}

    if (source.left < 0) {
        // left is out of bounds
        extract.left = 0
        extract.width += source.left // left is already negative
        const pad = Math.round(-source.left * scale.width)
        resize.width -= pad
        extend.left = pad
    }

    if (source.left + source.width > meta.width) {
        // right is out of bounds
        extract.width = meta.width - extract.left
        const pad = Math.round((source.left + source.width - meta.width ) * scale.width)
        resize.width -= pad
        extend.right = pad
    }

    if (source.top < 0) {
        // top is out of bounds
        extract.top = 0
        extract.height += source.top // top is already negative
        const pad = Math.round(-source.top * scale.height)
        resize.height -= pad
        extend.top = pad
    }

    if (source.top + source.height > meta.height) {
        // bottom is out of bounds
        extract.height = meta.height - extract.top
        const pad = Math.round((source.top + source.height - meta.height ) * scale.height)
        resize.height -= pad
        extend.bottom = pad
    }

    return image
        .extract(extract)
        .resize(resize)
        .extend(extend)
        .jpeg({quality: 100})
        .toBuffer()
}

module.exports = {
    cropAndResize,
}
