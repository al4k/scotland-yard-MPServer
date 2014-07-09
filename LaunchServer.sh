#!/bin/bash

node create.js;
node add_to_files.js resources/images/map.jpg resources/graph.txt resources/pos.txt;
node server.js game_options.json;