// manga-video-generator.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { createCanvas, loadImage } = require('canvas');

async function generateMangaVideo(framesDir, outputPath, options = {}) {
  // Configurações padrão com FPS aumentado
  const config = {
    width: options.width || 1280,
    height: options.height || 720,
    fps: options.fps || 30,           // Aumentado para 30 FPS
    duration: options.duration || 3,   // Duração de cada quadro em segundos
    blurAmount: options.blurAmount || 20,
    tempDir: options.tempDir || path.join(framesDir, 'temp'),
    ffmpegPath: options.ffmpegPath || 'ffmpeg'
  };

  // Garantir que os diretórios existem
  if (!fs.existsSync(config.tempDir)) {
    fs.mkdirSync(config.tempDir, { recursive: true });
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Obter lista de quadros ordenados
  const frameFiles = fs.readdirSync(framesDir)
    .filter(file => /\.(jpg|jpeg|png)$/i.test(file))
    .sort((a, b) => {
      const numA = parseInt(a.match(/\d+/) || 0);
      const numB = parseInt(b.match(/\d+/) || 0);
      return numA - numB;
    });

  console.log(`Encontrados ${frameFiles.length} quadros para processar`);
  
  let frameCounter = 0;
  const totalFramesPerImage = config.fps * config.duration;
  
  for (const file of frameFiles) {
    const imagePath = path.join(framesDir, file);
    console.log(`\nProcessando: ${file}`);
    
    try {
      const image = await loadImage(imagePath);
      
      // Calcular dimensões mantendo aspect ratio
      let drawWidth, drawHeight;
      const aspectRatio = image.width / image.height;
      
      if (aspectRatio > 1) {
        drawHeight = config.height * 0.8;
        drawWidth = drawHeight * aspectRatio;
      } else {
        drawWidth = config.width * 0.8;
        drawHeight = drawWidth / aspectRatio;
      }
      
      // Ajustar se exceder limites
      if (drawWidth > config.width * 0.8) {
        drawWidth = config.width * 0.8;
        drawHeight = drawWidth / aspectRatio;
      }
      if (drawHeight > config.height * 0.8) {
        drawHeight = config.height * 0.8;
        drawWidth = drawHeight * aspectRatio;
      }
      
      // Calcular margens de 20%
      const margin = config.width * 0.2;
      const startX = config.width - drawWidth - margin; // Começa com 20% da borda direita
      const endX = margin;  // Termina com 20% da borda esquerda
      const totalDistance = startX - endX;
      
      // Gerar frames com movimento suave
      for (let f = 0; f < totalFramesPerImage; f++) {
        frameCounter++;
        
        // Usar easeInOutCubic para movimento mais suave
        const progress = f / (totalFramesPerImage - 1);
        const easedProgress = easeInOutCubic(progress);
        const currentX = startX - (easedProgress * totalDistance);
        const currentY = (config.height - drawHeight) / 2;
        
        const canvas = createCanvas(config.width, config.height);
        const ctx = canvas.getContext('2d');
        
        // Fundo preto
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, config.width, config.height);
        
        // Versão borrada no fundo
        ctx.globalAlpha = 0.3;
        const bgScale = Math.max(config.width / image.width, config.height / image.height) * 1.2;
        const bgWidth = image.width * bgScale;
        const bgHeight = image.height * bgScale;
        const bgX = (config.width - bgWidth) / 2;
        const bgY = (config.height - bgHeight) / 2;
        ctx.drawImage(image, bgX, bgY, bgWidth, bgHeight);
        
        // Imagem principal
        ctx.globalAlpha = 1.0;
        ctx.drawImage(image, currentX, currentY, drawWidth, drawHeight);
        
        // Salvar frame
        const frameNumber = String(frameCounter).padStart(6, '0');
        const framePath = path.join(config.tempDir, `frame_${frameNumber}.png`);
        const frameBuffer = canvas.toBuffer('image/png');
        fs.writeFileSync(framePath, frameBuffer);
        
        if (f % 10 === 0) {
          console.log(`Progresso: ${Math.round((f + 1) / totalFramesPerImage * 100)}%`);
        }
      }
      
    } catch (error) {
      console.error(`Erro ao processar ${file}:`, error);
      throw error;
    }
  }
  
  // Criar vídeo com FFmpeg
  return new Promise((resolve, reject) => {
    const ffmpegCmd = `"${config.ffmpegPath}" -y -framerate ${config.fps} -i "${path.join(config.tempDir, 'frame_%06d.png')}" -c:v libx264 -preset slow -crf 22 -pix_fmt yuv420p "${outputPath}"`;
    
    console.log('Gerando vídeo final...');
    console.log(`Comando FFmpeg: ${ffmpegCmd}`);
    
    exec(ffmpegCmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Erro ao executar FFmpeg:', error);
        return reject(error);
      }
      
      // Limpar arquivos temporários
      if (!options.keepTemp) {
        console.log('Limpando arquivos temporários...');
        fs.readdirSync(config.tempDir).forEach(file => {
          fs.unlinkSync(path.join(config.tempDir, file));
        });
        fs.rmdirSync(config.tempDir);
      }
      
      resolve({
        outputPath,
        frameCount: frameCounter,
        duration: (frameCounter / config.fps).toFixed(2)
      });
    });
  });
}

// Função de easing para movimento mais suave
function easeInOutCubic(t) {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Execução via linha de comando
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Uso: node manga-video-generator.js <diretorio-dos-quadros> <video-saida> [opcoes]

Opções:
  --width=N           Largura do vídeo (padrão: 1280)
  --height=N          Altura do vídeo (padrão: 720)
  --fps=N             Frames por segundo (padrão: 30)
  --duration=N        Duração por quadro em segundos (padrão: 3)
  --keep-temp         Manter arquivos temporários
  --ffmpeg=caminho    Caminho do FFmpeg
    `);
    process.exit(1);
  }
  
  const framesDir = args[0];
  const outputPath = args[1];
  const options = {};
  
  // Processar opções
  args.slice(2).forEach(arg => {
    if (arg === '--keep-temp') {
      options.keepTemp = true;
    } else if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      options[key] = isNaN(value) ? value : Number(value);
    }
  });
  
  generateMangaVideo(framesDir, outputPath, options)
    .then(result => {
      console.log('\nVídeo gerado com sucesso!');
      console.log(`Arquivo: ${result.outputPath}`);
      console.log(`Frames: ${result.frameCount}`);
      console.log(`Duração: ${result.duration} segundos`);
    })
    .catch(error => {
      console.error('Erro:', error.message);
      process.exit(1);
    });
}

module.exports = { generateMangaVideo };