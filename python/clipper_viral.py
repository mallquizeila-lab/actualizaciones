#!/usr/bin/env python3
"""
✂️ Clipper viral: de un video largo de YouTube a un short vertical listo para publicar.

Flujo:
  1. Descarga el video (yt-dlp) y saca el audio (ffmpeg).
  2. Transcribe con Faster Whisper, con el tiempo de CADA palabra.
  3. Una IA local (Qwen3 en Ollama) elige el mejor momento, escribe un título gancho y
     reescribe el guion en formato viral SIN perder el contexto (para descripción o voz en off).
  4. MoviePy corta el video original, lo pasa a vertical 9:16 (fondo desenfocado), le pone el
     título gancho arriba y subtítulos dinámicos palabra por palabra (karaoke) sincronizados.

⚠️ Derechos: úsalo con TUS videos o con videos cuya reutilización tengas permitida
(licencia Creative Commons, permiso del autor). Para enlaces exige --tengo-derechos.

Instalar (una vez):
  pip install yt-dlp faster-whisper "moviepy>=2" pillow numpy
  Ollama: https://ollama.com  ->  ollama pull qwen3:8b   (o qwen3:4b si la PC es modesta)

Uso:
  python clipper_viral.py "https://youtu.be/XXXX" --tengo-derechos
  python clipper_viral.py --video mi_video.mp4 --duracion 45
  python clipper_viral.py --video mi_video.mp4 --sin-llm            (sin IA: elige el tramo con más ritmo)
  python clipper_viral.py --video v.mp4 --transcripcion t.json      (reusa una transcripción ya hecha)
Salida (carpeta --salida, por defecto ./clips/<nombre>/): short.mp4, guion_viral.txt, transcripcion.json, plan.json
"""
import argparse, json, os, re, subprocess, sys, textwrap
from pathlib import Path

W, H = 1080, 1920

# ---------------------------------------------------------------- 1. descargar
def descargar(url, carpeta):
    import yt_dlp
    opts = {'outtmpl': str(carpeta / 'original.%(ext)s'), 'format': 'bv*[height<=1080][ext=mp4]+ba[ext=m4a]/b[height<=1080]/b',
            'merge_output_format': 'mp4', 'quiet': True, 'noplaylist': True}
    with yt_dlp.YoutubeDL(opts) as y:
        info = y.extract_info(url, download=True)
    f = next(carpeta.glob('original.*'))
    return f, info.get('title') or 'video'


def extraer_audio(video, carpeta):
    wav = carpeta / 'audio.wav'
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(video), '-vn', '-ac', '1', '-ar', '16000', str(wav)], check=True)
    return wav


# ---------------------------------------------------------------- 2. transcribir
def transcribir(wav, modelo='small', idioma='es'):
    from faster_whisper import WhisperModel
    try:
        m = WhisperModel(modelo, device='cuda', compute_type='float16')
    except Exception:
        m = WhisperModel(modelo, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(str(wav), language=idioma, word_timestamps=True, vad_filter=True, beam_size=5)
    out = []
    for i, s in enumerate(segs):
        words = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for w in (s.words or []) if w.word.strip()]
        out.append({'id': i, 'start': round(s.start, 3), 'end': round(s.end, 3), 'text': s.text.strip(), 'words': words})
        print(f'  [{s.start:6.1f}s] {s.text.strip()}')
    return out


# ---------------------------------------------------------------- 3. IA local (Qwen3 en Ollama)
PROMPT = """Eres editor de videos cortos virales en español. Te paso la transcripción de un video con número y tiempo de cada frase.
TAREA:
1. Elige UNO o VARIOS tramos de frases SEGUIDAS que juntos duren entre {mn} y {mx} segundos y cuenten una idea COMPLETA
   (que se entienda sola, con inicio fuerte y remate). Prefiere el momento más sorprendente, útil o emotivo.
2. Escribe un TÍTULO GANCHO de máximo 8 palabras para poner arriba del video (curiosidad, sin mentir ni exagerar).
3. Reescribe el contenido de esos tramos como GUION VIRAL fresco (gancho en la primera frase, frases cortas, remate al final),
   SIN cambiar los hechos ni el sentido de lo que dice la persona.
4. Elige 3 a 8 PALABRAS CLAVE que aparezcan tal cual en el texto, para resaltarlas en los subtítulos.
TRANSCRIPCIÓN:
{tx}
Devuelve SOLO JSON: {{"tramos":[{{"desde":0,"hasta":3}}],"titulo":"…","guion_viral":"…","palabras_clave":["…"],"descripcion":"máx 150 caracteres","hashtags":["#…"],"por_que":"1 frase"}}"""


def llm(prompt, modelo, url):
    import urllib.request
    body = json.dumps({'model': modelo, 'stream': False, 'format': 'json', 'options': {'temperature': .6},
                       'messages': [{'role': 'user', 'content': prompt + ' /no_think'}]}).encode()
    req = urllib.request.Request(url.rstrip('/') + '/api/chat', data=body, headers={'content-type': 'application/json'})
    with urllib.request.urlopen(req, timeout=600) as r:
        t = re.sub(r'<think>.*?</think>', '', json.loads(r.read())['message']['content'], flags=re.S).strip()
    a, b = t.find('{'), t.rfind('}')
    return json.loads(t[a:b + 1])


def plan_heuristico(segs, mn, mx):
    """Sin IA: el tramo continuo con más palabras por segundo y más preguntas/exclamaciones."""
    mejor, best = None, -1
    for i in range(len(segs)):
        for j in range(i, len(segs)):
            d = segs[j]['end'] - segs[i]['start']
            if d > mx: break
            if d < mn: continue
            txt = ' '.join(s['text'] for s in segs[i:j + 1])
            sc = len(txt.split()) / d + txt.count('?') * .3 + txt.count('!') * .3
            if sc > best: best, mejor = sc, (i, j)
    if not mejor: mejor = (0, len(segs) - 1)
    i, j = mejor; txt = ' '.join(s['text'] for s in segs[i:j + 1])
    return {'tramos': [{'desde': i, 'hasta': j}], 'titulo': ' '.join(segs[i]['text'].split()[:8]), 'guion_viral': txt, 'palabras_clave': [],
            'descripcion': txt[:150], 'hashtags': [], 'por_que': 'Elegido sin IA: el tramo con más ritmo'}


def validar_plan(p, segs, mx):
    ids = {s['id']: s for s in segs}; tramos = []
    for t in p.get('tramos') or []:
        a, b = int(t.get('desde', -1)), int(t.get('hasta', -1))
        if a in ids and b in ids and b >= a: tramos.append((a, b))
    tramos.sort(); limpio, total = [], 0.0
    for a, b in tramos:
        if limpio and a <= limpio[-1][1]: continue  # sin solapes
        d = ids[b]['end'] - ids[a]['start']
        if total + d > mx + 3: break
        limpio.append((a, b)); total += d
    if not limpio: raise ValueError('La IA no devolvió tramos válidos')
    p['tramos'] = [{'desde': a, 'hasta': b} for a, b in limpio]
    p['titulo'] = re.sub(r'\s+', ' ', str(p.get('titulo') or '')).strip()[:70]
    return p


# ---------------------------------------------------------------- 4. MoviePy: cortar, vertical, título y subtítulos
def fuente(tam, negrita=True):
    from PIL import ImageFont
    for f in ([os.environ.get('CLIP_FUENTE', '')] + ['C:/Windows/Fonts/arialbd.ttf', 'C:/Windows/Fonts/seguibl.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
              '/System/Library/Fonts/Supplemental/Arial Bold.ttf']):
        if f and os.path.exists(f): return ImageFont.truetype(f, tam)
    return ImageFont.load_default()


def img_texto(lineas, tam, ancho, color='#ffffff', borde='#000000', resaltar=None, caja=None):
    """Dibuja texto centrado con borde. resaltar = {indice_palabra: color}. Devuelve un array RGBA."""
    import numpy as np
    from PIL import Image, ImageDraw
    F = fuente(tam); pad = 24; alto = int(len(lineas) * tam * 1.22 + pad * 2)
    im = Image.new('RGBA', (ancho, alto), (0, 0, 0, 0)); d = ImageDraw.Draw(im)
    if caja: d.rounded_rectangle((0, 0, ancho - 1, alto - 1), radius=34, fill=caja)
    k = 0
    for n, ln in enumerate(lineas):
        pal = ln.split(' '); esp = d.textlength(' ', font=F); anchos = [d.textlength(p, font=F) for p in pal]
        x = (ancho - (sum(anchos) + esp * (len(pal) - 1))) / 2; y = pad + n * tam * 1.22
        for p, a in zip(pal, anchos):
            d.text((x, y), p, font=F, fill=(resaltar or {}).get(k, color), stroke_width=max(3, tam // 12), stroke_fill=borde); x += a + esp; k += 1
    return np.array(im)


def grupos(palabras, maxp=3, maxgap=.6):
    G, cur = [], []
    for w in palabras:
        if cur and (len(cur) >= maxp or w['s'] - cur[-1]['e'] > maxgap or re.search(r'[.?!,;:]$', cur[-1]['w'])):
            G.append(cur); cur = []
        cur.append(w)
    if cur: G.append(cur)
    return G


def editar(video, segs, plan, salida, fps=30):
    from moviepy import VideoFileClip, ImageClip, CompositeVideoClip, concatenate_videoclips
    from PIL import Image, ImageFilter
    import numpy as np
    src = VideoFileClip(str(video)); ids = {s['id']: s for s in segs}
    clave = {re.sub(r'\W', '', k.lower()) for k in plan.get('palabras_clave') or [] if k}
    partes, palabras, off = [], [], 0.0
    for t in plan['tramos']:
        a, b = ids[t['desde']], ids[t['hasta']]
        ini = max(0, (a['words'][0]['s'] if a['words'] else a['start']) - .15)          # el corte cae justo antes de la 1.ª palabra
        fin = min(src.duration, (b['words'][-1]['e'] if b['words'] else b['end']) + .25)  # y justo después de la última
        partes.append(src.subclipped(ini, fin))
        for s in segs[t['desde']:t['hasta'] + 1]:
            for w in s['words']:
                if ini <= w['s'] < fin: palabras.append({'w': w['w'], 's': w['s'] - ini + off, 'e': min(w['e'], fin) - ini + off})
        off += fin - ini
    clip = concatenate_videoclips(partes) if len(partes) > 1 else partes[0]
    dur = clip.duration
    # vertical: fondo = el mismo video agrandado, desenfocado y oscurecido; encima, el video completo a lo ancho
    def borroso(fr):  # desenfoque barato: achicar, desenfocar y volver a agrandar; y oscurecer
        h, w = fr.shape[:2]
        im = Image.fromarray(fr).resize((max(8, w // 10), max(8, h // 10))).filter(ImageFilter.GaussianBlur(2)).resize((w, h))
        return (np.asarray(im) * .45).astype('uint8')
    sw, sh = clip.size
    llenar = max(W / sw, H / sh)  # el fondo cubre toda la pantalla (recortado, sin estirar)
    bg = clip.resized(llenar).cropped(x_center=sw * llenar / 2, y_center=sh * llenar / 2, width=W, height=H).image_transform(borroso)
    esc = W / sw if sw / sh > W / H else H * .8 / sh  # video horizontal: a lo ancho; vertical: 80 % del alto
    fg = clip.resized(esc).with_position(('center', 'center'))
    capas = [bg.with_duration(dur), fg]
    # título gancho arriba (entra con un pequeño salto)
    tit = plan.get('titulo') or ''
    if tit:
        lin = textwrap.wrap(tit.upper(), 18)[:3]
        t_img = img_texto(lin, 78, 960, color='#ffffff', caja=(225, 29, 72, 235))
        capas.append(ImageClip(t_img).with_duration(dur).with_position(('center', 170)))
    # subtítulos dinámicos: grupos de hasta 3 palabras, la que suena va en amarillo y las palabras clave en verde
    G = grupos(palabras)
    for gi, g in enumerate(G):
        txt = ' '.join(w['w'] for w in g); lin = textwrap.wrap(txt, 16) or [txt]
        tope = G[gi + 1][0]['s'] if gi + 1 < len(G) else dur  # nunca se monta con el grupo siguiente
        for k, w in enumerate(g):
            s0 = w['s']; s1 = min(g[k + 1]['s'] if k + 1 < len(g) else max(w['e'], w['s'] + .25), tope, dur)
            if s1 - s0 < .02: continue
            res = {i: ('#22c55e' if re.sub(r'\W', '', g[i]['w'].lower()) in clave else '#ffffff') for i in range(len(g))}; res[k] = '#facc15'
            im = img_texto(lin, 92, 1000, resaltar=res)
            capas.append(ImageClip(im).with_start(s0).with_duration(s1 - s0).with_position(('center', int(H * .70))))
    out = CompositeVideoClip(capas, size=(W, H)).with_duration(dur)
    out.write_videofile(str(salida), fps=fps, codec='libx264', audio_codec='aac', preset='medium', threads=4, logger=None)
    src.close()
    return dur


# ---------------------------------------------------------------- principal
def main():
    ap = argparse.ArgumentParser(description='De un video largo a un short vertical viral.')
    ap.add_argument('url', nargs='?'); ap.add_argument('--video'); ap.add_argument('--transcripcion')
    ap.add_argument('--tengo-derechos', action='store_true', help='Confirmo que el video es mío o tengo permiso para reutilizarlo')
    ap.add_argument('--duracion', type=float, default=45); ap.add_argument('--minimo', type=float, default=20)
    ap.add_argument('--whisper', default='small'); ap.add_argument('--idioma', default='es')
    ap.add_argument('--modelo', default='qwen3:8b'); ap.add_argument('--ollama', default=os.environ.get('OLLAMA_URL', 'http://localhost:11434'))
    ap.add_argument('--sin-llm', action='store_true'); ap.add_argument('--salida')
    a = ap.parse_args()
    if not a.url and not a.video: ap.error('Pasa un enlace de YouTube o --video archivo.mp4')
    if a.url and not a.tengo_derechos:
        sys.exit('⚠️  Solo con videos tuyos o con permiso de reutilización. Si es así, agrega --tengo-derechos')
    nombre = re.sub(r'[^a-z0-9]+', '-', (Path(a.video).stem if a.video else re.sub(r'.*[=/]', '', a.url)).lower()).strip('-')[:40] or 'video'
    carpeta = Path(a.salida or Path('clips') / nombre); carpeta.mkdir(parents=True, exist_ok=True)
    if a.video: video, titulo = Path(a.video), Path(a.video).stem
    else: print('⬇️  Descargando…'); video, titulo = descargar(a.url, carpeta)
    tj = carpeta / 'transcripcion.json'
    if a.transcripcion: segs = json.load(open(a.transcripcion, encoding='utf-8'))
    elif tj.exists(): segs = json.load(open(tj, encoding='utf-8'))
    else: print('🎧 Transcribiendo con Faster Whisper…'); segs = transcribir(extraer_audio(video, carpeta), a.whisper, a.idioma)
    json.dump(segs, open(tj, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    if not segs: sys.exit('No se escuchó ninguna voz en el video')
    if a.sin_llm: plan = plan_heuristico(segs, a.minimo, a.duracion)
    else:
        tx = '\n'.join(f"{s['id']} [{s['start']:.1f}-{s['end']:.1f}s] {s['text']}" for s in segs)[:24000]
        print(f'🧠 Pensando el short con {a.modelo}…')
        try: plan = llm(PROMPT.format(mn=int(a.minimo), mx=int(a.duracion), tx=tx), a.modelo, a.ollama)
        except Exception as e: print(f'  (la IA local no respondió: {e}; elijo el tramo sin IA)'); plan = plan_heuristico(segs, a.minimo, a.duracion)
    plan = validar_plan(plan, segs, a.duracion)
    json.dump(plan, open(carpeta / 'plan.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(f"✂️  Tramos: {plan['tramos']} · Título: «{plan['titulo']}»")
    dur = editar(video, segs, plan, carpeta / 'short.mp4')
    (carpeta / 'guion_viral.txt').write_text(f"TÍTULO GANCHO: {plan['titulo']}\n\nGUION VIRAL (reescrito, mismo contexto):\n{plan.get('guion_viral', '')}\n\n"
        f"DESCRIPCIÓN: {plan.get('descripcion', '')}\n{' '.join(plan.get('hashtags') or [])}\n\nPor qué este momento: {plan.get('por_que', '')}\nFuente: {a.url or video}\n", encoding='utf-8')
    print(f'✅ Listo ({dur:.1f} s): {carpeta / "short.mp4"}')


if __name__ == '__main__':
    main()
