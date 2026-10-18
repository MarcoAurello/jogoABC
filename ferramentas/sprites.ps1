# Recorta as animações da Ana de "imgs/sprites para o jogo.jpeg" e remove o fundo quadriculado.
# Saída: assets/ana/ana_<linha>.png (folha horizontal, quadros de mesmo tamanho)
param([string]$Raiz = (Split-Path $PSScriptRoot -Parent))
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @"
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic;
public static class Cortador {
  static bool Fundo(Color c){ int mx=Math.Max(c.R,Math.Max(c.G,c.B)), mn=Math.Min(c.R,Math.Min(c.G,c.B)); return (mx-mn)<20 && mn>105 && mx<205; }
  public static string Rodar(string origem, string pasta, string nome, int y0, int y1, int altura){
    var img = new Bitmap(origem); int W=img.Width;
    var col = new int[W];
    for(int x=0;x<W;x++) for(int y=y0;y<y1;y++) if(!Fundo(img.GetPixel(x,y))) col[x]++;
    var segs = new List<int[]>(); int ini=-1;
    for(int x=0;x<W;x++){ bool on=col[x]>2; if(on&&ini<0) ini=x; if(!on&&ini>=0){ if(x-ini>25) segs.Add(new[]{ini,x}); ini=-1; } }
    int largura=0; foreach(var s in segs) largura=Math.Max(largura,s[1]-s[0]);
    largura+=8; int H=y1-y0;
    var folha = new Bitmap(largura*segs.Count, H, PixelFormat.Format32bppArgb);
    for(int i=0;i<segs.Count;i++){
      int sx=segs[i][0], sw=segs[i][1]-sx;
      // flood fill do fundo a partir das bordas do recorte
      var bg = new bool[sw+8,H]; var fila=new Queue<int[]>();
      Func<int,int,Color> px = (x,y)=>{ int ix=sx-4+x; if(ix<0||ix>=W) return Color.FromArgb(160,160,160); return img.GetPixel(ix,y0+y); };
      int w2=sw+8;
      for(int x=0;x<w2;x++){ fila.Enqueue(new[]{x,0}); fila.Enqueue(new[]{x,H-1}); }
      for(int y=0;y<H;y++){ fila.Enqueue(new[]{0,y}); fila.Enqueue(new[]{w2-1,y}); }
      while(fila.Count>0){ var p=fila.Dequeue(); int x=p[0],y=p[1]; if(x<0||y<0||x>=w2||y>=H||bg[x,y]) continue; if(!Fundo(px(x,y))) continue; bg[x,y]=true;
        fila.Enqueue(new[]{x+1,y}); fila.Enqueue(new[]{x-1,y}); fila.Enqueue(new[]{x,y+1}); fila.Enqueue(new[]{x,y-1}); }
      // buracos fechados do fundo (ex.: entre as pernas): regiões cinzas grandes também são fundo
      var vis = new bool[w2,H];
      for(int x0=0;x0<w2;x0++) for(int yy=0;yy<H;yy++){ if(bg[x0,yy]||vis[x0,yy]||!Fundo(px(x0,yy))) continue;
        var comp=new List<int[]>(); var q2=new Queue<int[]>(); q2.Enqueue(new[]{x0,yy}); vis[x0,yy]=true;
        while(q2.Count>0){ var p=q2.Dequeue(); comp.Add(p); int[][] vz={new[]{p[0]+1,p[1]},new[]{p[0]-1,p[1]},new[]{p[0],p[1]+1},new[]{p[0],p[1]-1}};
          foreach(var v in vz){ if(v[0]<0||v[1]<0||v[0]>=w2||v[1]>=H||vis[v[0],v[1]]||bg[v[0],v[1]]||!Fundo(px(v[0],v[1]))) continue; vis[v[0],v[1]]=true; q2.Enqueue(v);} }
        if(comp.Count>=40) foreach(var p in comp) bg[p[0],p[1]]=true; }
      int ox=i*largura+(largura-w2)/2;
      for(int x=0;x<w2;x++) for(int y=0;y<H;y++){ if(bg[x,y]) continue;
        // suaviza a borda: pixel vizinho do fundo e meio cinza fica semitransparente
        Color c=px(x,y); int a=255;
        bool viz=(x>0&&bg[x-1,y])||(x<w2-1&&bg[x+1,y])||(y>0&&bg[x,y-1])||(y<H-1&&bg[x,y+1]);
        if(viz){ int mx=Math.Max(c.R,Math.Max(c.G,c.B)), mn=Math.Min(c.R,Math.Min(c.G,c.B)); if(mx-mn<35 && mn>90) a=110; }
        folha.SetPixel(ox+x,y,Color.FromArgb(a,c)); }
    }
    folha.Save(pasta+"\\"+nome+".png", ImageFormat.Png);
    return nome+": "+segs.Count+" quadros, "+largura+"x"+H;
  }
}
"@
$origem = Join-Path $Raiz 'imgs\sprites para o jogo.jpeg'
$pasta = Join-Path $Raiz 'assets\ana'
New-Item -ItemType Directory -Force $pasta | Out-Null
[Cortador]::Rodar($origem, $pasta, 'ana_danca',   84, 224, 0)
[Cortador]::Rodar($origem, $pasta, 'ana_triste', 264, 402, 0)
[Cortador]::Rodar($origem, $pasta, 'ana_pensa',  459, 556, 0)
