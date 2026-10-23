import sys, os, numpy as np
WT=int(os.environ.get('WT','247'))
SEEDS=os.environ.get('SEEDS','')
from PIL import Image
from scipy import ndimage
def stitch(t0,t1,off,W=1536,H=1024):
    A=Image.open(t0); vh=round(A.height*W/A.width); off=H-vh
    a=A.convert('RGB').resize((W,vh),Image.LANCZOS); b=Image.open(t1).convert('RGB').resize((W,vh),Image.LANCZOS)
    im=Image.new('RGB',(W,H),'white'); im.paste(a,(0,0)); im.paste(b,(0,off)); return im
def cutout(im):
    a=np.asarray(im).astype(int); white=(a.min(2)>=WT)&((a.max(2)-a.min(2))<10)
    lab,n=ndimage.label(white); edge=set(lab[0])|set(lab[-1])|set(lab[:,0])|set(lab[:,-1]); edge.discard(0)
    bg=np.isin(lab,list(edge))
    alpha=np.where(bg,0,255).astype(np.uint8)
    # soften edge: semi-transparent for near-white boundary pixels
    alpha=ndimage.grey_erosion(alpha,size=2); alpha=ndimage.uniform_filter(alpha.astype(float),3).astype(np.uint8)
    rgba=np.dstack([a.astype(np.uint8),alpha]); return Image.fromarray(rgba,'RGBA')
def split(rgba,k):
    A=np.asarray(rgba); al=A[:,:,3]>40; H,W=al.shape
    ys=np.where(al.any(1))[0]; y1=ys.max(); band=al[int(y1-(y1-ys.min())*0.12):y1]   # feet band
    # 1D k-means on feet pixel x positions -> k characters
    yy,xx=np.nonzero(band); xs=xx.astype(float); c=np.linspace(xs.min(),xs.max(),k+2)[1:-1]
    for _ in range(50):
        a=np.argmin(np.abs(xs[:,None]-c[None]),1); c=np.array([xs[a==j].mean() if (a==j).any() else c[j] for j in range(k)])
    lab=np.zeros((H,W),int); y0=int(y1-(y1-ys.min())*0.12)
    if SEEDS:
        for i,p in enumerate(SEEDS.split(';')):
            x,y=map(int,p.split(':')); yy_,xx_=np.ogrid[:H,:W]; m=((yy_-y)**2+(xx_-x)**2<30**2)&al; lab[m]=i+1
    else:
        lab[y0+yy,xx]=a+1
    # geodesic growth inside the mask
    for _ in range(3000):
        grown=ndimage.grey_dilation(lab,size=3); new=(lab==0)&al&(grown>0)
        if not new.any(): break
        lab[new]=grown[new]
    rest=al&(lab==0)
    if rest.any():
        idx=ndimage.distance_transform_edt(lab==0,return_distances=False,return_indices=True)
        lab[rest]=lab[idx[0][rest],idx[1][rest]]
    out=[]
    for i in range(1,k+1):
        sub=A.copy(); sub[:,:,3]=np.where(lab==i,A[:,:,3],0)
        im=Image.fromarray(sub,'RGBA'); bb=im.getchannel('A').point(lambda v:255 if v>40 else 0).getbbox(); im=im.crop(bb)
        side=int(max(im.size)*1.06); sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.paste(im,((side-im.width)//2,side-im.height-int(side*.02)),im)
        out.append(sq.resize((512,512),Image.LANCZOS))
    return out
if __name__=='__main__':
    t0,t1,off,prefix=sys.argv[1],sys.argv[2],int(sys.argv[3]),sys.argv[4]
    im=stitch(t0,t1,off); im.save(prefix+'_sheet.png')
    for i,s in enumerate(split(cutout(im),3)): s.save(f'{prefix}_{i+2}.png',optimize=True)
