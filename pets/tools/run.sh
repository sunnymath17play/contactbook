# usage: run.sh key tile0 tile1  -> crops into out/<key>_{2,3,4}.png
cd /tmp/claude-0/-home-claude/d6bbd147-fef6-5ee2-897f-3aa99f55108c/scratchpad/art && mkdir -p out && python3 cut.py "$2" "$3" 0 "out/$1" && python3 -c "
from PIL import Image
ims=[Image.open(f'out/$1_{i}.png') for i in (2,3,4)]
o=Image.new('RGBA',(1536,512),(255,236,210,255))
for i,im in enumerate(ims): o.alpha_composite(im,(i*512,0))
o.convert('RGB').resize((768,256)).save('out/$1_preview.jpg',quality=80)"
