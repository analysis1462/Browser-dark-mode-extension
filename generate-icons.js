const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 48, 128];
const outputDir = path.join(__dirname, 'icons');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function drawMoonIcon(ctx, size, isDark) {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  
  ctx.clearRect(0, 0, size, size);
  
  if (!isDark) {
    ctx.fillStyle = '#1a1a2e';
  } else {
    ctx.fillStyle = '#eaeaea';
  }
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(centerX + radius * 0.3, centerY - radius * 0.3, radius * 0.85, 0, Math.PI * 2);
  ctx.fill();
  
  ctx.globalCompositeOperation = 'source-over';
}

function generateIcon(size, isDark) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  drawMoonIcon(ctx, size, isDark);
  
  const buffer = canvas.toBuffer('image/png');
  const suffix = isDark ? '-dark' : '';
  const filePath = path.join(outputDir, `icon${size}${suffix}.png`);
  
  fs.writeFileSync(filePath, buffer);
  console.log(`Generated: icon${size}${suffix}.png`);
}

try {
  sizes.forEach(size => {
    generateIcon(size, false);
    generateIcon(size, true);
  });
  
  console.log('\n✅ 所有图标生成完成！');
  console.log(`📁 图标保存在: ${outputDir}`);
} catch (error) {
  console.error('❌ 生成图标时出错:', error.message);
  console.log('\n提示: 请先安装 canvas 库:');
  console.log('  npm install canvas');
  console.log('\n或者使用在线工具生成图标。');
}
