#!/usr/bin/env python3
"""Convierte un analisis JSON en un reporte HTML independiente (claro/oscuro, listo para imprimir).

Uso:
    python3 generar_reporte.py analisis.json reporte.html

Solo usa la libreria estandar de Python 3.9+. No toca internet ni ejecuta comandos.
Adaptado al espanol para ProfeTok a partir del generador MIT de
"first-customer-finder" (Daniel An). Codigo libre (MIT); textos propios.
"""

from __future__ import annotations

import argparse
import html
import json
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

DIMENSIONES = {
    "dolor": "Fuerza del dolor",
    "encaje": "Encaje con ProfeTok",
    "momento": "Momento oportuno",
    "alcanzable": "Facil de contactar",
    "evidencia": "Calidad de la prueba",
}


def esc(value: Any) -> str:
    return html.escape(str(value if value is not None else ""), quote=True)


def clamp(value: Any, maximum: int = 100) -> int:
    try:
        number = round(float(value))
    except (TypeError, ValueError):
        number = 0
    return max(0, min(maximum, number))


def as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    return value if isinstance(value, list) else [value]


def as_dict(value: Any) -> dict[str, Any]:
    return value if isinstance(value, dict) else {}


def safe_url(value: Any) -> str:
    raw = str(value or "").strip()
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return esc(raw)
    return "#"


def banda(score: int) -> str:
    if score >= 80:
        return "Candidato fuerte"
    if score >= 65:
        return "Prometedor"
    return "Falta validar"


def render_scores(scores: dict[str, Any]) -> str:
    return "".join(
        f'<div><dt>{esc(label)}</dt><dd>{clamp(scores.get(key, 0), 5)} de 5</dd></div>'
        for key, label in DIMENSIONES.items()
    )


def render_prospecto(p: dict[str, Any], index: int) -> str:
    score = clamp(p.get("score"))
    fuente = as_dict(p.get("fuente"))
    url = safe_url(fuente.get("url"))
    rows = "".join(
        f"<dt>{esc(label)}</dt><dd>{esc(value)}</dd>"
        for label, value in (
            ("Por que encaja", p.get("por_que_encaja")),
            ("Por que ahora", p.get("por_que_ahora")),
            ("Canal sugerido", p.get("canal")),
            ("Cuidado", p.get("cuidado") or "Confirma que el problema siga vigente antes de escribir."),
        )
        if value
    )
    apertura = p.get("apertura")
    apertura_html = (
        '      <div class="opener">\n'
        '        <p class="label">Mensaje sugerido &mdash; solo borrador, nunca se envia solo</p>\n'
        f"        <p>{esc(apertura)}</p>\n"
        "      </div>"
        if apertura
        else ""
    )
    evidencia_html = f"""        <p>{esc(p.get('evidencia', ''))}</p>
        <p class="source">
          {esc(fuente.get('tipo', 'Fuente publica'))}, {esc(fuente.get('fecha', 'sin fecha'))}
          <span aria-hidden="true">&middot;</span>
          <a href="{url}" target="_blank" rel="noreferrer">{esc(fuente.get('titulo', 'Abrir fuente original'))}</a>
        </p>
        <dl class="dims">{render_scores(as_dict(p.get('scores')))}</dl>"""
    return f"""
    <article class="prospect">
      <header class="p-head">
        <div>
          <h3>{esc(p.get('nombre') or f'Prospecto {index}')}</h3>
          <p class="sub">{esc(p.get('tipo', 'Prospecto publico'))} <span aria-hidden="true">&middot;</span> {esc(p.get('etapa', 'Posible encaje'))}</p>
        </div>
        <div class="score"><b class="num">{score}</b><span>{esc(banda(score))}</span></div>
      </header>
      {f'<p class="signal">{esc(p.get("senal"))}</p>' if p.get("senal") else ''}
      <dl class="kv">{rows}</dl>
{apertura_html}
      <details class="screen-only">
        <summary>Prueba y desglose del puntaje</summary>
{evidencia_html}
      </details>
      <div class="print-only">
        <p class="label">Prueba y desglose del puntaje</p>
{evidencia_html}
      </div>
    </article>"""


def render_patron(p: dict[str, Any]) -> str:
    return (
        f'<div class="pattern"><b class="num">{clamp(p.get("cantidad"), 999)}</b>'
        f'<div><h4>{esc(p.get("titulo", "Senal repetida"))}</h4>'
        f'<p>{esc(p.get("idea", ""))}</p></div></div>'
    )


CSS = """
:root{--bg:#f6f7f9;--sheet:#fff;--ink:#16181d;--ink2:#515660;--ink3:#868b96;--line:#e9ebef;--tint:#eef4f6;--accent:#1f7fb0;--link-line:#cdd3da;
  --shadow:0 1px 2px rgba(20,20,30,.04),0 12px 40px -12px rgba(20,20,30,.10);
  --sans:ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Inter,Roboto,"Helvetica Neue",Arial,sans-serif}
@media(prefers-color-scheme:dark){:root{--bg:#101215;--sheet:#181b1f;--ink:#e9ebef;--ink2:#a4aab4;--ink3:#868b96;--line:rgba(255,255,255,.08);--tint:#1d2529;--accent:#6fc0e6;--link-line:#454b52;--shadow:0 1px 2px rgba(0,0,0,.3)}}
*{box-sizing:border-box}
html{-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 var(--sans)}
a{color:var(--ink);text-decoration:underline;text-decoration-color:var(--link-line);text-underline-offset:3px}
a:hover{text-decoration-color:currentColor}
.num{font-variant-numeric:tabular-nums}
.sheet{max-width:880px;margin:40px auto 64px;background:var(--sheet);border-radius:28px;box-shadow:var(--shadow);padding:72px 80px 56px}
.meta{color:var(--ink3);font-size:13px;margin:0}
h1{font-weight:300;font-size:clamp(32px,5vw,46px);line-height:1.08;letter-spacing:-.035em;margin:18px 0 22px;max-width:15em}
.verdict{font-size:18px;line-height:1.6;color:var(--ink2);max-width:36em;margin:0}
.facts{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:48px 0 0;padding:22px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.facts dt,.kv dt,.steps dt,.dims dt,.label,.eyebrow{color:var(--ink3);font-size:13px;font-weight:400}
.facts dd{margin:4px 0 0;font-weight:500}
.top{display:flex;justify-content:space-between;align-items:flex-end;gap:32px;margin:56px 0 0}
.top h2{font-weight:400;font-size:28px;line-height:1.2;letter-spacing:-.025em;margin:6px 0 8px}
.top p{margin:0;color:var(--ink2);max-width:32em}
.top .big{font-weight:300;font-size:64px;line-height:1;letter-spacing:-.05em;color:var(--accent)}
section.block{margin-top:80px}
.eyebrow{margin:0}
h2.section{font-weight:400;font-size:26px;line-height:1.2;letter-spacing:-.025em;margin:8px 0 6px}
.note{color:var(--ink3);font-size:14px;margin:0 0 12px;max-width:40em}
.prospect{padding:36px 0;border-bottom:1px solid var(--line);break-inside:avoid;page-break-inside:avoid}
.prospect:last-child{border-bottom:0}
.p-head{display:flex;justify-content:space-between;gap:24px;align-items:baseline}
.p-head h3{font-weight:500;font-size:20px;line-height:1.3;letter-spacing:-.02em;margin:0}
.sub{color:var(--ink3);font-size:13px;margin:4px 0 0}
.score{text-align:right;white-space:nowrap}
.score b{font-weight:400;font-size:30px;line-height:1;letter-spacing:-.03em}
.score span{display:block;color:var(--ink3);font-size:12px;margin-top:6px}
.signal{font-size:17px;line-height:1.55;margin:18px 0 22px;max-width:38em}
.kv:empty{display:none}.p-head+.kv{margin-top:18px}.kv{display:grid;grid-template-columns:130px 1fr;gap:10px 24px;margin:0}
.kv dd{margin:0;color:var(--ink2);font-size:14px}
.kv dt{font-size:14px}
.opener{background:var(--tint);border-radius:16px;padding:18px 22px;margin:22px 0 0}
.opener p{margin:6px 0 0}.opener .label{margin:0}
details{margin-top:16px}
summary{cursor:pointer;color:var(--ink2);font-size:14px;list-style:none;display:inline-block}
summary::-webkit-details-marker{display:none}
summary::after{content:" +";color:var(--ink3)}
details[open] summary::after{content:" \\2212"}
details p,.print-only p{color:var(--ink2);font-size:14px;margin:10px 0 0;max-width:42em}
.source{color:var(--ink3)}
.dims{display:flex;flex-wrap:wrap;gap:6px 28px;margin:12px 0 0}
.dims div{display:flex;gap:8px}.dims dd{margin:0;font-size:13px;color:var(--ink)}.dims dt{font-size:13px}
.patterns{margin-top:12px}
.pattern{display:grid;grid-template-columns:56px 1fr;gap:16px;padding:18px 0;border-top:1px solid var(--line);break-inside:avoid}
.pattern b{font-weight:300;font-size:28px;line-height:1}
.pattern h4{margin:0;font-size:15px;font-weight:500}
.pattern p{margin:2px 0 0;color:var(--ink2);font-size:14px}
.angle{font-weight:400;font-size:22px;line-height:1.4;letter-spacing:-.02em;margin:10px 0 22px;max-width:30em}
.steps{display:grid;grid-template-columns:repeat(3,1fr);gap:32px;border-top:1px solid var(--line);padding-top:20px;margin:0}
.steps dd{margin:4px 0 0;font-size:14px;color:var(--ink2)}
.limits{margin:10px 0 0;padding:0;list-style:none}
.limits li{padding:10px 0;border-top:1px solid var(--line);color:var(--ink2);font-size:14px}
.print-only{display:none}
.empty{color:var(--ink3);font-size:14px;padding:18px 0;margin:0}
footer{margin-top:56px;display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;color:var(--ink3);font-size:12px}
@media screen and (max-width:760px){.sheet{margin:0;border-radius:0;box-shadow:none;padding:40px 22px}.facts,.steps{grid-template-columns:1fr 1fr;gap:16px}.kv{grid-template-columns:1fr;gap:2px}.kv dd{margin-bottom:10px}.top .big{font-size:48px}}
@page{margin:14mm}
@media print{
  :root{--bg:#fff;--sheet:#fff;--ink:#111;--ink2:#444;--ink3:#777;--line:#e2e2de;--tint:#eef4f6;--accent:#1f7fb0;--link-line:#bbb;--shadow:none}
  body{background:#fff;font-size:12.5px}
  .sheet{margin:0;max-width:none;padding:0;border-radius:0;box-shadow:none;zoom:.92}
  section.block{margin-top:40px}
  .top,.opener,.pattern,.steps{break-inside:avoid}
  .eyebrow,h2.section,.note{break-after:avoid}
  .screen-only{display:none}.print-only{display:block;margin-top:10px}
  .prospect{padding:20px 0}
  .signal{font-size:14px;margin:10px 0 12px}
  .kv{gap:4px 20px}.kv dt,.kv dd{font-size:12px}
  .opener{padding:10px 14px;margin-top:12px;border-radius:10px}
  details{margin-top:10px}details p,.print-only p{font-size:12px;margin-top:6px}
  .score b{font-size:24px}
  .opener{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
"""


def build_html(data: dict[str, Any]) -> str:
    prospectos = [p for p in as_list(data.get("prospectos")) if isinstance(p, dict)]
    patrones = [p for p in as_list(data.get("patrones")) if isinstance(p, dict)]
    plan = as_dict(data.get("plan"))
    scores = [clamp(p.get("score")) for p in prospectos]
    promedio = round(sum(scores) / len(scores)) if scores else 0
    fuertes = sum(1 for p in prospectos if clamp(p.get("score")) >= 80)
    top = max(prospectos, key=lambda p: clamp(p.get("score")), default={})
    top_nombre = (top.get("nombre") or f"Prospecto {prospectos.index(top) + 1}") if top else ""
    meta = ' <span aria-hidden="true">&middot;</span> '.join(
        esc(part)
        for part in (
            "Buscador de clientes ProfeTok",
            data.get("generado_el"),
            f"Modo {str(data.get('modo') or 'estandar')}",
        )
        if part
    )

    prospect_html = "".join(render_prospecto(p, i) for i, p in enumerate(prospectos, 1))
    pattern_html = "".join(render_patron(p) for p in patrones)
    limits_html = "".join(f"<li>{esc(x)}</li>" for x in as_list(data.get("limites")))
    plan_html = "".join(
        f'<div><dt>{esc(label)}</dt><dd>{esc(plan.get(key, ""))}</dd></div>'
        for key, label in (
            ("primer_paso", "Primer paso"),
            ("seguimiento", "Seguimiento"),
            ("exito", "Senal de exito"),
        )
    )
    top_html = (
        f"""
  <section class="top">
    <div>
      <p class="eyebrow">Prospecto con mas confianza</p>
      <h2>{esc(top_nombre)}</h2>
      <p>{esc(top.get('por_que_ahora', top.get('senal', '')))}</p>
    </div>
    <div class="big num">{clamp(top.get('score'))}</div>
  </section>"""
        if top
        else ""
    )

    return f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>{esc(data.get('titulo', 'Buscador de clientes ProfeTok'))}</title>
<style>{CSS}</style>
</head>
<body>
<main class="sheet">
  <header>
    <p class="meta">{meta}</p>
    <h1>{esc(data.get('titulo', 'Buscador de clientes ProfeTok'))}</h1>
    <p class="verdict">{esc(data.get('veredicto', 'Sin veredicto.'))}</p>
  </header>

  <dl class="facts">
    <div><dt>Producto</dt><dd><a href="{safe_url(data.get('producto_url'))}" target="_blank" rel="noreferrer">{esc(data.get('producto', 'No indicado'))}</a></dd></div>
    <div><dt>Cliente objetivo</dt><dd>{esc(data.get('cliente_objetivo', 'No indicado'))}</dd></div>
    <div><dt>Prospectos calificados</dt><dd class="num">{len(prospectos)} <span class="sub">({fuertes} fuertes)</span></dd></div>
    <div><dt>Puntaje promedio</dt><dd class="num">{promedio} de 100</dd></div>
  </dl>
{top_html}
  <section class="block">
    <p class="eyebrow">Lista corta</p>
    <h2 class="section">A quien escribirle primero</h2>
    <p class="note">Fuentes: {esc(data.get('alcance', 'no indicado'))}.</p>
    {prospect_html or '<p class="empty">No se cargaron prospectos calificados.</p>'}
  </section>

  <section class="block">
    <p class="eyebrow">Patrones</p>
    <h2 class="section">Senales que se repiten</h2>
    <p class="note">Problemas que aparecieron mas de una vez. Empieza por estos.</p>
    <div class="patterns">{pattern_html or '<p class="empty">No se cargaron patrones.</p>'}</div>
  </section>

  <section class="block">
    <p class="eyebrow">Proximos siete dias</p>
    <h2 class="section">Que hacer esta semana</h2>
    <p class="angle">{esc(plan.get('angulo', 'Confirma el dolor antes de ofrecer el producto.'))}</p>
    <dl class="steps">{plan_html}</dl>
  </section>

  <section class="block">
    <p class="eyebrow">Limites</p>
    <h2 class="section">Lee esto antes de actuar</h2>
    <ul class="limits">{limits_html or '<li>Son posibles clientes deducidos de senales publicas, no compradores confirmados.</li>'}</ul>
  </section>

  <footer>
    <span>Hecho solo con publicaciones publicas. Nada de aqui se envia por ti. Ley 29733: no guardes datos personales sin permiso.</span>
  </footer>
</main>
</body>
</html>"""


def main() -> None:
    parser = argparse.ArgumentParser(description="Genera el reporte HTML del buscador de clientes.")
    parser.add_argument("entrada", type=Path, help="Ruta del JSON de analisis")
    parser.add_argument("salida", type=Path, help="Ruta del HTML de salida")
    args = parser.parse_args()

    data = json.loads(args.entrada.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise SystemExit("El JSON de entrada debe ser un objeto en el nivel superior.")

    args.salida.parent.mkdir(parents=True, exist_ok=True)
    args.salida.write_text(build_html(data), encoding="utf-8")
    print(f"Reporte creado: {args.salida.resolve()}")


if __name__ == "__main__":
    main()
