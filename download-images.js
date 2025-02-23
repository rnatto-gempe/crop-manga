// bulk-downloader.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const stream = require('stream');
const pipeline = promisify(stream.pipeline);

async function downloadImages(urls, outputDir) {
  // Criar diretório se não existir
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/webp,*/*',
    'Accept-Language': 'pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7',
    'Referer': 'https://slimeread.com/',
  };

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const pageNumber = String(i + 1).padStart(3, '0');
    const extension = path.extname(url) || '.jpg';
    const filename = `page_${pageNumber}${extension}`;
    const outputPath = path.join(outputDir, filename);

    try {
      console.log(`\nBaixando imagem ${i + 1}/${urls.length}`);
      console.log(`URL: ${url}`);
      console.log(`Salvando como: ${filename}`);

      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        headers: headers,
        timeout: 30000
      });

      await pipeline(
        response.data,
        fs.createWriteStream(outputPath)
      );

      console.log(`✓ Imagem ${i + 1} salva com sucesso`);

      // Pequeno delay entre downloads
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`✗ Erro ao baixar imagem ${i + 1}:`, error.message);
    }
  }
}

// Array de URLs para baixar
const imageUrls = ["https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_0.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_1.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_2.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_3.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_4.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_5.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_6.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_7.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_8.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_9.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_10.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_11.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_12.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_13.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_14.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_15.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_16.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_17.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_18.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_19.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_20.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_21.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_22.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_23.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_24.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_25.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_26.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_27.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_28.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_29.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_30.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_31.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_32.jpg",
    "https://objects.slimeread.com/808ce033-a7f3-4cce-9b30-92fc6c975a51/cfcc2502-0c60-4c83-8442-0376f9783c19/solo_leveling_149_33.jpg"
];

// Se executado diretamente
if (require.main === module) {
  const outputDir = './downloaded-images';
  
  console.log(`Iniciando download de ${imageUrls.length} imagens...`);
  console.log(`Diretório de saída: ${outputDir}`);

  downloadImages(imageUrls, outputDir)
    .then(() => {
      console.log('\nDownload concluído!');
    })
    .catch(error => {
      console.error('Erro:', error.message);
      process.exit(1);
    });
}

module.exports = {
  downloadImages
};