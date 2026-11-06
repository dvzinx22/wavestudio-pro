import os
import sys
import threading
import socket
import time
from http.server import HTTPServer, SimpleHTTPRequestHandler
import webview

# Directorio de la aplicación
APP_DIR = os.path.dirname(os.path.abspath(__file__))
os.chdir(APP_DIR)

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass  # Silenciar logs para ventana limpia

def find_free_port(preferred=8080):
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', preferred))
            return preferred
    except OSError:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(('127.0.0.1', 0))
            return s.getsockname()[1]

def start_server(port):
    server = HTTPServer(('127.0.0.1', port), QuietHandler)
    server.serve_forever()

if __name__ == '__main__':
    port = find_free_port(8080)
    server_thread = threading.Thread(target=start_server, args=(port,), daemon=True)
    server_thread.start()
    time.sleep(0.3)

    # Crear ventana nativa de escritorio
    window = webview.create_window(
        title='WaveStudio Pro — Editor de Audio',
        url=f'http://127.0.0.1:{port}',
        width=1320,
        height=860,
        min_size=(960, 640),
        resizable=True,
        background_color='#12131C'
    )
    
    # Iniciar aplicación de escritorio
    webview.start()
