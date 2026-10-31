#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voz_local.py - Voz y tiempos SIN internet, en lote (el modelo se carga una sola vez por video).

  python voz_local.py kokoro items.json   items: [{"text", "out" (.wav), "voice", "speed"}]
  python voz_local.py timing items.json   items: [{"audio", "text", "out" (.json)}]
  python voz_local.py transcribe items.json   items: [{"audio", "out" (.json)}]  (videos propios)

kokoro: voces de Kokoro-82M en español (ef_dora, em_alex, em_santa). Licencia Apache-2.0.
timing: faster-whisper escucha el audio y da el inicio/fin de cada palabra. Luego se alinea con el
        texto del guion, así los subtítulos muestran SIEMPRE las palabras correctas (Whisper a veces
        escucha mal) pero con el tiempo real en que suenan.
"""
import json
import os
import re
import sys
import time
import unicodedata
from difflib import SequenceMatcher

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")


def log(m):
    print(m, flush=True)


def kokoro(items):
    import numpy as np
    import soundfile as sf
    from kokoro import KPipeline

    t0 = time.time()
    pipe = KPipeline(lang_code="e")
    log(f"Kokoro cargado en {time.time() - t0:.0f}s")
    for i, it in enumerate(items, 1):
        # Bloques cortos separados por salto de línea: Kokoro corta textos largos sin avisar.
        bloques, actual = [], ""
        for o in [x for x in re.split(r"(?<=[.!?])\s+", it["text"]) if x.strip()]:
            if len(actual) + len(o) > 300 and actual:
                bloques.append(actual)
                actual = o
            else:
                actual = (actual + " " + o).strip()
        if actual:
            bloques.append(actual)
        partes = [r[2] if not hasattr(r, "audio") else r.audio for r in pipe("\n".join(bloques), voice=it.get("voice") or "em_alex", speed=float(it.get("speed") or 1.0), split_pattern=r"\n+")]
        if not partes:
            raise RuntimeError("Kokoro no generó audio para: " + it["text"][:60])
        audio = np.concatenate([p.numpy() if hasattr(p, "numpy") else p for p in partes])
        sf.write(it["out"], audio, 24000)
        log(f"  voz {i}/{len(items)} lista")


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9ñ]+", "", w)


def alinear(guion, oidas):
    """guion: [texto]; oidas: [(texto, inicio, fin)] -> [{texto, inicio, fin}] con las palabras del guion."""
    a = [norm(w) for w in guion]
    b = [norm(w) for w, _, _ in oidas]
    t = [None] * len(guion)
    for op, i1, i2, j1, j2 in SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op == "equal" or (op == "replace" and i2 - i1 == j2 - j1):
            for k in range(i2 - i1):
                t[i1 + k] = (oidas[j1 + k][1], oidas[j1 + k][2])
        elif op == "replace" and j2 > j1:
            # Distinto número de palabras: reparte el tramo oído entre las palabras del guion.
            ini, fin = oidas[j1][1], oidas[j2 - 1][2]
            n = i2 - i1
            for k in range(n):
                t[i1 + k] = (ini + (fin - ini) * k / n, ini + (fin - ini) * (k + 1) / n)
    # Rellena las que quedaron sin tiempo interpolando entre vecinas conocidas.
    fin_audio = oidas[-1][2] if oidas else 1.0
    i = 0
    while i < len(t):
        if t[i] is not None:
            i += 1
            continue
        j = i
        while j < len(t) and t[j] is None:
            j += 1
        ini = t[i - 1][1] if i > 0 else 0.0
        fin = t[j][0] if j < len(t) else fin_audio
        n = j - i
        for k in range(n):
            t[i + k] = (ini + (fin - ini) * k / n, ini + (fin - ini) * (k + 1) / n)
        i = j
    return [{"texto": w, "inicio": round(s, 3), "fin": round(max(e, s + 0.05), 3)} for w, (s, e) in zip(guion, t)]


ORDEN = ["tiny", "base", "small", "medium"]


def cargar_whisper():
    """Carga el modelo pedido; si no hay memoria, baja a uno más pequeño (idea de narrar_kokoro.py)."""
    from faster_whisper import WhisperModel
    pedido = os.environ.get("WHISPER_MODEL", "base")
    cadena = [pedido] + [m for m in reversed(ORDEN[:ORDEN.index(pedido)])] if pedido in ORDEN else [pedido, "base", "tiny"]
    ultimo = None
    for m in cadena:
        try:
            t0 = time.time()
            modelo = WhisperModel(m, device="cpu", compute_type="int8", cpu_threads=4, num_workers=1)
            log(f"Whisper '{m}' cargado en {time.time() - t0:.0f}s")
            return modelo
        except Exception as e:  # noqa: BLE001
            t = str(e).lower()
            if not (isinstance(e, MemoryError) or "alloc" in t or "memory" in t or "mkl" in t):
                raise
            ultimo = e
            log(f"Sin memoria para Whisper '{m}', pruebo uno más pequeño...")
    raise RuntimeError(f"No hubo memoria para ningún modelo de Whisper: {ultimo}")


def timing(items):
    modelo = cargar_whisper()
    for i, it in enumerate(items, 1):
        segs, _ = modelo.transcribe(it["audio"], language="es", word_timestamps=True, beam_size=1)
        oidas = [(w.word.strip(), w.start, w.end) for s in segs for w in (s.words or []) if w.word.strip()]
        guion = it["text"].split()
        palabras = alinear(guion, oidas) if oidas else []
        with open(it["out"], "w", encoding="utf-8") as f:
            json.dump({"palabras": palabras}, f, ensure_ascii=False)
        log(f"  tiempos {i}/{len(items)} listos")


def transcribe(items):
    """Transcribe audio de videos propios: texto, frases y palabras con tiempos."""
    modelo = cargar_whisper()
    for it in items:
        segs, info = modelo.transcribe(it["audio"], language="es", word_timestamps=True, vad_filter=True, beam_size=1)
        frases, palabras = [], []
        for s in segs:
            if s.text.strip():
                frases.append({"inicio": round(s.start, 2), "fin": round(s.end, 2), "texto": s.text.strip()})
            for w in s.words or []:
                if w.word.strip():
                    palabras.append({"texto": w.word.strip(), "inicio": round(w.start, 3), "fin": round(w.end, 3)})
        with open(it["out"], "w", encoding="utf-8") as f:
            json.dump({"texto": " ".join(x["texto"] for x in frases), "frases": frases, "palabras": palabras}, f, ensure_ascii=False)
        log(f"Transcripción lista: {len(palabras)} palabras")


if __name__ == "__main__":
    if len(sys.argv) != 3 or sys.argv[1] not in ("kokoro", "timing", "transcribe"):
        sys.exit(__doc__)
    with open(sys.argv[2], encoding="utf-8") as f:
        datos = json.load(f)
    {"kokoro": kokoro, "timing": timing, "transcribe": transcribe}[sys.argv[1]](datos)
