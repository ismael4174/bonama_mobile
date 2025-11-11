import RNHTMLtoPDF from 'react-native-html-to-pdf';
import RNFS from 'react-native-fs';
import Share from 'react-native-share';

const generateReceipt = async data => {
  // Créer le contenu HTML du reçu
  const htmlContent = `
    <html>
      <body>
        <h1>Reçu de Remise de Manuels</h1>
        <p>Nom de l'élève: ${data.studentName}</p>
        <p>Date: ${new Date().toLocaleDateString()}</p>
        <ul>
          ${data.manuals.map(manual => `<li>${manual}</li>`).join('')}
        </ul>
      </body>
    </html>
  `;

  // Options de génération du PDF
  let options = {
    html: htmlContent,
    fileName: 'receipt',
    directory: RNFS.DocumentDirectoryPath,
  };

  // Générer le PDF
  let file = await RNHTMLtoPDF.convert(options);

  // Partager le PDF
  Share.open({
    url: 'file://' + file.filePath,
    type: 'application/pdf',
  }).catch(err => {
    err && console.log(err);
  });
};
