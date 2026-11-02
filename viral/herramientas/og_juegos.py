# Genera las imágenes de vista previa (1200x630) de los juegos "arcade" a partir de public/tests.json.
import json, sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
BASE = os.path.join(os.path.dirname(__file__), '..', 'public')
B='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'; R='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'; SB='/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf'; EM='/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf'
def emoji(ch,size):
    f=ImageFont.truetype(EM,109); im=Image.new('RGBA',(500,160),(0,0,0,0)); ImageDraw.Draw(im).text((0,0),ch,font=f,embedded_color=True)
    im=im.crop(im.getbbox()); return im.resize((size,int(size*im.height/im.width)),Image.LANCZOS)
def wrap(d,txt,font,w):
    out=[];line=''
    for p in txt.split():
        n=(line+' '+p).strip()
        if d.textlength(n,font=font)>w and line: out.append(line); line=p
        else: line=n
    out.append(line); return out
PAL=[((255,77,109),(60,10,40)),((131,56,236),(25,10,60)),((6,214,160),(5,50,45)),((58,134,255),(10,25,80)),((255,183,3),(90,40,0)),((255,0,110),(55,0,30)),((0,245,212),(0,50,60)),((251,86,7),(70,20,0))]
tests=[t for t in json.load(open(os.path.join(BASE,'tests.json')))['tests'] if t['tipo']=='arcade']
SOLO=sys.argv[1:]
for idx,t in enumerate(tests):
    if SOLO and t['id'] not in SOLO: continue
    c1,c2=PAL[idx%len(PAL)]; im=Image.new('RGB',(1200,630)); d=ImageDraw.Draw(im)
    for y in range(630):
        k=y/630; d.line([(0,y),(1200,y)],fill=tuple(int(c1[i]*(1-k)*.85+c2[i]*k) for i in range(3)))
    glow=Image.new('RGBA',(1200,630),(0,0,0,0)); g=ImageDraw.Draw(glow)
    for (cx,cy,r,a) in [(250,315,260,70),(1050,80,160,40),(950,560,200,35)]: g.ellipse([cx-r,cy-r,cx+r,cy+r],fill=(255,255,255,a))
    glow=glow.filter(ImageFilter.GaussianBlur(70)); im.paste(glow,(0,0),glow)
    d.rounded_rectangle([75,130,425,480],radius=80,fill=(255,255,255,0),outline=(255,255,255),width=6)
    em=emoji(t['e'],230); im.paste(em,(250-em.width//2,305-em.height//2),em)
    fe=ImageFont.truetype(B,26); lab='JUEGO GRATIS · RANKING DIARIO'; tw=d.textlength(lab,font=fe)
    d.rounded_rectangle([490,95,490+tw+40,141],radius=23,fill=(255,255,255)); d.text((510,103),lab,font=fe,fill=c2)
    ft=ImageFont.truetype(SB,72); y=168
    for l in wrap(d,t['t'],ft,660)[:2]: d.text((490,y),l,font=ft,fill=(255,255,255)); y+=86
    fs=ImageFont.truetype(R,30)
    for l in wrap(d,t['d'],fs,660)[:3]: d.text((490,y+6),l,font=fs,fill=(255,245,250)); y+=40
    fb=ImageFont.truetype(B,34); bt='¿Superas mi récord?'; bw=d.textlength(bt,font=fb)
    d.rounded_rectangle([490,505,490+bw+110,575],radius=35,fill=(255,255,255)); d.text((520,520),bt,font=fb,fill=c2)
    ar=emoji('🏆',42); im.paste(ar,(int(490+bw+48),519),ar)
    im.save(os.path.join(BASE,'og',t['id']+'.png'),optimize=True)
print(len(tests),'imágenes')
