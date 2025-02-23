const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');

let globalFrameCounter = 0;

/**
 * Divide uma imagem de mangá em quadros individuais
 * @param {string} inputPath - Caminho para a imagem de entrada
 * @param {string} outputDir - Diretório para salvar os quadros
 * @param {Object} options - Opções de configuração
 */
async function splitMangaIntoFrames(inputPath, outputDir, options = {}) {
  // Configurações padrão
  const config = {
    minFrameHeight: options.minFrameHeight || 100,
    maxGapSize: options.maxGapSize || 20,
    backgroundColors: options.backgroundColors || [[0, 0, 0], [255, 255, 255]], // Preto e Branco
    colorThreshold: options.colorThreshold || 30,
    prefix: options.prefix || 'manga-frame'
  };

  console.log(`Carregando imagem: ${inputPath}`);
  
  // Garantir que o diretório de saída existe
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log(`Diretório de saída criado: ${outputDir}`);
  }

  // Carregar a imagem
  const image = await loadImage(inputPath);
  console.log(`Imagem carregada: ${image.width}x${image.height}`);

  // Criar canvas temporário para processamento
  const canvas = createCanvas(image.width, image.height);
  const ctx = canvas.getContext('2d');
  
  // Desenhar a imagem no canvas
  ctx.drawImage(image, 0, 0);
  
  // Obter dados da imagem
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  
  console.log('Analisando linhas horizontais...');
  
  // Array para armazenar linhas horizontais de separação (posições Y)
  const separationLines = [];
  
  // Detectar linhas horizontais de separação (scanning horizontal)
  for (let y = 0; y < canvas.height; y++) {
    let isEmptyLine = true;
    
    // Verificar se a linha é predominantemente de uma das cores de fundo
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const r = pixels[idx];
      const g = pixels[idx + 1];
      const b = pixels[idx + 2];
      
      let matchesBackground = false;
      
      for (const bgColor of config.backgroundColors) {
        const diffR = Math.abs(r - bgColor[0]);
        const diffG = Math.abs(g - bgColor[1]);
        const diffB = Math.abs(b - bgColor[2]);
        
        if (diffR <= config.colorThreshold && 
            diffG <= config.colorThreshold && 
            diffB <= config.colorThreshold) {
          matchesBackground = true;
          break;
        }
      }
      
      if (!matchesBackground) {
        isEmptyLine = false;
        break;
      }
    }
    
    // Se for uma linha vazia, adicionar à lista de separações
    if (isEmptyLine) {
      separationLines.push(y);
    }
  }
  
  console.log(`Encontradas ${separationLines.length} linhas de separação`);
  
  // Agrupar linhas adjacentes para encontrar regiões de separação
  const separationRegions = [];
  let currentRegion = [];
  
  for (let i = 0; i < separationLines.length; i++) {
    if (i === 0 || separationLines[i] === separationLines[i - 1] + 1) {
      currentRegion.push(separationLines[i]);
    } else {
      if (currentRegion.length > 0) {
        separationRegions.push({
          start: currentRegion[0],
          end: currentRegion[currentRegion.length - 1],
          size: currentRegion.length
        });
      }
      currentRegion = [separationLines[i]];
    }
  }
  
  // Adicionar a última região se existir
  if (currentRegion.length > 0) {
    separationRegions.push({
      start: currentRegion[0],
      end: currentRegion[currentRegion.length - 1],
      size: currentRegion.length
    });
  }
  
  console.log(`Encontradas ${separationRegions.length} regiões de separação`);
  
  // Filtrar regiões muito pequenas (podem ser ruído)
  const significantRegions = separationRegions.filter(region => 
    region.size >= config.maxGapSize
  );
  
  console.log(`Encontradas ${significantRegions.length} regiões significativas`);
  
  // Calcular os limites dos frames
  const frameRanges = [];
  let lastEndY = 0;
  
  // Adicionar o topo da imagem se necessário
  if (significantRegions.length > 0 && significantRegions[0].start > 0) {
    frameRanges.push({
      startY: 0,
      endY: significantRegions[0].start - 1
    });
    lastEndY = significantRegions[0].end + 1;
  }
  
  // Adicionar frames intermediários
  for (let i = 1; i < significantRegions.length; i++) {
    const currentRegion = significantRegions[i];
    const previousRegion = significantRegions[i - 1];
    
    const frameHeight = currentRegion.start - previousRegion.end - 1;
    
    if (frameHeight >= config.minFrameHeight) {
      frameRanges.push({
        startY: previousRegion.end + 1,
        endY: currentRegion.start - 1
      });
    }
    
    lastEndY = currentRegion.end + 1;
  }
  
  // Adicionar o último frame se necessário
  if (lastEndY < canvas.height) {
    frameRanges.push({
      startY: lastEndY,
      endY: canvas.height - 1
    });
  }
  
  console.log(`Detectados ${frameRanges.length} quadros`);
  
  // Gerar e salvar os frames como imagens separadas
  for (let i = 0; i < frameRanges.length; i++) {
    const range = frameRanges[i];
    const frameHeight = range.endY - range.startY + 1;
    
    // Pular frames muito pequenos
    if (frameHeight < config.minFrameHeight) {
      console.log(`Pulando quadro ${i + 1} - altura insuficiente (${frameHeight}px)`);
      continue;
    }
    
    // Criar canvas para o frame atual
    const frameCanvas = createCanvas(canvas.width, frameHeight);
    const frameCtx = frameCanvas.getContext('2d');
    
    // Extrair o frame da imagem original
    frameCtx.drawImage(
      image,
      0, range.startY,
      canvas.width, frameHeight,
      0, 0,
      canvas.width, frameHeight
    );
    
    // Salvar o frame como um arquivo PNG
    const framePath = path.join(outputDir, `${config.prefix}-${globalFrameCounter + 1}.png`);
    const frameBuffer = frameCanvas.toBuffer('image/png');
    fs.writeFileSync(framePath, frameBuffer);
    
    console.log(`Quadro ${globalFrameCounter + 1} salvo: ${framePath} (${canvas.width}x${frameHeight}px)`);
    globalFrameCounter++;
  }
  
  return {
    inputPath,
    outputDir,
    framesCount: frameRanges.length,
    frameRanges
  };
}

// Se executado diretamente pelo Node
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log(`
Uso: node manga-splitter.js <diretorio-de-imagens> <diretorio-de-saida> [opcoes]

Opções:
  --min-height=N       Altura mínima do quadro em pixels (padrão: 100)
  --gap-size=N         Tamanho mínimo do gap entre quadros (padrão: 20)
  --color-threshold=N  Limiar para detecção de cor (padrão: 30)
  --prefix=texto       Prefixo para os nomes dos arquivos (padrão: 'manga-frame')
    `);
    process.exit(1);
  }
  
  const inputDir = args[0];
  const outputDir = args[1];
  
  // Parsar opções da linha de comando
  const options = {};
  
  for (let i = 2; i < args.length; i++) {
    const arg = args[i];
    
    if (arg.startsWith('--min-height=')) {
      options.minFrameHeight = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--gap-size=')) {
      options.maxGapSize = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--color-threshold=')) {
      options.colorThreshold = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--prefix=')) {
      options.prefix = arg.split('=')[1];
    }
  }
  
  console.log('Iniciando separação de quadros de mangá...');
  console.log(`Diretório de entrada: ${inputDir}`);
  console.log(`Diretório de saída: ${outputDir}`);
  console.log('Opções:', options);
  
  fs.readdir(inputDir, (err, files) => {
    if (err) {
      console.error('Erro ao ler o diretório de entrada:', err.message);
      process.exit(1);
    }
    
    const imageFiles = files.filter(file => /\.(jpe?g|png)$/i.test(file));
    
    if (imageFiles.length === 0) {
      console.log('Nenhuma imagem encontrada no diretório de entrada.');
      process.exit(1);
    }
    
    let totalFrames = 0;
    
    (async () => {
      for (const file of imageFiles) {
        const inputPath = path.join(inputDir, file);
        const result = await splitMangaIntoFrames(inputPath, outputDir, options);
        totalFrames += result.framesCount;
      }
      
      console.log(`\nProcessamento concluído! ${totalFrames} quadros foram extraídos de ${imageFiles.length} imagens.`);
    })().catch(error => {
      console.error('Erro:', error.message);
      process.exit(1);
    });
  });
}

// Exportar a função para uso como um módulo
module.exports = {
  splitMangaIntoFrames
};