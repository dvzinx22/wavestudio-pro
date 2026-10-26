/**
 * WaveStudio Pro - Multi-Track Audio Editor
 * Pure Web Audio API & Canvas Audio Sequencer
 */

class WaveStudioApp {
  constructor() {
    // Audio Context & Nodes
    this.audioCtx = null;
    this.masterGain = null;
    this.analyser = null;
    this.activeSources = [];
    this.isPlaying = false;
    this.playbackStartTime = 0;
    this.playheadTime = 0;
    this.animFrameId = null;

    // Timeline Configuration
    this.pixelsPerSecond = 60; // Base zoom
    this.zoomScale = 1.0;
    this.snapSeconds = 0.5;
    this.activeTool = 'pointer'; // 'pointer' or 'cut'
    this.selectedClipId = null;

    // Project Data Model
    this.tracks = [];
    this.clips = [];
    this.trackColorPalette = [
      { name: 'Indigo', bg: 'var(--clip-bg-1)', border: 'var(--clip-border-1)', color: '#6366f1' },
      { name: 'Cyan', bg: 'var(--clip-bg-2)', border: 'var(--clip-border-2)', color: '#06b6d4' },
      { name: 'Pink', bg: 'var(--clip-bg-3)', border: 'var(--clip-border-3)', color: '#ec4899' },
      { name: 'Emerald', bg: 'var(--clip-bg-4)', border: 'var(--clip-border-4)', color: '#10b981' },
      { name: 'Amber', bg: 'var(--clip-bg-5)', border: 'var(--clip-border-5)', color: '#f59e0b' }
    ];

    // Drag State
    this.dragState = null;

    // DOM Elements Cache
    this.dom = {
      fileInput: document.getElementById('audio-file-input'),
      btnDemo: document.getElementById('btn-demo'),
      btnPlay: document.getElementById('btn-play'),
      playIcon: document.getElementById('play-icon'),
      pauseIcon: document.getElementById('pause-icon'),
      btnStop: document.getElementById('btn-stop'),
      btnToStart: document.getElementById('btn-to-start'),
      masterVol: document.getElementById('master-vol'),
      vuBar: document.getElementById('vu-meter-bar'),
      timeDisplay: document.getElementById('time-display'),
      toolPointer: document.getElementById('tool-pointer'),
      toolCut: document.getElementById('tool-cut'),
      btnSplitPlayhead: document.getElementById('btn-split-playhead'),
      snapSelect: document.getElementById('snap-select'),
      btnZoomIn: document.getElementById('btn-zoom-in'),
      btnZoomOut: document.getElementById('btn-zoom-out'),
      zoomLevel: document.getElementById('zoom-level'),
      btnExport: document.getElementById('btn-export'),
      btnExportText: document.getElementById('btn-export-text'),
      exportFormat: document.getElementById('export-format'),
      btnAddTrack: document.getElementById('btn-add-track'),
      trackHeaders: document.getElementById('track-headers'),
      trackLanes: document.getElementById('track-lanes'),
      tracksViewport: document.getElementById('tracks-viewport'),
      cursorGuide: document.getElementById('cursor-guide'),
      cursorGuideTime: document.getElementById('cursor-guide-time'),
      rulerCanvas: document.getElementById('ruler-canvas'),
      rulerWrapper: document.getElementById('timeline-ruler-wrapper'),
      playhead: document.getElementById('playhead'),
      dropOverlay: document.getElementById('drop-overlay'),
      statusText: document.getElementById('status-text'),
      selectionInfo: document.getElementById('selection-info'),
      btnDuplicate: document.getElementById('btn-duplicate-clip'),
      btnDelete: document.getElementById('btn-delete-clip'),
      btnHelp: document.getElementById('btn-help'),
      helpModal: document.getElementById('help-modal'),
      btnCloseModal: document.getElementById('btn-close-modal')
    };

    this.init();
  }

  /* ==========================================================================
     Initialization
     ========================================================================== */
  init() {
    this.initEventListeners();
    this.initRuler();

    // Create 3 default empty tracks
    this.addTrack('Pista 1 - Principal');
    this.addTrack('Pista 2 - Acompañamiento');
    this.addTrack('Pista 3 - Efectos');

    this.updateTimelineUI();
    this.setStatus('Listo. Arrastra archivos de audio en cualquier pista.');
  }

  getAudioContext() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContextClass();

      // Master Gain
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.value = parseFloat(this.dom.masterVol.value);

      // Master Analyser for VU Meter
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 128;
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      this.startVUMeterLoop();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /* ==========================================================================
     Event Listeners
     ========================================================================== */
  initEventListeners() {
    // Window Resize
    window.addEventListener('resize', () => {
      this.renderRuler();
      this.renderAllWaveforms();
    });

    // File Input
    this.dom.fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.loadAudioFiles(Array.from(e.target.files));
        this.dom.fileInput.value = '';
      }
    });

    // Demo Button
    this.dom.btnDemo.addEventListener('click', () => {
      this.loadDemoTracks();
    });

    // Playback Controls
    this.dom.btnPlay.addEventListener('click', () => this.togglePlay());
    this.dom.btnStop.addEventListener('click', () => this.stop());
    this.dom.btnToStart.addEventListener('click', () => this.seekTo(0));

    // Master Volume
    this.dom.masterVol.addEventListener('input', (e) => {
      if (this.masterGain) {
        this.masterGain.gain.value = parseFloat(e.target.value);
      }
    });

    // Tool Selection
    this.dom.toolPointer.addEventListener('click', () => this.setTool('pointer'));
    this.dom.toolCut.addEventListener('click', () => this.setTool('cut'));
    this.dom.btnSplitPlayhead.addEventListener('click', () => this.splitSelectedAtPlayhead());

    // Snap Setting
    this.dom.snapSelect.addEventListener('change', (e) => {
      this.snapSeconds = parseFloat(e.target.value);
    });

    // Zoom Controls
    this.dom.btnZoomIn.addEventListener('click', () => this.zoom(1.25));
    this.dom.btnZoomOut.addEventListener('click', () => this.zoom(0.8));

    // Export Mixdown
    this.dom.btnExport.addEventListener('click', () => this.exportMixdown());
    if (this.dom.exportFormat) {
      this.dom.exportFormat.addEventListener('change', (e) => {
        if (this.dom.btnExportText) {
          this.dom.btnExportText.textContent = e.target.value === 'wav' ? 'Exportar WAV' : 'Exportar MP3';
        }
      });
    }

    // Add Track
    this.dom.btnAddTrack.addEventListener('click', () => {
      this.addTrack(`Pista ${this.tracks.length + 1}`);
    });

    // Clip Selection Actions
    this.dom.btnDuplicate.addEventListener('click', () => this.duplicateSelectedClip());
    this.dom.btnDelete.addEventListener('click', () => this.deleteSelectedClip());

    // Help Modal
    this.dom.btnHelp.addEventListener('click', () => {
      this.dom.helpModal.style.display = 'flex';
    });
    this.dom.btnCloseModal.addEventListener('click', () => {
      this.dom.helpModal.style.display = 'none';
    });
    this.dom.helpModal.addEventListener('click', (e) => {
      if (e.target === this.dom.helpModal) {
        this.dom.helpModal.style.display = 'none';
      }
    });

    // Drag and Drop (Window & Track Viewport)
    this.initDragAndDrop();

    // Timeline Scrubbing & Ruler Clicking
    this.initRulerScrubbing();

    // Mouse Move & Up for Global Clip Dragging/Trimming
    window.addEventListener('mousemove', (e) => this.handleGlobalMouseMove(e));
    window.addEventListener('mouseup', (e) => this.handleGlobalMouseUp(e));

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => this.handleKeydown(e));

    // Sync vertical scroll between track headers and viewport
    this.dom.tracksViewport.addEventListener('scroll', () => {
      this.dom.trackHeaders.scrollTop = this.dom.tracksViewport.scrollTop;
      this.dom.rulerWrapper.scrollLeft = this.dom.tracksViewport.scrollLeft;
    });

    // Real-time Cursor Guide on Hover
    this.dom.tracksViewport.addEventListener('mousemove', (e) => {
      if (this.dragState) {
        if (this.dom.cursorGuide) this.dom.cursorGuide.classList.remove('active');
        return;
      }
      const rect = this.dom.trackLanes.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      if (mouseX < 0) return;
      const pxPerSec = this.pixelsPerSecond * this.zoomScale;
      const timeAtMouse = Math.max(0, mouseX / pxPerSec);

      if (this.dom.cursorGuide) {
        this.dom.cursorGuide.classList.add('active');
        this.dom.cursorGuide.style.transform = `translateX(${mouseX}px)`;
        if (this.dom.cursorGuideTime) {
          this.dom.cursorGuideTime.textContent = this.formatTimeDisplay(timeAtMouse);
        }
      }
    });

    this.dom.tracksViewport.addEventListener('mouseleave', () => {
      if (this.dom.cursorGuide) {
        this.dom.cursorGuide.classList.remove('active');
      }
    });

    // Clicking anywhere on track empty space instantly moves playhead to cursor position
    this.dom.tracksViewport.addEventListener('mousedown', (e) => {
      if (e.target.dataset.handle || e.target.closest('.audio-clip')) return;
      const rect = this.dom.trackLanes.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const pxPerSec = this.pixelsPerSecond * this.zoomScale;
      let targetTime = Math.max(0, clickX / pxPerSec);
      if (this.snapSeconds > 0) {
        targetTime = Math.round(targetTime / this.snapSeconds) * this.snapSeconds;
      }
      this.seekTo(targetTime);
    });
  }

  /* ==========================================================================
     Drag & Drop Management (Audio Files)
     ========================================================================== */
  initDragAndDrop() {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      this.dom.dropOverlay.classList.add('active');
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        this.dom.dropOverlay.classList.remove('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
      e.preventDefault();
      dragCounter = 0;
      this.dom.dropOverlay.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        this.loadAudioFiles(Array.from(e.dataTransfer.files));
      }
    });
  }

  /* ==========================================================================
     Audio File Decoding & Loading
     ========================================================================== */
  async loadAudioFiles(files) {
    const audioFiles = files.filter(f => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|flac|aac|m4a|weba|webm)$/i.test(f.name));

    if (audioFiles.length === 0) {
      this.setStatus('⚠️ Por favor selecciona archivos con formato de audio válido.');
      return;
    }

    const audioCtx = this.getAudioContext();
    this.setStatus(`⏳ Decodificando ${audioFiles.length} archivo(s)...`);

    for (let i = 0; i < audioFiles.length; i++) {
      const file = audioFiles[i];
      try {
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

        // Find or create a target track
        let targetTrackIndex = (this.tracks.length > i) ? i : this.tracks.length;
        if (targetTrackIndex >= this.tracks.length) {
          this.addTrack(`Pista ${targetTrackIndex + 1}`);
        }
        const targetTrack = this.tracks[targetTrackIndex];

        // Create clip
        this.createClip({
          trackId: targetTrack.id,
          name: file.name.replace(/\.[^/.]+$/, ''),
          buffer: audioBuffer,
          startTime: 0,
          offset: 0,
          duration: audioBuffer.duration
        });

      } catch (err) {
        console.error('Error al decodificar audio:', err);
        this.setStatus(`⚠️ No se pudo procesar ${file.name}. Asegúrate de que el formato sea compatible.`);
      }
    }

    this.setStatus(`✅ ${audioFiles.length} pista(s) de audio cargadas correctamente.`);
    this.updateTimelineUI();
  }

  /* ==========================================================================
     Demo Audio Synthesizer (Instant Testing)
     ========================================================================== */
  async loadDemoTracks() {
    const audioCtx = this.getAudioContext();
    this.setStatus('⏳ Generando pistas de demostración...');

    // Clear existing clips
    this.clips = [];

    // Ensure at least 3 tracks
    while (this.tracks.length < 3) {
      this.addTrack(`Pista ${this.tracks.length + 1}`);
    }
    this.tracks[0].name = 'Batería (Groove)';
    this.tracks[1].name = 'Bajo (Synth 808)';
    this.tracks[2].name = 'Melodía / Acordes';
    this.renderTrackHeaders();

    const sampleRate = audioCtx.sampleRate;
    const bpm = 120;
    const beatDuration = 60 / bpm; // 0.5s
    const totalBars = 4;
    const totalSeconds = totalBars * 4 * beatDuration; // 8.0s

    // 1. Synthesize Drums Loop
    const drumBuffer = audioCtx.createBuffer(2, sampleRate * totalSeconds, sampleRate);
    const leftDrums = drumBuffer.getChannelData(0);
    const rightDrums = drumBuffer.getChannelData(1);

    for (let beat = 0; beat < totalBars * 4; beat++) {
      const startSample = Math.floor(beat * beatDuration * sampleRate);

      // Kick on beat 0, 2, 4, 6...
      if (beat % 2 === 0) {
        const kickLength = Math.floor(0.25 * sampleRate);
        for (let i = 0; i < kickLength && (startSample + i) < leftDrums.length; i++) {
          const t = i / sampleRate;
          const freq = 120 * Math.exp(-t * 22);
          const sample = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 12) * 0.9;
          leftDrums[startSample + i] += sample;
          rightDrums[startSample + i] += sample;
        }
      }

      // Snare on beat 1, 3, 5, 7...
      if (beat % 2 === 1) {
        const snareLength = Math.floor(0.2 * sampleRate);
        for (let i = 0; i < snareLength && (startSample + i) < leftDrums.length; i++) {
          const t = i / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 20) * 0.6;
          const tone = Math.sin(2 * Math.PI * 180 * t) * Math.exp(-t * 25) * 0.5;
          leftDrums[startSample + i] += (noise + tone) * 0.8;
          rightDrums[startSample + i] += (noise + tone) * 0.8;
        }
      }

      // Hi-Hats on every 8th note
      const hat1 = startSample;
      const hat2 = startSample + Math.floor(0.25 * sampleRate);
      [hat1, hat2].forEach(hStart => {
        const hatLen = Math.floor(0.05 * sampleRate);
        for (let i = 0; i < hatLen && (hStart + i) < leftDrums.length; i++) {
          const t = i / sampleRate;
          const noise = (Math.random() * 2 - 1) * Math.exp(-t * 80) * 0.35;
          leftDrums[hStart + i] += noise * 0.7;
          rightDrums[hStart + i] += noise * 0.9;
        }
      });
    }

    // 2. Synthesize Bass Loop (A minor / F / C / G)
    const bassBuffer = audioCtx.createBuffer(2, sampleRate * totalSeconds, sampleRate);
    const leftBass = bassBuffer.getChannelData(0);
    const rightBass = bassBuffer.getChannelData(1);
    const bassNotes = [55, 43.65, 65.4, 49]; // A1, F1, C2, G1

    for (let bar = 0; bar < totalBars; bar++) {
      const rootFreq = bassNotes[bar % bassNotes.length];
      for (let noteIdx = 0; noteIdx < 4; noteIdx++) {
        const noteStart = Math.floor((bar * 2 + noteIdx * 0.5) * sampleRate);
        const noteLen = Math.floor(0.42 * sampleRate);

        for (let i = 0; i < noteLen && (noteStart + i) < leftBass.length; i++) {
          const t = i / sampleRate;
          const f = rootFreq;
          // Sub-bass sine + slight saw harmonics
          const s1 = Math.sin(2 * Math.PI * f * t);
          const s2 = Math.sin(2 * Math.PI * (f * 2) * t) * 0.3;
          const env = Math.exp(-t * 3.5);
          const sample = (s1 + s2) * env * 0.8;
          leftBass[noteStart + i] += sample;
          rightBass[noteStart + i] += sample;
        }
      }
    }

    // 3. Synthesize Lush Melody / Chords Loop
    const melodyBuffer = audioCtx.createBuffer(2, sampleRate * totalSeconds, sampleRate);
    const leftMel = melodyBuffer.getChannelData(0);
    const rightMel = melodyBuffer.getChannelData(1);
    const chords = [
      [220, 261.63, 329.63, 392], // Am7
      [174.61, 220, 261.63, 329.63], // Fmaj7
      [261.63, 329.63, 392, 493.88], // Cmaj7
      [196, 246.94, 293.66, 392] // G7
    ];

    for (let bar = 0; bar < totalBars; bar++) {
      const chord = chords[bar % chords.length];
      const barStart = Math.floor(bar * 2 * sampleRate);
      const chordLen = Math.floor(1.9 * sampleRate);

      for (let i = 0; i < chordLen && (barStart + i) < leftMel.length; i++) {
        const t = i / sampleRate;
        let sumL = 0;
        let sumR = 0;

        chord.forEach((freq, idx) => {
          // Detuned chorus
          const pan = (idx / (chord.length - 1)) * 2 - 1; // -1 to 1
          const osc1 = Math.sin(2 * Math.PI * freq * t);
          const osc2 = Math.sin(2 * Math.PI * (freq * 1.003) * t);
          const voice = (osc1 + osc2) * 0.12;

          sumL += voice * (1 - pan * 0.3);
          sumR += voice * (1 + pan * 0.3);
        });

        const env = (1 - Math.exp(-t * 20)) * Math.exp(-t * 1.5);
        leftMel[barStart + i] += sumL * env;
        rightMel[barStart + i] += sumR * env;
      }
    }

    // Add clips across tracks with different timeline positions
    this.createClip({
      trackId: this.tracks[0].id,
      name: 'Batería Groove',
      buffer: drumBuffer,
      startTime: 0,
      offset: 0,
      duration: totalSeconds,
      colorIdx: 0
    });

    this.createClip({
      trackId: this.tracks[1].id,
      name: 'Línea de Bajo 808',
      buffer: bassBuffer,
      startTime: 0,
      offset: 0,
      duration: totalSeconds,
      colorIdx: 1
    });

    this.createClip({
      trackId: this.tracks[2].id,
      name: 'Acordes Ambientales',
      buffer: melodyBuffer,
      startTime: 0,
      offset: 0,
      duration: totalSeconds,
      colorIdx: 2
    });

    this.setStatus('🎉 ¡Demostración cargada! Presiona ESPACIO para reproducir, C para cortar o arrastra clips.');
    this.updateTimelineUI();
  }

  /* ==========================================================================
     Track Management
     ========================================================================== */
  addTrack(name = 'Nueva Pista') {
    const trackId = 'track_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    const colorIdx = this.tracks.length % this.trackColorPalette.length;

    const track = {
      id: trackId,
      name: name,
      volume: 1.0,
      muted: false,
      solo: false,
      colorIdx: colorIdx,
      gainNode: null
    };

    this.tracks.push(track);
    this.renderTrackHeaders();
    this.renderTrackLanes();
    return track;
  }

  deleteTrack(trackId) {
    if (this.tracks.length <= 1) {
      this.setStatus('⚠️ Se requiere al menos una pista en el proyecto.');
      return;
    }
    // Remove associated clips
    this.clips = this.clips.filter(c => c.trackId !== trackId);
    this.tracks = this.tracks.filter(t => t.id !== trackId);

    if (this.isPlaying) {
      this.restartPlaybackAtCurrentPosition();
    }

    this.renderTrackHeaders();
    this.renderTrackLanes();
    this.updateTimelineUI();
    this.setStatus('Pista eliminada.');
  }

  /* ==========================================================================
     Clip Management & Waveform Peak Extraction
     ========================================================================== */
  createClip({ trackId, name, buffer, startTime = 0, offset = 0, duration = null, colorIdx = null }) {
    const clipId = 'clip_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    const clipDuration = duration !== null ? duration : buffer.duration;
    const finalColorIdx = colorIdx !== null ? colorIdx : (this.clips.length % this.trackColorPalette.length);

    // Extract peaks once for high performance canvas rendering
    const peaks = this.extractPeaks(buffer, 800);

    const clip = {
      id: clipId,
      trackId: trackId,
      name: name,
      buffer: buffer,
      originalBufferDuration: buffer.duration,
      startTime: Math.max(0, startTime),
      offset: Math.max(0, offset),
      duration: clipDuration,
      colorIdx: finalColorIdx,
      peaks: peaks
    };

    this.clips.push(clip);
    this.selectClip(clip.id);
    return clip;
  }

  extractPeaks(buffer, peakCount = 800) {
    const channelData = buffer.getChannelData(0);
    const totalSamples = channelData.length;
    const step = Math.max(1, Math.floor(totalSamples / peakCount));
    const peaks = new Float32Array(peakCount * 2);

    for (let i = 0; i < peakCount; i++) {
      const start = i * step;
      const end = Math.min(start + step, totalSamples);
      let min = 0;
      let max = 0;

      for (let j = start; j < end; j++) {
        const val = channelData[j];
        if (val < min) min = val;
        if (val > max) max = val;
      }

      peaks[i * 2] = min;
      peaks[i * 2 + 1] = max;
    }

    return peaks;
  }

  selectClip(clipId) {
    this.selectedClipId = clipId;
    const allClipEls = document.querySelectorAll('.audio-clip');
    allClipEls.forEach(el => {
      if (el.dataset.clipId === clipId) {
        el.classList.add('selected');
      } else {
        el.classList.remove('selected');
      }
    });

    const clip = this.clips.find(c => c.id === clipId);
    if (clip) {
      this.dom.selectionInfo.textContent = `Clip: ${clip.name} | Inicio: ${clip.startTime.toFixed(2)}s | Duración: ${clip.duration.toFixed(2)}s`;
    } else {
      this.dom.selectionInfo.textContent = 'Ningún clip seleccionado';
    }
  }

  deleteSelectedClip() {
    if (!this.selectedClipId) return;
    const clipIndex = this.clips.findIndex(c => c.id === this.selectedClipId);
    if (clipIndex !== -1) {
      const name = this.clips[clipIndex].name;
      this.clips.splice(clipIndex, 1);
      this.selectedClipId = null;
      this.updateTimelineUI();
      this.setStatus(`Clip "${name}" eliminado.`);
      if (this.isPlaying) {
        this.restartPlaybackAtCurrentPosition();
      }
    }
  }

  duplicateSelectedClip() {
    if (!this.selectedClipId) return;
    const original = this.clips.find(c => c.id === this.selectedClipId);
    if (!original) return;

    const newStartTime = original.startTime + original.duration + 0.1;
    const duplicated = this.createClip({
      trackId: original.trackId,
      name: `${original.name} (Copia)`,
      buffer: original.buffer,
      startTime: newStartTime,
      offset: original.offset,
      duration: original.duration,
      colorIdx: original.colorIdx
    });

    this.updateTimelineUI();
    this.selectClip(duplicated.id);
    this.setStatus(`Clip duplicado en ${newStartTime.toFixed(2)}s.`);
  }

  /* ==========================================================================
     Splitting / Cutting Functionality
     ========================================================================== */
  splitClipAtTime(clip, splitTime) {
    if (!clip) return;

    // Boundary check
    if (splitTime <= clip.startTime + 0.05 || splitTime >= clip.startTime + clip.duration - 0.05) {
      this.setStatus('⚠️ El corte está demasiado cerca del extremo del clip.');
      return;
    }

    const firstDuration = splitTime - clip.startTime;
    const secondOffset = clip.offset + firstDuration;
    const secondDuration = clip.duration - firstDuration;

    // Modify original clip to become Part 1
    clip.duration = firstDuration;

    // Create Part 2
    const part2 = this.createClip({
      trackId: clip.trackId,
      name: `${clip.name} (Parte 2)`,
      buffer: clip.buffer,
      startTime: splitTime,
      offset: secondOffset,
      duration: secondDuration,
      colorIdx: (clip.colorIdx + 1) % this.trackColorPalette.length
    });

    this.selectClip(part2.id);
    this.updateTimelineUI();
    this.setStatus(`✂️ Clip dividido en ${splitTime.toFixed(2)}s.`);

    if (this.isPlaying) {
      this.restartPlaybackAtCurrentPosition();
    }
  }

  splitSelectedAtPlayhead() {
    if (!this.selectedClipId) {
      // Find clip intersecting playhead
      const intersectingClip = this.clips.find(c =>
        this.playheadTime > c.startTime && this.playheadTime < c.startTime + c.duration
      );
      if (intersectingClip) {
        this.splitClipAtTime(intersectingClip, this.playheadTime);
      } else {
        this.setStatus('⚠️ Selecciona un clip que cruce el cabezal para dividirlo.');
      }
      return;
    }

    const clip = this.clips.find(c => c.id === this.selectedClipId);
    if (!clip) return;

    if (this.playheadTime > clip.startTime && this.playheadTime < clip.startTime + clip.duration) {
      this.splitClipAtTime(clip, this.playheadTime);
    } else {
      this.setStatus('⚠️ El cabezal debe ubicarse dentro del clip seleccionado para dividirlo.');
    }
  }

  /* ==========================================================================
     Tool Modes
     ========================================================================== */
  setTool(tool) {
    this.activeTool = tool;
    if (tool === 'pointer') {
      this.dom.toolPointer.classList.add('active');
      this.dom.toolCut.classList.remove('active');
      document.body.classList.remove('cutting-mode');
      this.setStatus('Herramienta Mover (V): Arrastra clips para moverlos o usa los bordes para recortar.');
    } else {
      this.dom.toolPointer.classList.remove('active');
      this.dom.toolCut.classList.add('active');
      document.body.classList.add('cutting-mode');
      this.setStatus('Herramienta Cortar (C): Haz clic sobre cualquier clip para dividirlo en ese punto exacto.');
    }
    this.renderTrackLanes();
  }

  /* ==========================================================================
     Playback Engine & Scheduling
     ========================================================================== */
  togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  play() {
    const audioCtx = this.getAudioContext();
    if (this.isPlaying) return;

    // If playhead is past the last clip, loop to start
    const projectEnd = this.getProjectDuration();
    if (this.playheadTime >= projectEnd && projectEnd > 0) {
      this.seekTo(0);
    }

    this.isPlaying = true;
    this.playbackStartTime = audioCtx.currentTime;
    this.playbackStartHead = this.playheadTime;

    // Update play button icons
    this.dom.playIcon.style.display = 'none';
    this.dom.pauseIcon.style.display = 'block';

    // Check Solo states
    const anySolo = this.tracks.some(t => t.solo);

    // Schedule audio nodes
    this.activeSources = [];

    this.tracks.forEach(track => {
      // Check if track is active
      const isAudible = anySolo ? track.solo : !track.muted;
      if (!isAudible) return;

      // Track Gain Node
      const trackGain = audioCtx.createGain();
      trackGain.gain.value = track.volume;
      trackGain.connect(this.masterGain);

      // Find clips belonging to this track
      const trackClips = this.clips.filter(c => c.trackId === track.id);

      trackClips.forEach(clip => {
        const clipEnd = clip.startTime + clip.duration;
        // If clip has not ended yet
        if (clipEnd > this.playheadTime) {
          const source = audioCtx.createBufferSource();
          source.buffer = clip.buffer;
          source.connect(trackGain);

          if (this.playheadTime <= clip.startTime) {
            // Starts in the future
            const when = this.playbackStartTime + (clip.startTime - this.playheadTime);
            const grainOffset = clip.offset;
            const grainDuration = clip.duration;
            source.start(when, grainOffset, grainDuration);
          } else {
            // Already started; play from mid-point
            const timeAlreadyPassed = this.playheadTime - clip.startTime;
            const when = this.playbackStartTime;
            const grainOffset = clip.offset + timeAlreadyPassed;
            const grainDuration = clip.duration - timeAlreadyPassed;
            source.start(when, grainOffset, grainDuration);
          }

          this.activeSources.push(source);
        }
      });
    });

    this.startPlayheadAnimation();
    this.setStatus('▶️ Reproduciendo...');
  }

  pause() {
    if (!this.isPlaying) return;
    this.isPlaying = false;

    // Stop active audio sources
    this.activeSources.forEach(src => {
      try { src.stop(); src.disconnect(); } catch (e) {}
    });
    this.activeSources = [];

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    this.dom.playIcon.style.display = 'block';
    this.dom.pauseIcon.style.display = 'none';
    this.setStatus('⏸️ En pausa.');
  }

  stop() {
    this.pause();
    this.seekTo(0);
    this.setStatus('⏹️ Detenido.');
  }

  seekTo(seconds) {
    this.playheadTime = Math.max(0, seconds);
    this.updatePlayheadVisual();
    this.updateTimeDisplay();

    if (this.isPlaying) {
      this.restartPlaybackAtCurrentPosition();
    }
  }

  restartPlaybackAtCurrentPosition() {
    this.pause();
    this.play();
  }

  startPlayheadAnimation() {
    const loop = () => {
      if (!this.isPlaying) return;

      const elapsed = this.audioCtx.currentTime - this.playbackStartTime;
      this.playheadTime = this.playbackStartHead + elapsed;

      this.updatePlayheadVisual();
      this.updateTimeDisplay();

      // Check if project ended
      const projectEnd = this.getProjectDuration();
      if (this.playheadTime > projectEnd + 1.0 && projectEnd > 0) {
        this.stop();
        return;
      }

      this.animFrameId = requestAnimationFrame(loop);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  updatePlayheadVisual() {
    const xPos = this.playheadTime * (this.pixelsPerSecond * this.zoomScale);
    this.dom.playhead.style.transform = `translateX(${xPos}px)`;

    // Auto-scroll viewport if playhead moves out of view
    const viewport = this.dom.tracksViewport;
    const scrollLeft = viewport.scrollLeft;
    const viewWidth = viewport.clientWidth;

    if (xPos > scrollLeft + viewWidth - 50) {
      viewport.scrollLeft = xPos - 100;
    }
  }

  formatTimeDisplay(seconds) {
    const totalMs = Math.floor(Math.max(0, seconds) * 1000);
    const ms = totalMs % 1000;
    const totalSec = Math.floor(totalMs / 1000);
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);

    const pad = (n, len = 2) => String(n).padStart(len, '0');
    return `${pad(min)}:${pad(sec)}.${pad(ms, 3)}`;
  }

  updateTimeDisplay() {
    this.dom.timeDisplay.textContent = this.formatTimeDisplay(this.playheadTime);
  }

  startVUMeterLoop() {
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);

    const updateVU = () => {
      if (this.isPlaying && this.analyser) {
        this.analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const percent = Math.min(100, Math.round((avg / 128) * 100));
        this.dom.vuBar.style.width = percent + '%';
      } else {
        this.dom.vuBar.style.width = '0%';
      }
      requestAnimationFrame(updateVU);
    };
    requestAnimationFrame(updateVU);
  }

  getProjectDuration() {
    let max = 0;
    this.clips.forEach(c => {
      const end = c.startTime + c.duration;
      if (end > max) max = end;
    });
    return max;
  }

  /* ==========================================================================
     Ruler & Scrubbing
     ========================================================================== */
  initRuler() {
    this.renderRuler();
  }

  renderRuler() {
    const canvas = this.dom.rulerCanvas;
    const width = Math.max(3000, (this.getProjectDuration() + 30) * this.pixelsPerSecond * this.zoomScale);
    const height = 34;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Background
    ctx.fillStyle = '#0f121b';
    ctx.fillRect(0, 0, width, height);

    // Ticks & Labels
    const pxPerSec = this.pixelsPerSecond * this.zoomScale;
    let stepSec = 1;
    if (pxPerSec > 120) stepSec = 0.5;
    if (pxPerSec < 40) stepSec = 2;
    if (pxPerSec < 20) stepSec = 5;

    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillStyle = '#64748b';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    for (let time = 0; time * pxPerSec < width; time += stepSec) {
      const x = Math.round(time * pxPerSec);
      const isMajor = time % (stepSec * 2) === 0;

      ctx.beginPath();
      ctx.moveTo(x, isMajor ? 12 : 20);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (isMajor) {
        const mins = Math.floor(time / 60);
        const secs = Math.floor(time % 60);
        const label = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        ctx.fillText(label, x + 4, 13);
      }
    }
  }

  initRulerScrubbing() {
    let isScrubbing = false;

    const handleScrub = (e) => {
      const rect = this.dom.rulerWrapper.getBoundingClientRect();
      const clickX = e.clientX - rect.left + this.dom.tracksViewport.scrollLeft;
      const pxPerSec = this.pixelsPerSecond * this.zoomScale;
      const targetTime = Math.max(0, clickX / pxPerSec);
      this.seekTo(targetTime);
    };

    this.dom.rulerWrapper.addEventListener('mousedown', (e) => {
      isScrubbing = true;
      handleScrub(e);
    });

    window.addEventListener('mousemove', (e) => {
      if (isScrubbing) {
        handleScrub(e);
      }
    });

    window.addEventListener('mouseup', () => {
      isScrubbing = false;
    });
  }

  /* ==========================================================================
     Zoom
     ========================================================================== */
  zoom(factor) {
    const newZoom = Math.min(4.0, Math.max(0.25, this.zoomScale * factor));
    if (newZoom !== this.zoomScale) {
      this.zoomScale = newZoom;
      this.dom.zoomLevel.textContent = `${Math.round(this.zoomScale * 100)}%`;
      this.renderRuler();
      this.updateTimelineUI();
      this.updatePlayheadVisual();
    }
  }

  /* ==========================================================================
     UI Rendering (Tracks & Headers)
     ========================================================================== */
  renderTrackHeaders() {
    this.dom.trackHeaders.innerHTML = '';

    this.tracks.forEach((track, index) => {
      const headerEl = document.createElement('div');
      headerEl.className = 'track-header';
      headerEl.style.setProperty('--track-color', this.trackColorPalette[track.colorIdx].color);

      headerEl.innerHTML = `
        <div class="track-header-top">
          <input type="text" class="track-name-input" value="${track.name}" title="Renombrar pista">
          <button class="btn-delete-track" title="Eliminar pista">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
        <div class="track-header-controls">
          <div class="track-buttons-row">
            <button class="track-btn btn-mute ${track.muted ? 'active' : ''}" title="Silenciar pista (M)">M</button>
            <button class="track-btn btn-solo ${track.solo ? 'active' : ''}" title="Solo (S)">S</button>
          </div>
          <div class="track-sliders-row">
            <input type="range" class="track-vol-slider" min="0" max="1.5" step="0.01" value="${track.volume}" title="Volumen de pista">
            <span class="track-vol-label">${Math.round(track.volume * 100)}%</span>
          </div>
        </div>
      `;

      // Header Events
      const nameInput = headerEl.querySelector('.track-name-input');
      nameInput.addEventListener('change', (e) => {
        track.name = e.target.value;
      });

      const btnDelete = headerEl.querySelector('.btn-delete-track');
      btnDelete.addEventListener('click', () => this.deleteTrack(track.id));

      const btnMute = headerEl.querySelector('.btn-mute');
      btnMute.addEventListener('click', () => {
        track.muted = !track.muted;
        btnMute.classList.toggle('active', track.muted);
        if (this.isPlaying) this.restartPlaybackAtCurrentPosition();
      });

      const btnSolo = headerEl.querySelector('.btn-solo');
      btnSolo.addEventListener('click', () => {
        track.solo = !track.solo;
        btnSolo.classList.toggle('active', track.solo);
        if (this.isPlaying) this.restartPlaybackAtCurrentPosition();
      });

      const volSlider = headerEl.querySelector('.track-vol-slider');
      const volLabel = headerEl.querySelector('.track-vol-label');
      volSlider.addEventListener('input', (e) => {
        track.volume = parseFloat(e.target.value);
        volLabel.textContent = `${Math.round(track.volume * 100)}%`;
      });

      this.dom.trackHeaders.appendChild(headerEl);
    });
  }

  renderTrackLanes() {
    this.dom.trackLanes.innerHTML = '';
    const pxPerSec = this.pixelsPerSecond * this.zoomScale;

    // Ensure lanes container width spans the whole project length
    const projectDuration = this.getProjectDuration();
    const minWidth = Math.max(3000, (projectDuration + 40) * pxPerSec);
    this.dom.trackLanes.style.minWidth = minWidth + 'px';

    this.tracks.forEach((track) => {
      const laneEl = document.createElement('div');
      laneEl.className = 'track-lane';
      laneEl.dataset.trackId = track.id;

      // Drop file onto specific lane
      laneEl.addEventListener('dragover', (e) => {
        e.preventDefault();
        laneEl.classList.add('drag-over');
      });
      laneEl.addEventListener('dragleave', () => {
        laneEl.classList.remove('drag-over');
      });
      laneEl.addEventListener('drop', (e) => {
        laneEl.classList.remove('drag-over');
      });

      // Find clips belonging to this track
      const trackClips = this.clips.filter(c => c.trackId === track.id);

      trackClips.forEach(clip => {
        const clipEl = this.createClipDOMElement(clip, pxPerSec);
        laneEl.appendChild(clipEl);
      });

      this.dom.trackLanes.appendChild(laneEl);
    });

    this.renderAllWaveforms();
  }

  createClipDOMElement(clip, pxPerSec) {
    const clipEl = document.createElement('div');
    clipEl.className = 'audio-clip';
    clipEl.dataset.clipId = clip.id;
    if (clip.id === this.selectedClipId) {
      clipEl.classList.add('selected');
    }
    if (this.activeTool === 'cut') {
      clipEl.classList.add('cutting-mode');
    }

    const palette = this.trackColorPalette[clip.colorIdx];
    clipEl.style.background = palette.bg;
    clipEl.style.borderColor = palette.border;

    const left = clip.startTime * pxPerSec;
    const width = Math.max(16, clip.duration * pxPerSec);

    clipEl.style.left = left + 'px';
    clipEl.style.width = width + 'px';

    clipEl.innerHTML = `
      <div class="clip-header">
        <span class="clip-title" title="${clip.name}">${clip.name}</span>
        <span class="clip-duration">${clip.duration.toFixed(2)}s</span>
      </div>
      <div class="clip-waveform-container">
        <canvas class="clip-canvas" id="canvas_${clip.id}"></canvas>
      </div>
      <div class="trim-handle trim-handle-left" data-handle="left" title="Ajustar inicio"></div>
      <div class="trim-handle trim-handle-right" data-handle="right" title="Ajustar fin"></div>
    `;

    // Mousedown on clip for Dragging, Seeking or Cutting
    clipEl.addEventListener('mousedown', (e) => {
      // Check if clicked on trim handle
      const handle = e.target.dataset.handle;
      if (handle) {
        this.startTrimming(e, clip, handle);
        return;
      }

      // Calculate exact time at clicked cursor position
      const rect = clipEl.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickRatio = Math.max(0, Math.min(1, clickX / rect.width));
      const clickedTime = clip.startTime + (clickRatio * clip.duration);

      // Instantly position playhead/timeline line right at the cursor position!
      this.seekTo(clickedTime);
      this.selectClip(clip.id);

      // If Razor/Cut tool is active, split here!
      if (this.activeTool === 'cut') {
        this.splitClipAtTime(clip, clickedTime);
        return;
      }

      // Pointer Tool -> Prepare dragging (only displaces clip if dragged past threshold)
      this.startDraggingClip(e, clip);
    });

    return clipEl;
  }

  renderAllWaveforms() {
    this.clips.forEach(clip => {
      this.renderClipWaveform(clip);
    });
  }

  renderClipWaveform(clip) {
    const canvas = document.getElementById(`canvas_${clip.id}`);
    if (!canvas) return;

    const width = canvas.parentElement.clientWidth;
    const height = canvas.parentElement.clientHeight;
    if (width === 0 || height === 0) return;

    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    const ctx = canvas.getContext('2d');
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    ctx.clearRect(0, 0, width, height);

    // Waveform drawing
    const peaks = clip.peaks;
    if (!peaks || peaks.length === 0) return;

    const totalBufferDur = clip.originalBufferDuration;
    const startRatio = clip.offset / totalBufferDur;
    const endRatio = (clip.offset + clip.duration) / totalBufferDur;

    const totalPeakPairs = peaks.length / 2;
    const startIdx = Math.floor(startRatio * totalPeakPairs);
    const endIdx = Math.min(totalPeakPairs, Math.ceil(endRatio * totalPeakPairs));
    const count = Math.max(1, endIdx - startIdx);

    const centerY = height / 2;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';

    const barWidth = Math.max(1, width / count);

    for (let i = 0; i < count; i++) {
      const peakIdx = (startIdx + i) * 2;
      const min = peaks[peakIdx];
      const max = peaks[peakIdx + 1];

      const x = i * barWidth;
      const top = centerY - Math.abs(max) * (height * 0.45);
      const bottom = centerY + Math.abs(min) * (height * 0.45);
      const h = Math.max(1.5, bottom - top);

      ctx.fillRect(x, top, Math.max(1, barWidth - 0.5), h);
    }
  }

  updateTimelineUI() {
    this.renderTrackHeaders();
    this.renderTrackLanes();
    this.renderRuler();
    this.updatePlayheadVisual();
  }

  /* ==========================================================================
     Drag Clips (Timeline X and Track Y)
     ========================================================================== */
  startDraggingClip(e, clip) {
    e.preventDefault();
    const pxPerSec = this.pixelsPerSecond * this.zoomScale;

    this.dragState = {
      type: 'move',
      clip: clip,
      startX: e.clientX,
      startY: e.clientY,
      originalStartTime: clip.startTime,
      originalTrackId: clip.trackId,
      pxPerSec: pxPerSec,
      isDragging: false
    };
  }

  startTrimming(e, clip, handle) {
    e.preventDefault();
    e.stopPropagation();
    this.selectClip(clip.id);

    this.dragState = {
      type: 'trim',
      handle: handle, // 'left' or 'right'
      clip: clip,
      startX: e.clientX,
      originalStartTime: clip.startTime,
      originalOffset: clip.offset,
      originalDuration: clip.duration,
      pxPerSec: this.pixelsPerSecond * this.zoomScale
    };
  }

  handleGlobalMouseMove(e) {
    if (!this.dragState) return;

    const state = this.dragState;

    if (state.type === 'move') {
      const deltaX = e.clientX - state.startX;
      const deltaY = e.clientY - state.startY;

      // Small drag threshold to keep clicks from displacing audio
      if (!state.isDragging) {
        if (Math.abs(deltaX) < 4 && Math.abs(deltaY) < 4) {
          return;
        }
        state.isDragging = true;
      }

      const deltaTime = deltaX / state.pxPerSec;
      let newStartTime = state.originalStartTime + deltaTime;

      // Grid Snapping
      if (this.snapSeconds > 0) {
        newStartTime = Math.round(newStartTime / this.snapSeconds) * this.snapSeconds;
      }
      newStartTime = Math.max(0, newStartTime);
      state.clip.startTime = newStartTime;

      // Vertical track hopping
      const laneUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
      const trackLane = laneUnderCursor ? laneUnderCursor.closest('.track-lane') : null;
      if (trackLane && trackLane.dataset.trackId) {
        state.clip.trackId = trackLane.dataset.trackId;
      }

      // Fast UI preview update
      const clipEl = document.querySelector(`.audio-clip[data-clip-id="${state.clip.id}"]`);
      if (clipEl) {
        clipEl.style.left = (newStartTime * state.pxPerSec) + 'px';
        if (trackLane && clipEl.parentElement !== trackLane) {
          trackLane.appendChild(clipEl);
        }
      }

      this.setStatus(`Moviendo "${state.clip.name}" -> ${newStartTime.toFixed(2)}s`);
    }

    else if (state.type === 'trim') {
      const deltaX = e.clientX - state.startX;
      const deltaTime = deltaX / state.pxPerSec;
      const clip = state.clip;

      if (state.handle === 'left') {
        let proposedOffset = state.originalOffset + deltaTime;
        proposedOffset = Math.max(0, Math.min(state.originalOffset + state.originalDuration - 0.1, proposedOffset));
        const appliedDelta = proposedOffset - state.originalOffset;

        clip.offset = proposedOffset;
        clip.startTime = Math.max(0, state.originalStartTime + appliedDelta);
        clip.duration = state.originalDuration - appliedDelta;
      } else {
        // Right handle
        const maxAvailableDuration = clip.originalBufferDuration - clip.offset;
        let proposedDuration = state.originalDuration + deltaTime;
        clip.duration = Math.max(0.1, Math.min(maxAvailableDuration, proposedDuration));
      }

      const clipEl = document.querySelector(`.audio-clip[data-clip-id="${clip.id}"]`);
      if (clipEl) {
        clipEl.style.left = (clip.startTime * state.pxPerSec) + 'px';
        clipEl.style.width = Math.max(16, clip.duration * state.pxPerSec) + 'px';
        const durLabel = clipEl.querySelector('.clip-duration');
        if (durLabel) durLabel.textContent = `${clip.duration.toFixed(2)}s`;
      }

      this.renderClipWaveform(clip);
      this.setStatus(`Recortando "${clip.name}" -> Duración: ${clip.duration.toFixed(2)}s`);
    }
  }

  handleGlobalMouseUp(e) {
    if (!this.dragState) return;
    const isMove = this.dragState.type === 'move';
    const didDrag = this.dragState.isDragging;
    const clip = this.dragState.clip;
    this.dragState = null;

    if (isMove && !didDrag) {
      // Simple click: keep clip unchanged, playhead was already moved to exact cursor position!
      this.selectClip(clip.id);
      this.setStatus(`Cabezal posicionado en ${this.playheadTime.toFixed(2)}s sobre "${clip.name}". Presiona S para cortar.`);
      return;
    }

    // Full commit
    this.updateTimelineUI();
    this.selectClip(clip.id);

    if (this.isPlaying) {
      this.restartPlaybackAtCurrentPosition();
    }
    this.setStatus(`Posición actualizada para "${clip.name}".`);
  }

  /* ==========================================================================
     Keyboard Shortcuts
     ========================================================================== */
  handleKeydown(e) {
    // If typing in an input, don't hijack keys
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Space: Play / Pause
    if (e.code === 'Space') {
      e.preventDefault();
      this.togglePlay();
    }

    // Key V: Pointer tool
    else if (e.code === 'KeyV') {
      this.setTool('pointer');
    }

    // Key C: Razor / Cut tool
    else if (e.code === 'KeyC') {
      this.setTool('cut');
    }

    // Key S: Split selected clip at playhead
    else if (e.code === 'KeyS') {
      this.splitSelectedAtPlayhead();
    }

    // Delete / Backspace: Remove selected clip
    else if (e.code === 'Delete' || e.code === 'Backspace') {
      this.deleteSelectedClip();
    }

    // Ctrl + D: Duplicate selected clip
    else if (e.ctrlKey && e.code === 'KeyD') {
      e.preventDefault();
      this.duplicateSelectedClip();
    }

    // Home or 0: Return to start
    else if (e.code === 'Home' || e.code === 'Digit0') {
      this.seekTo(0);
    }

    // + / -: Zoom
    else if (e.key === '+' || e.key === '=') {
      this.zoom(1.25);
    } else if (e.key === '-' || e.key === '_') {
      this.zoom(0.8);
    }
  }

  /* ==========================================================================
     Export Mixdown to MP3 or WAV
     ========================================================================== */
  async exportMixdown() {
    if (this.clips.length === 0) {
      this.setStatus('⚠️ No hay clips para exportar. Agrega audio primero.');
      return;
    }

    const formatChoice = this.dom.exportFormat ? this.dom.exportFormat.value : '192';

    this.setStatus('⏳ Renderizando mezcla multipista...');

    try {
      const sampleRate = 44100;
      const totalDuration = Math.max(1, this.getProjectDuration() + 0.5);
      const totalFrames = Math.ceil(sampleRate * totalDuration);

      const OfflineAudioContextClass = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      const offlineCtx = new OfflineAudioContextClass(2, totalFrames, sampleRate);

      const anySolo = this.tracks.some(t => t.solo);

      // Connect tracks and clips in offline context
      this.tracks.forEach(track => {
        const isAudible = anySolo ? track.solo : !track.muted;
        if (!isAudible) return;

        const trackGain = offlineCtx.createGain();
        trackGain.gain.value = track.volume;
        trackGain.connect(offlineCtx.destination);

        const trackClips = this.clips.filter(c => c.trackId === track.id);
        trackClips.forEach(clip => {
          const src = offlineCtx.createBufferSource();
          src.buffer = clip.buffer;
          src.connect(trackGain);
          src.start(clip.startTime, clip.offset, clip.duration);
        });
      });

      // Render audio
      const renderedBuffer = await offlineCtx.startRendering();

      if (formatChoice === 'wav') {
        const wavBlob = this.audioBufferToWav(renderedBuffer);
        this.triggerDownload(wavBlob, `WaveStudio_Mezcla_${Date.now()}.wav`);
        this.setStatus('🎉 ¡Mezcla exportada exitosamente como archivo WAV!');
      } else {
        const kbps = parseInt(formatChoice, 10) || 192;
        this.setStatus(`⏳ Codificando archivo MP3 a ${kbps} kbps...`);
        const mp3Blob = await this.audioBufferToMp3(renderedBuffer, kbps);
        this.triggerDownload(mp3Blob, `WaveStudio_Mezcla_${Date.now()}.mp3`);
        this.setStatus(`🎉 ¡Mezcla exportada exitosamente como archivo MP3 (${kbps} kbps)!`);
      }
    } catch (err) {
      console.error('Error al exportar mezcla:', err);
      this.setStatus(`⚠️ Ocurrió un error al exportar: ${err.message || err}`);
    }
  }

  /* AudioBuffer to MP3 Converter using LAME.js with chunked processing */
  audioBufferToMp3(buffer, kbps = 192) {
    return new Promise((resolve, reject) => {
      try {
        const encoderConstructor = (typeof lamejs !== 'undefined' && lamejs.Mp3Encoder) 
          ? lamejs.Mp3Encoder 
          : (window.lamejs && window.lamejs.Mp3Encoder);

        if (!encoderConstructor) {
          throw new Error('El codificador LAME MP3 no está disponible en la página.');
        }

        const channels = 2; // Stereo
        const sampleRate = buffer.sampleRate || 44100;
        const encoder = new encoderConstructor(channels, sampleRate, kbps);

        const numSamples = buffer.length;
        const leftFloat = buffer.getChannelData(0);
        const rightFloat = buffer.numberOfChannels > 1 ? buffer.getChannelData(1) : leftFloat;

        const left = new Int16Array(numSamples);
        const right = new Int16Array(numSamples);

        for (let i = 0; i < numSamples; i++) {
          const sL = Math.max(-1, Math.min(1, leftFloat[i]));
          left[i] = sL < 0 ? Math.round(sL * 32768) : Math.round(sL * 32767);

          const sR = Math.max(-1, Math.min(1, rightFloat[i]));
          right[i] = sR < 0 ? Math.round(sR * 32768) : Math.round(sR * 32767);
        }

        const mp3Data = [];
        const sampleBlockSize = 1152;
        let offset = 0;

        const processSlice = () => {
          const sliceEndTime = performance.now() + 30; // 30ms time-slice keeps UI perfectly fluid
          while (offset < numSamples && performance.now() < sliceEndTime) {
            const lChunk = left.subarray(offset, offset + sampleBlockSize);
            const rChunk = right.subarray(offset, offset + sampleBlockSize);
            const mp3buf = encoder.encodeBuffer(lChunk, rChunk);
            if (mp3buf && mp3buf.length > 0) {
              mp3Data.push(mp3buf);
            }
            offset += sampleBlockSize;
          }

          const percent = Math.min(100, Math.round((offset / numSamples) * 100));
          this.setStatus(`⏳ Codificando MP3 (${kbps} kbps): ${percent}%`);

          if (offset < numSamples) {
            setTimeout(processSlice, 0);
          } else {
            const flushed = encoder.flush();
            if (flushed && flushed.length > 0) {
              mp3Data.push(flushed);
            }
            const blob = new Blob(mp3Data, { type: 'audio/mp3' });
            resolve(blob);
          }
        };

        processSlice();
      } catch (err) {
        reject(err);
      }
    });
  }

  /* AudioBuffer to 16-bit PCM WAV Converter */
  audioBufferToWav(buffer) {
    const numChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const format = 1; // PCM
    const bitDepth = 16;

    let interleaved;
    if (numChannels === 2) {
      const left = buffer.getChannelData(0);
      const right = buffer.getChannelData(1);
      interleaved = new Float32Array(left.length + right.length);
      for (let i = 0, j = 0; i < left.length; i++) {
        interleaved[j++] = left[i];
        interleaved[j++] = right[i];
      }
    } else {
      interleaved = buffer.getChannelData(0);
    }

    const bytesPerSample = bitDepth / 8;
    const blockAlign = numChannels * bytesPerSample;
    const dataByteLength = interleaved.length * bytesPerSample;
    const wavBuffer = new ArrayBuffer(44 + dataByteLength);
    const view = new DataView(wavBuffer);

    // RIFF identifier
    this.writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataByteLength, true);
    this.writeString(view, 8, 'WAVE');
    this.writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, format, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * blockAlign, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, bitDepth, true);
    this.writeString(view, 36, 'data');
    view.setUint32(40, dataByteLength, true);

    // Write PCM 16-bit samples
    let offset = 44;
    for (let i = 0; i < interleaved.length; i++) {
      let s = Math.max(-1, Math.min(1, interleaved[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7FFF;
      view.setInt16(offset, s, true);
      offset += 2;
    }

    return new Blob([view], { type: 'audio/wav' });
  }

  triggerDownload(blob, filename) {
    const downloadUrl = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.href = downloadUrl;
    downloadAnchor.download = filename;
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
    setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
  }

  writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* Status helper */
  setStatus(msg) {
    if (this.dom.statusText) {
      this.dom.statusText.textContent = msg;
    }
  }
}

// Instantiate Studio on Page Load
window.addEventListener('DOMContentLoaded', () => {
  window.app = new WaveStudioApp();
});
