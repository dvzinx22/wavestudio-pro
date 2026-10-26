# WaveStudio Pro - Editor de Audio Multipista

Un estudio de edición y corte de audio multipista profesional que funciona directamente en tu navegador con una interfaz oscura, moderna y fluida.

---

## 🚀 Características Principales

1. **Arrastrar y Soltar Universal**:
   - Arrastra cualquier archivo de audio (**MP3, WAV, OGG, FLAC, AAC, WebM, M4A**) desde tu explorador de Windows directamente a la ventana o sobre una pista específica.
   - También puedes hacer clic en **"Importar Audio"** para seleccionar uno o varios archivos a la vez.

2. **Corte y División de Clips de Alta Precisión**:
   - **Herramienta Cortar / Cuchilla (C)**: Haz clic sobre cualquier punto de un fragmento de audio para dividirlo en dos partes independientes al instante.
   - **Dividir en el Cabezal (S)**: Coloca la barra de reproducción en el segundo deseado y presiona `S` para cortar el clip seleccionado.
   - **Recorte no destructivo en los extremos**: Pasa el ratón por el borde izquierdo o derecho de cualquier clip para recortarlo o alargarlo ajustando sus extremos.

3. **Mover y Desplazar entre Pistas**:
   - **Herramienta Mover (V)**: Arrastra clips horizontalmente a lo largo de la línea de tiempo.
   - **Cambio de pista vertical**: Arrastra un clip hacia arriba o hacia abajo para moverlo entre diferentes pistas.
   - **Ajuste Magnético (Snap to Grid)**: Selecciona entre Libre, 0.1s, 0.25s, 0.5s o 1.0s para alinear clips con precisión quirúrgica.

4. **Visualización de Formas de Onda (Waveforms)**:
   - Formas de onda detalladas renderizadas en Canvas en tiempo real para cada clip, con colores distintivos por pista.

5. **Mezclador Multipista**:
   - Controles independientes de **Mute (Silenciar)**, **Solo** y **Volumen** por cada pista.
   - Control de Volumen Maestro con vúmetro digital LED en tiempo real.
   - Botón para agregar nuevas pistas según tus necesidades.

6. **Generador Demo Integrado**:
   - Haz clic en **"Cargar Demo"** para crear al instante una pista de batería, bajo synth 808 y acordes sintetizados para probar todas las funciones sin necesidad de buscar archivos.

7. **Exportación a MP3 de Alta Calidad**:
   - Renderiza y descarga la mezcla combinada directamente en formato **MP3**.
   - Selector de calidad integrado:
     - **192 kbps (Alta Calidad - Recomendado)**
     - **320 kbps (Máxima Calidad de Estudio)**
     - **128 kbps (Tamaño Ligero para compartir rápido)**
     - *(Opcional: WAV sin compresión)*
   - Procesamiento en segundo plano con indicador de porcentaje en tiempo real sin bloquear la interfaz.

---

## ⌨️ Atajos de Teclado

| Atajo | Acción |
|---|---|
| <kbd>Espacio</kbd> | Reproducir / Pausar |
| <kbd>V</kbd> | Herramienta Puntero / Mover clips |
| <kbd>C</kbd> | Herramienta Cortar (Cuchilla) |
| <kbd>S</kbd> | Dividir clip seleccionado en la posición del cabezal |
| <kbd>Supr</kbd> / <kbd>Backspace</kbd> | Eliminar clip seleccionado |
| <kbd>Ctrl + D</kbd> | Duplicar clip seleccionado |
| <kbd>Inicio</kbd> o <kbd>0</kbd> | Volver al inicio (00:00.000) |
| <kbd>+</kbd> / <kbd>-</kbd> | Aumentar / Reducir zoom horizontal |

---

## 🖥️ Cómo Abrir el Programa

El servidor local ya se encuentra activo en tu computadora. Puedes acceder de dos formas:

1. Abrir en tu navegador web la dirección: **[http://localhost:8080/](http://localhost:8080/)**
2. O hacer doble clic en el archivo `iniciar.bat` ubicado en la carpeta del proyecto:
   `C:\Users\Windows 11\.gemini\antigravity-ide\scratch\audio-cutter-studio\iniciar.bat`
