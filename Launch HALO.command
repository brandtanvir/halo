#!/bin/bash
# Double-click to serve the HALO site on http://localhost:4321
cd "$(dirname "$0")"
PORT=4321
( sleep 1 && open "http://localhost:$PORT" ) &
python3 -m http.server $PORT
