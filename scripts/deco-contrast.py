# Contraste do texto sobre a decoração de fundo (Style Guide 2.3), no pior caso: as três ondas
# cobrindo o mesmo ponto, linha a linha, nas duas zonas e nos dois temas. Uso:
#   python3 scripts/deco-contrast.py [fator]   # fator multiplica a intensidade de cada tema
# A lateral usa --deco-alpha-side (ver globals.css). Saída esperada:
# nenhuma faixa abaixo de 4,5:1 para foreground, body-text e muted.
# Se mudar tokens de cor, geometria das ondas ou máscara, atualize os valores abaixo e rode de novo.
import sys
def rgb(h): h=h.lstrip('#'); return [int(h[i:i+2],16) for i in (0,2,4)]
def lin(c): c/=255; return c/12.92 if c<=.04045 else ((c+.055)/1.055)**2.4
def lum(c): r,g,b=[lin(x) for x in c]; return .2126*r+.7152*g+.0722*b
def cr(a,b): la,lb=lum(a),lum(b); return (max(la,lb)+.05)/(min(la,lb)+.05)
def over(base,top,a): return [base[i]*(1-a)+top[i]*a for i in range(3)]
LAYERS=[(1.0,120,70),(0.7,150,90),(0.45,90,60)]   # fator de opacidade, baseline, amplitude (Q => pico = A/2)
def grad(yv,base,A):
    top=base-A/2; return max(0,1-(yv-top)/(300-top)) if yv>=top else None
def mask(frac, kind, top_fade):
    # frac = distância da borda de origem / altura. side: opaco até 55% e some até 100%. top: some em top_fade.
    if kind=='side': return 1 if frac<=.45 else max(0,(1-frac)/.55)   # frac contado a partir da base
    return max(0,1-frac/top_fade)
def worst(kind,H,alpha,bg,deco,texts,top_fade):
    out=[]
    for px in range(0,H,10):                # px = distância da borda de origem (base na lateral, topo no conteúdo)
        frac=px/H; yv=300-frac*300           # coordenada no viewBox (0 = topo do desenho, 300 = base)
        m=mask(frac,kind,top_fade); c=rgb(bg)
        for f,base,A in LAYERS:
            g=grad(yv,base,A)
            if g is None: continue
            c=over(c,deco,alpha*f*g*m)
        out.append((px,{k:cr(rgb(v),c) for k,v in texts.items()}))
    return out
T={'claro':dict(alpha=.25,side_alpha=.06,top_fade=.6,deco=(8,122,85),nav='#eff1f1',bg='#f6f7f7',texts={'foreground':'#0f1413','body-text':'#434d4a','muted':'#5f6966'}),
   'escuro':dict(alpha=.22,side_alpha=.088,top_fade=.8,deco=(85,214,164),nav='#0d1010',bg='#0a0c0c',texts={'foreground':'#e9edec','body-text':'#aab3b0','muted':'#87918e'})}
scale=float(sys.argv[1]) if len(sys.argv)>1 else 1.0
for name,t in T.items():
    for kind,H,bg,alpha in (('side',260,t['nav'],t['side_alpha']),('top',320,t['bg'],t['alpha'])):
        a=alpha*scale
        rows=worst(kind,H,a,bg,t['deco'],t['texts'],t['top_fade'])
        fail={k:[px for px,r in rows if r[k]<4.5] for k in t['texts']}
        desc=lambda l:(f"{min(l)}–{max(l)}px" if l else "nenhuma")
        print(f"{name:6} {kind:4} alpha {a:.3f} | abaixo de 4,5:1 — foreground {desc(fail['foreground'])} · body-text {desc(fail['body-text'])} · muted {desc(fail['muted'])}")
