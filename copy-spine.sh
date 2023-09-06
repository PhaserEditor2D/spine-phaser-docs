#!/bin/bash

rm -Rf spine-phaser spine-core
cp -R ../spine-runtimes/spine-ts/spine-core .
cp -R ../spine-runtimes/spine-ts/spine-phaser .
rm -Rf **/src **/example **/dist/iife **/*.json **/*.tsbuildinfo **/LICENSE **/*.md