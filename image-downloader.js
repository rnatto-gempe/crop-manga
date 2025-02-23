// manga-downloader.js
const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

async function downloadMangaPages(url, outputDir) {
  let browser;
  
  try {
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Baixando manga de: ${url}`);
    console.log(`Salvando em: ${outputDir}`);

    browser = await puppeteer.launch({
      headless: "new",
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      defaultViewport: { width: 1920, height: 1080 }
    });

    const page = await browser.newPage();

    // Configurar interceptação de requisições para analisar as URLs das imagens
    const imageUrls = new Set();
    await page.setRequestInterception(true);
    
    page.on('request', request => {
      const url = request.url();
      if (url.includes('objects.slimeread.com') && 
          (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.webp'))) {
        imageUrls.add(url);
      }
      request.continue();
    });

    // Configurar user agent e headers
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    await page.setExtraHTTPHeaders({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1'
    });

    console.log('Navegando para a página...');
    await page.goto(url, { 
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000 
    });

    // Scroll pela página para garantir que todo conteúdo seja carregado
    console.log('Scrollando pela página...');
    await autoScroll(page);

    // Esperar mais um pouco para garantir que tudo carregou
    await page.waitForTimeout(5000);

    // Encontrar todas as imagens na página
    const foundImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .map(img => img.src)
        .filter(src => src.includes('objects.slimeread.com'));
    });

    // Combinar imagens encontradas dos dois métodos
    const allImages = [...new Set([...imageUrls, ...foundImages])].sort();

    console.log(`Encontradas ${allImages.length} imagens`);

    if (allImages.length === 0) {
      throw new Error('Nenhuma imagem encontrada. Verifique se a URL está correta.');
    }

    // Headers para download
    const downloadHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'image/webp,*/*',
      'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
      'Referer': url,
      'Sec-Fetch-Dest': 'image',
      'Sec-Fetch-Mode': 'no-cors',
      'Sec-Fetch-Site': 'cross-site'
    };

    // Baixar cada imagem
    for (let i = 0; i < allImages.length; i++) {
      const imageUrl = allImages[i];
      const pageNumber = String(i + 1).padStart(3, '0');
      const extension = path.extname(imageUrl) || '.jpg';
      const filename = `page_${pageNumber}${extension}`;
      const outputPath = path.join(outputDir, filename);

      try {
        console.log(`\nBaixando página ${i + 1}/${allImages.length}: ${filename}`);
        console.log(`URL: ${imageUrl}`);
        
        const imageResponse = await axios({
          method: 'get',
          url: imageUrl,
          responseType: 'stream',
          headers: downloadHeaders,
          timeout: 30000
        });

        await pipeline(
          imageResponse.data,
          fs.createWriteStream(outputPath)
        );

        console.log(`Página ${i + 1} salva com sucesso`);
        
        // Delay entre downloads
        await new Promise(resolve => setTimeout(resolve, 1500));
        
      } catch (error) {
        console.error(`Erro ao baixar página ${i + 1}:`, error.message);
      }
    }

    console.log('\nDownload concluído!');
    return allImages.length;

  } catch (error) {
    console.error('Erro ao processar a página:', error.message);
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Função para scroll automático
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance = 100;
      const timer = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight) {
          clearInterval(timer);
          resolve();
        }
      }, 100);
    });
  });
}

// Se executado diretamente
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log(`
Uso: node manga-downloader.js <url> <diretorio-saida>

Exemplo:
  node manga-downloader.js "https://slimeread.com/ler/10654/cap-01" "./manga-output"
    `);
    process.exit(1);
  }

  const url = args[0];
  const outputDir = args[1];

  downloadMangaPages(url, outputDir)
    .then(count => {
      console.log(`\nTotal de ${count} páginas baixadas com sucesso!`);
    })
    .catch(error => {
      console.error('Erro:', error.message);
      process.exit(1);
    });
}

module.exports = {
  downloadMangaPages
};