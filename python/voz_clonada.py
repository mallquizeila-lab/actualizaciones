#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
voz_clonada.py - Voz clonada con Chatterbox Multilingual (licencia MIT), en lote.
Basado en narrar_clonado.py de Josefino. Solo se usa con voces que tienen permiso
(ShortForge lo comprueba antes de llamar a este script).

  python voz_clonada.py items.json     items: [{"text", "out" (.wav), "ref" (.wav de referencia)}]

En CPU es lento: el modelo se carga una vez y se reutiliza para todas las escenas del video.
"""
import json
import os
import re
import sys
import time

os.environ.setdefault("HF_HUB_DISABLE_XET", "1")

import torch

_orig_load = torch.load
torch.load = lambda *a, **k: _orig_load(*a, **{**k, "map_location": torch.device("cpu")})

import torchaudio as ta


def log(m):
    print(m, flush=True)


def bloques(texto, max_car=250):
    """Frases cortas = mejor calidad en Chatterbox."""
    out, actual = [], ""
    for o in [x.strip() for x in re.split(r"(?<=[.!?…])\s+", texto) if x.strip()]:
        cand = f"{actual} {o}".strip()
        if len(cand) > max_car and actual:
            out.append(actual)
            actual = o
        else:
            actual = cand
    if actual:
        out.append(actual)
    return out


def main():
    with open(sys.argv[1], encoding="utf-8") as f:
        items = json.load(f)
    t0 = time.time()
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    modelo = ChatterboxMultilingualTTS.from_pretrained(device="cpu")
    sr = modelo.sr
    log(f"Chatterbox cargado en {time.time() - t0:.0f}s")
    ref_actual = None
    for i, it in enumerate(items, 1):
        t1 = time.time()
        partes = []
        for k, b in enumerate(bloques(it["text"])):
            kw = {}
            if it["ref"] != ref_actual:
                kw["audio_prompt_path"] = it["ref"]
                ref_actual = it["ref"]
            partes.append(modelo.generate(b, language_id="es", **kw).detach().cpu())
            partes.append(torch.zeros(1, int(sr * 0.2)))
        ta.save(it["out"], torch.cat(partes[:-1], dim=1), sr)
        log(f"  voz clonada {i}/{len(items)} lista ({time.time() - t1:.0f}s)")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    main()
