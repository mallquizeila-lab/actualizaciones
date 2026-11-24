# Video final del recorrido de ProfeTok con la voz del profesor: portada, tarjeta de cada paso, escenas grabadas al ritmo
# de la voz, subtítulos de cada frase, cierre, y música alegre suave que baja cuando habla la voz.
import json, os, subprocess, wave
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
H = os.path.dirname(os.path.abspath(__file__)); os.chdir(H)
F = '/usr/share/fonts/opentype/inter/'; EMO = '/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'
def f(n, s): return ImageFont.truetype(F + n, s)
def sh(c):
    r = subprocess.run(c, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
    if r.returncode: print(r.stderr.decode()[-1500:]); raise SystemExit(1)
os.makedirs('e2', exist_ok=True)
PLAN = json.load(open('plan.json')); VOZ = '../voz_pt/voz_final.wav'
LOGO = Image.open('/home/user/actualizaciones/aula/demo/logo.png').convert('RGB')
INFO = {'s01_login': (1, 'Entrar a ProfeTok', '🔑'), 's02_inicio': (2, 'La pantalla de inicio', '🏠'), 's03_porteria': (3, 'Portería con código QR', '🚪'), 's04_fotochecks': (4, 'Fotochecks con código QR', '🪪'),
        's05_asistencia': (5, 'Asistencia', '✅'), 's06_notas': (6, 'Registro de notas', '📊'), 's07_alumnos': (7, 'Alerta temprana y ficha del alumno', '🚦'), 's08_libreta': (8, 'Libreta de notas para imprimir', '🖨️'),
        's09_tareas': (9, 'Tareas, bitácora y comunicados', '📣'), 's10_asistente': (10, 'Mi asistente con IA', '🤖'), 's11_mama': (11, 'Lo que ve la familia', '👨‍👩‍👧')}
def emoji(e, size):
    im = Image.new('RGBA', (160, 160), (0, 0, 0, 0)); ImageDraw.Draw(im).text((80, 80), e, font=ImageFont.truetype(EMO, 109), embedded_color=True, anchor='mm'); return im.resize((size, size), Image.LANCZOS)
def lineas(d, txt, fu, ancho):
    out, cur = [], ''
    for w in txt.split():
        if d.textlength((cur + ' ' + w).strip(), font=fu) > ancho: out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    return out + [cur]
def fondo(c1=(37, 99, 235), c2=(124, 58, 237)):
    im = Image.new('RGB', (1920, 1080)); d = ImageDraw.Draw(im)
    for x in range(0, 1920, 4):
        t = x / 1920; d.rectangle((x, 0, x + 4, 1080), fill=tuple(int(a + (b - a) * t) for a, b in zip(c1, c2)))
    rays = Image.new('RGBA', im.size, (0, 0, 0, 0)); rd = ImageDraw.Draw(rays)
    for i in range(24): import math; a = i * math.pi / 12; rd.polygon([(960, 540), (960 + 2000 * math.cos(a), 540 + 2000 * math.sin(a)), (960 + 2000 * math.cos(a + .12), 540 + 2000 * math.sin(a + .12))], fill=(255, 255, 255, 18))
    im.paste(rays, (0, 0), rays)
    for cx, cy, r, a in [(1700, 150, 260, 35), (180, 960, 320, 30), (1600, 960, 160, 25), (300, 160, 120, 22)]:
        c = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(c).ellipse((cx - r, cy - r, cx + r, cy + r), fill=(255, 255, 255, a)); im.paste(c, (0, 0), c)
    return im
def tarjeta(out, titulo, sub=None, num=None, emo=None, logo=True):
    im = fondo(); d = ImageDraw.Draw(im)
    if logo:
        lg = LOGO.resize((200, 200)); m = Image.new('L', lg.size, 0); ImageDraw.Draw(m).ellipse((0, 0, 200, 200), fill=255); d.ellipse((850, 90, 1070, 310), fill='white'); im.paste(lg, (860, 100), m)
    if emo: e = emoji(emo, 170); im.paste(e, (875, 340), e)
    if num: d.rounded_rectangle((830, 530, 1090, 615), radius=42, fill='#fde047', outline='white', width=4); d.text((960, 572), f'PASO {num}', font=f('Inter-Black.otf', 50), fill='#1e3a8a', anchor='mm')
    fu = f('Inter-Black.otf', 92 if len(titulo) < 24 else 72); y = 720 if num else 560
    for i, l in enumerate(lineas(d, titulo, fu, 1700)): d.text((960, y + i * 100), l, font=fu, fill='white', anchor='mm', stroke_width=5, stroke_fill='#1e1b4b')
    if sub:
        for i, l in enumerate(lineas(d, sub, f('Inter-Bold.otf', 44), 1600)): d.text((960, y + 110 + i * 58), l, font=f('Inter-Bold.otf', 44), fill='#fef9c3', anchor='mm')
    im.save(out)
def subt(chip, txt, out):
    im = Image.new('RGBA', (1920, 1080), (0, 0, 0, 0)); d = ImageDraw.Draw(im); fu = f('Inter-Bold.otf', 42); ls = lineas(d, txt, fu, 1640); h = 64 + len(ls) * 56
    s_ = Image.new('RGBA', im.size, (0, 0, 0, 0)); ImageDraw.Draw(s_).rounded_rectangle((70, 1040 - h + 8, 1850, 1048), radius=28, fill=(0, 0, 0, 120)); im.alpha_composite(s_.filter(ImageFilter.GaussianBlur(10)))
    d.rounded_rectangle((60, 1030 - h, 1860, 1040), radius=28, fill=(11, 27, 77, 232), outline=(253, 224, 71, 255), width=4)
    if chip: cf = f('Inter-Bold.otf', 30); cw = d.textlength(chip, font=cf); d.rounded_rectangle((90, 1030 - h - 26, 90 + cw + 44, 1030 - h + 26), radius=26, fill='#fde047'); d.text((112, 1030 - h), chip, font=cf, fill='#1e3a8a', anchor='lm')
    for i, l in enumerate(ls): d.text((960, 1030 - h + 58 + i * 56), l, font=fu, fill='white', anchor='mm')
    im.save(out)
def con_subs(base, D, lins, chip, out, t0):
    ins, filt, prev = [], [], '[0]'
    for i, L in enumerate(lins):
        png = f'e2/sub_{os.path.basename(out)}_{i}.png'; subt(chip, L['txt'], png); ins.append(f'-i {png}')
        a = max(0, L['t'] - t0); b = (lins[i + 1]['t'] - t0) if i + 1 < len(lins) else D
        lab = f'[v{i}]'; filt.append(f"{prev}[{i + 1}]overlay=0:0:enable='between(t,{a:.2f},{b:.2f})'{lab}"); prev = lab
    open('e2/f.txt', 'w').write(';'.join(filt) if filt else '[0]null[v0]'); prev = prev if filt else '[v0]'
    sh(f'ffmpeg -y -i {base} {" ".join(ins)} -filter_complex_script e2/f.txt -map "{prev}" -t {D:.3f} -r 30 -c:v libx264 -preset veryfast -crf 19 -pix_fmt yuv420p {out}')
def imagen_clip(png, D, out, zoom=True):
    fr = max(1, int(D * 30)); z = f"min(1.10,1.0+0.10*on/{fr})" if zoom else '1'
    sh(f'ffmpeg -y -loop 1 -framerate 30 -i {png} -t {D:.3f} -vf "scale=2112:1188,zoompan=z=\'{z}\':x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':d=1:s=1920x1080:fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 19 {out}')
def tarjeta_clip(png, D, out):  # entra de golpe (zoom de impacto) y respira
    fr = max(1, int(D * 30))
    sh(f'ffmpeg -y -loop 1 -framerate 30 -i {png} -t {D:.3f} -vf "scale=2112:1188,zoompan=z=\'1.0+0.18*max(0,1-on/9)+0.04*on/{fr}\':x=\'iw/2-iw/zoom/2\':y=\'ih/2-ih/zoom/2\':d=1:s=1920x1080:fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 19 {out}')
def escena(k, D, out):
    J = json.load(open(f'v_{k}.json')); Fr = J['frames']; ini = J['inicio']
    with open(f'e2/{k}.txt', 'w') as o:
        sel = [(n, t - ini) for n, t in Fr if t - ini >= -0.001] or [(Fr[-1][0], 0)]
        if sel[0][1] > 0: sel.insert(0, (max((x for x in Fr if x[1] - ini < 0), key=lambda x: x[1], default=Fr[0])[0], 0))
        for i, (n, t) in enumerate(sel):
            nx = sel[i + 1][1] if i + 1 < len(sel) else max(t + .5, D + .5)
            o.write(f"file '../v_{k}/{n}'\nduration {max(.001, nx - t):.3f}\n")
        o.write(f"file '../v_{k}/{sel[-1][0]}'\n")
    if k == 's11_mama':
        bg = fondo(); d = ImageDraw.Draw(bg); d.rounded_rectangle((290, 30, 850, 1050), radius=64, fill='#0f172a', outline='#e2e8f0', width=6)
        e = emoji('📱', 120); bg.paste(e, (1240, 220), e); d.text((1300, 400), 'En el celular de la familia', font=f('Inter-Black.otf', 56), fill='white', anchor='mm', stroke_width=3, stroke_fill='#1e1b4b')
        for i, l in enumerate(['Novedades al instante', 'Asistencia con hora de entrada y salida', 'Notas, tareas y comunicados', 'Solo ve a su propio hijo']): d.text((1300, 500 + i * 64), '✓ ' + l, font=f('Inter-Bold.otf', 40), fill='#fef9c3', anchor='mm')
        bg.save('e2/bg_mama.png')
        sh(f'ffmpeg -y -f concat -safe 0 -i e2/{k}.txt -i e2/bg_mama.png -filter_complex "[0]fps=30,scale=-2:960:flags=lanczos[p];[1][p]overlay=x=570-w/2:y=60,format=yuv420p" -t {D:.3f} -c:v libx264 -preset veryfast -crf 19 {out}')
    else:
        sh(f'ffmpeg -y -f concat -safe 0 -i e2/{k}.txt -vf "fps=30,scale=1920:1080:flags=lanczos,format=yuv420p" -t {D:.3f} -c:v libx264 -preset veryfast -crf 19 {out}')
clips = []
for it in PLAN['items']:
    k, ini, cont, fin = it['k'], it['ini'], it['cont'], it['fin']
    if k == 'intro':
        tarjeta('e2/intro.png', 'Bienvenidos a ProfeTok', 'Recorrido completo · I.E. Cepriano · 6.° grado «A» · Prof. Emanuel Fernández · 40 alumnos y sus familias (datos de ejemplo)')
        imagen_clip('e2/intro.png', fin - ini, 'e2/intro_b.mp4'); con_subs('e2/intro_b.mp4', fin - ini, it['lineas'], None, 'e2/c_intro.mp4', ini); clips.append('e2/c_intro.mp4'); continue
    if k == 'cierre':
        tarjeta('e2/cierre.png', '¡Pruébalo 15 días gratis!', 'Sin tarjeta · Plan Docente S/ 19 al mes · Plan Colegio S/ 149 al mes', emo='🎉')
        imagen_clip('e2/cierre.png', fin - ini, 'e2/cierre_b.mp4'); con_subs('e2/cierre_b.mp4', fin - ini, it['lineas'], None, 'e2/c_cierre.mp4', ini); clips.append('e2/c_cierre.mp4'); continue
    n, tit, em = INFO[k]
    if cont - ini > 0.05: tarjeta(f'e2/t_{k}.png', tit, num=n, emo=em, logo=False); tarjeta_clip(f'e2/t_{k}.png', cont - ini, f'e2/c_{k}_t.mp4'); clips.append(f'e2/c_{k}_t.mp4')
    escena(k, fin - cont, f'e2/b_{k}.mp4'); con_subs(f'e2/b_{k}.mp4', fin - cont, it['lineas'], f'{n} · {tit}', f'e2/c_{k}.mp4', cont); clips.append(f'e2/c_{k}.mp4')
    print(k, round(fin - ini, 1), flush=True)
open('e2/lista.txt', 'w').write(''.join(f"file '{os.path.basename(c)}'\n" for c in clips))
sh('ffmpeg -y -f concat -safe 0 -i e2/lista.txt -c copy e2/video.mp4')
# 🎵 música alegre y suave (compuesta aquí): acordes I–V–vi–IV, arpegio, bajo y percusión ligera, 112 pulsos por minuto
T = PLAN['total'] + 1; sr = 44100; n = int(sr * T); mus = np.zeros(n); bt = 60 / 112
C = [[261.63, 329.63, 392.0], [196.0, 246.94, 293.66], [220.0, 261.63, 329.63], [174.61, 220.0, 261.63]]
def nota(fq, t, d, v, tipo='pluck'):
    s0 = int(t * sr); L = min(int(d * sr), n - s0)
    if L <= 0: return
    x = np.arange(L) / sr; env = np.exp(-x * (5 if tipo == 'pluck' else 2.2)); w = np.sin(2 * np.pi * fq * x) + .3 * np.sin(4 * np.pi * fq * x) + .1 * np.sin(6 * np.pi * fq * x)
    mus[s0:s0 + L] += w * env * v
rng = np.random.default_rng(3); b = 0
while b * bt < T:
    t = b * bt; c = C[(b // 4) % 4]
    for i in range(2): nota(c[(b * 2 + i) % 3] * 2, t + i * bt / 2, .5, .10)
    if b % 2 == 0: nota(c[0] / 2, t, bt * 1.8, .16, 'bajo')
    s0 = int(t * sr); L = min(int(.09 * sr), n - s0)  # «chas» suave
    if L > 0: mus[s0:s0 + L] += rng.normal(0, 1, L) * np.exp(-np.arange(L) / sr * 60) * (.05 if b % 2 else .03)
    b += 1
mus = mus / (np.abs(mus).max() + 1e-9) * .6; fade = int(2.5 * sr); mus[:fade] *= np.linspace(0, 1, fade); mus[-fade:] *= np.linspace(1, 0, fade)
with wave.open('e2/musica.wav', 'w') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((mus * 32767).astype(np.int16).tobytes())
# la música baja sola cuando habla la voz (sidechain)
sh(f'ffmpeg -y -i e2/video.mp4 -i {VOZ} -i e2/musica.wav -filter_complex "[1]asplit=2[v][k];[2]volume=0.14[m];[m][k]sidechaincompress=threshold=0.02:ratio=8:attack=20:release=400[md];[v][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-15:TP=-1.5:LRA=10[a]" '
   f'-map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart /home/user/actualizaciones/ProfeTok_recorrido_con_voz.mp4')
print('ok', round(PLAN['total'], 1))
