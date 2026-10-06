#!/usr/bin/env python3
"""
Servidor local que imita a Vercel (cleanUrls + rewrites de vercel.json).
Uso:  python3 scripts/dev-server.py   →   http://localhost:8765
"""
import http.server
import json
import os
import re
import socketserver

PORT = 8765
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

with open(os.path.join(ROOT, "vercel.json"), encoding="utf-8") as f:
    REWRITES = [
        (re.compile("^" + re.sub(r":(\w+)", r"(?P<\1>[^/]+)", r["source"]) + "$"), r["destination"])
        for r in json.load(f).get("rewrites", [])
    ]


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        clean = path.split("?", 1)[0].split("#", 1)[0]
        for pattern, destination in REWRITES:
            if pattern.match(clean):
                clean = destination
                break
        fs_path = super().translate_path(clean)
        if not os.path.exists(fs_path) and os.path.exists(fs_path + ".html"):
            return fs_path + ".html"
        return fs_path

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"SIRO en http://localhost:{PORT}")
    httpd.serve_forever()
