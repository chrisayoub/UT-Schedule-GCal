#!/usr/bin/env bash

out='upload.zip'

rm ${out}

zip ${out} \
    images/* \
    main.js  \
    process.js \
    styles.css \
    popup.html \
    manifest.json
