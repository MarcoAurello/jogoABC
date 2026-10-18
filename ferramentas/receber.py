# Servidor local só para a conversão dos áudios: serve a pasta do jogo e salva os .wav enviados pelo navegador.
# Uso: python ferramentas/receber.py  (porta 5551)
import http.server, os, re, sys
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DESTINO = os.path.join(RAIZ, 'audios')

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k):
        super().__init__(*a, directory=RAIZ, **k)
    def do_POST(self):
        nome = self.path.rsplit('/', 1)[-1]
        if not re.fullmatch(r'[a-z0-9-]+\.wav', nome):
            self.send_error(400); return
        dados = self.rfile.read(int(self.headers['Content-Length']))
        with open(os.path.join(DESTINO, nome), 'wb') as f:
            f.write(dados)
        self.send_response(200); self.end_headers(); self.wfile.write(b'ok')

http.server.ThreadingHTTPServer(('127.0.0.1', 5551), H).serve_forever()
