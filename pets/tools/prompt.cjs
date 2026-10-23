const s = require('fs').readFileSync(process.env.TEMP + '/cb/pets/tools/prompts.py', 'utf8').replace(/\r/g, '');
const blk = n => s.match(new RegExp('^' + n + String.raw` = (\{[\s\S]*?\})\n(?=\S)`, 'm'))[1];
const SP = eval('(' + blk('SP') + ')'), NM = eval('(' + blk('NM') + ')');
const R = eval('(' + blk('R').replace(/\("/g, '["').replace(/\]\),/g, ']],') + ')');
module.exports = (key, over) => {
  const pet = key.split('_')[0]; let [th, a, b, c] = R[key]; if (over) c = over;
  return `請畫一張圖：附圖這隻${SP[pet]}（同一隻角色，臉、顏色、畫風完全一樣，可愛 3D 卡通風、適合國小三年級）長大的三個階段，由左到右排成一排，三隻之間要留明顯空白、彼此不可重疊或碰到，每隻全身完整入鏡（腳也要完整）、正面站姿。這條成長路線的主題是「${th}」。左：少年（比寶寶稍大）＝「${a[0]}」：${a[1]}。中：勇者（更大）＝「${b[0]}」：${b[1]}。右：傳說（最大、最威風）＝「${c[0]}」：${c[1]}。三隻體型由小到大、越來越成熟帥氣，但還是同一隻${NM[pet]}。純白色背景，不要陰影和地板。圖裡完全不要出現任何文字、數字或字母。橫式 3:2。`;
};
module.exports.R = R;
if (require.main === module) console.log(module.exports(process.argv[2]));
