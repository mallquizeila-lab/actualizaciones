# Mejora la voz (sin la melodía de Suno) y ubica cada frase de la letra en el tiempo usando las pausas de la voz.
# Salida: voz_final.wav (las 2 partes unidas) y ../vid_demo/plan.json (escenas, frases y tiempos).
import json, os, re, subprocess, wave
import numpy as np
H = os.path.dirname(os.path.abspath(__file__)); os.chdir(H)
VEL = 1.06  # un poquito más ágil (sin cambiar el tono)
def sh(c): subprocess.run(c, shell=True, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
def dur(f): return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], capture_output=True, text=True).stdout)
for p in ('p1', 'p2'):  # limpieza: corte de graves, cuerpo, presencia, compresión suave, ritmo y volumen parejo
    sh(f'ffmpeg -y -i {p}/voz.wav -af "highpass=f=85,lowpass=f=12500,equalizer=f=180:t=q:w=1:g=2,equalizer=f=3200:t=q:w=1.2:g=3.5,equalizer=f=7500:t=q:w=2:g=-2,'
       f'acompressor=threshold=-20dB:ratio=3:attack=8:release=120:makeup=3,atempo={VEL},loudnorm=I=-16:TP=-1.5:LRA=9" -ac 1 -ar 44100 {p}/proc.wav')
def voz_activa(f):  # tramos con voz (silencedetect sobre la voz limpia)
    r = subprocess.run(['ffmpeg', '-i', f, '-af', 'silencedetect=noise=-36dB:d=0.28', '-f', 'null', '-'], capture_output=True, text=True).stderr
    ini = [float(x) for x in re.findall(r'silence_start: ([\d.]+)', r)]; fin = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', r)]
    D = dur(f); sil = list(zip(ini, fin + [D] * (len(ini) - len(fin))))
    habla, t = [], 0.0
    for a, b in sil:
        if a - t > 0.05: habla.append((t, a))
        t = b
    if D - t > 0.05: habla.append((t, D))
    return habla, D
def alinear(f, lineas):
    habla, D = voz_activa(f)
    # candidatos de corte = pausas entre tramos de voz (cada frase empieza al inicio de un tramo)
    cand = [h[0] for h in habla]; n = len(lineas); P = len(cand)
    voc = np.array([h[1] - h[0] for h in habla]); cum = np.concatenate([[0], np.cumsum(voc)])
    pesos = np.array([max(8, len(l)) for l in lineas], float); rate = cum[-1] / pesos.sum()
    pausa = np.array([cand[i] - habla[i - 1][1] if i else 1.0 for i in range(P)])
    INF = 1e18; best = np.full((n + 1, P + 1), INF); prev = np.zeros((n + 1, P + 1), int); best[0][0] = 0
    for i in range(1, n + 1):  # la frase i-1 ocupa los tramos [j, k)
        e = pesos[i - 1] * rate
        for k in range(i, P + 1):
            for j in range(max(i - 1, 0), k):
                if best[i - 1][j] >= INF: continue
                d = cum[k] - cum[j]; c = best[i - 1][j] + (d - e) ** 2 / max(e, 1) - (0.8 * min(pausa[j], 1.2) if j else 0)
                if c < best[i][k]: best[i][k] = c; prev[i][k] = j
    k = P; ini = []
    for i in range(n, 0, -1): j = prev[i][k]; ini.append(cand[j]); k = j
    ini = ini[::-1]; ini[0] = min(ini[0], 0.3) if ini[0] < 1.5 else ini[0]
    return ini, D
L1 = [l.strip() for l in open('p1.txt') if l.strip()]; L2 = [l.strip() for l in open('p2.txt') if l.strip()]
T1, D1 = alinear('p1/proc.wav', L1); T2, D2 = alinear('p2/proc.wav', L2)
sh('ffmpeg -y -i p1/proc.wav -i p2/proc.wav -filter_complex "[0][1]concat=n=2:v=0:a=1" voz_final.wav')
# las secciones (índices de línea desde 1; None = sin línea de título)
SEC = [('intro', 1, None, [1, 2, 3]), ('s01_login', 1, 4, range(5, 8)), ('s02_inicio', 1, 8, range(9, 14)), ('s03_porteria', 1, 14, range(15, 27)), ('s04_fotochecks', 1, 27, range(28, 34)),
       ('s05_asistencia', 1, 34, range(35, 37)), ('s06_notas', 1, None, range(37, 41)), ('s07_alumnos', 1, 41, range(42, 47)),
       ('s08_libreta', 2, 1, range(2, 5)), ('s09_tareas', 2, 5, range(6, 13)), ('s10_asistente', 2, 13, range(14, 19)), ('s11_mama', 2, 19, range(20, 27)), ('cierre', 2, None, range(27, 34))]
abs_t = lambda parte, i: (T1[i - 1] if parte == 1 else D1 + T2[i - 1])
items = []
for k, (nombre, parte, hdr, rng) in enumerate(SEC):
    rng = list(rng); ini = 0.0 if nombre == 'intro' else (D1 if (parte == 2 and k > 0 and SEC[k - 1][1] == 1) else abs_t(parte, hdr if hdr else rng[0]))
    if parte == 2 and SEC[k - 1][1] == 1: ini = D1  # la parte 2 empieza justo al terminar la 1
    cont = abs_t(parte, rng[0]) if hdr else ini
    items.append({'k': nombre, 'ini': round(ini, 3), 'cont': round(cont, 3), 'hdr': (L1 if parte == 1 else L2)[hdr - 1] if hdr else None,
                  'lineas': [{'t': round(abs_t(parte, i), 3), 'txt': (L1 if parte == 1 else L2)[i - 1]} for i in rng]})
TOT = D1 + D2
for k, it in enumerate(items): it['fin'] = round(items[k + 1]['ini'] if k + 1 < len(items) else TOT, 3)
escenas = [{'k': it['k'], 'dur': it['fin'] - it['cont'], 'lineas': [{'t': round(l['t'] - it['cont'], 3), 'txt': l['txt']} for l in it['lineas']]} for it in items if it['k'].startswith('s')]
json.dump({'items': items, 'escenas': escenas, 'total': TOT}, open('../vid_demo/plan.json', 'w'), ensure_ascii=False, indent=1)
for it in items: print(f"{it['k']:16s} {it['ini']:7.1f} → {it['fin']:7.1f}  ({it['fin'] - it['ini']:5.1f} s, {len(it['lineas'])} frases)")
print('total', round(TOT, 1))
